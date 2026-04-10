#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


DEFAULT_SNAPSHOT_PATH = Path(".claude/tmp/hermes-monitor/latest.json")
DEFAULT_MAX_AGE_MINUTES = 15


@dataclass(frozen=True)
class SnapshotLoadResult:
    snapshot: dict[str, Any]
    source: str
    snapshot_path: Path
    age_minutes: float | None


def load_monitor_module() -> Any:
    script_path = Path(__file__).with_name("hermes_monitor.py")
    spec = importlib.util.spec_from_file_location("hermes_monitor", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load monitor module from {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_snapshot(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def snapshot_age_minutes(snapshot: dict[str, Any]) -> float | None:
    generated_at = parse_iso_datetime(snapshot.get("generatedAt"))
    if generated_at is None:
        return None
    now = datetime.now(timezone.utc)
    age = now - generated_at.astimezone(timezone.utc)
    return max(age.total_seconds(), 0.0) / 60.0


def collect_live_snapshot(
    monitor_module: Any,
    *,
    api_base: str,
    company_id: str,
    warning_minutes: int,
    latency_warn_ms: int,
) -> dict[str, Any]:
    token = monitor_module.read_auth_token()
    return monitor_module.collect_snapshot(
        api_base,
        company_id,
        token,
        warning_minutes,
        latency_warn_ms,
    )


def resolve_snapshot(
    monitor_module: Any,
    *,
    snapshot_path: Path,
    max_age_minutes: int,
    refresh: bool,
    write_snapshot: bool,
    api_base: str,
    company_id: str,
    warning_minutes: int,
    latency_warn_ms: int,
) -> SnapshotLoadResult:
    snapshot = load_snapshot(snapshot_path)
    age_minutes = snapshot_age_minutes(snapshot) if snapshot else None
    is_fresh = snapshot is not None and age_minutes is not None and age_minutes <= max_age_minutes

    if refresh or not is_fresh:
        snapshot = collect_live_snapshot(
            monitor_module,
            api_base=api_base,
            company_id=company_id,
            warning_minutes=warning_minutes,
            latency_warn_ms=latency_warn_ms,
        )
        age_minutes = snapshot_age_minutes(snapshot)
        if write_snapshot:
            snapshot_path.parent.mkdir(parents=True, exist_ok=True)
            snapshot_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
        source = "live"
    else:
        source = "cache"

    return SnapshotLoadResult(
        snapshot=snapshot,
        source=source,
        snapshot_path=snapshot_path,
        age_minutes=age_minutes,
    )


def summarize_counts(snapshot: dict[str, Any], warning_minutes: int) -> dict[str, int]:
    gateways = snapshot.get("gateways", [])
    agents = snapshot.get("agents", [])
    stale_agents = 0
    running_agents = 0
    for agent in agents:
        if agent.get("status") == "running":
            running_agents += 1
        heartbeat_at = parse_iso_datetime(agent.get("lastHeartbeatAt"))
        if heartbeat_at is None:
            stale_agents += 1
            continue
        if datetime.now(timezone.utc) - heartbeat_at.astimezone(timezone.utc) > timedelta(minutes=warning_minutes):
            stale_agents += 1
    total_open_issues = sum(int(agent.get("issueStats", {}).get("open", 0)) for agent in agents)
    return {
        "running_gateways": sum(1 for gateway in gateways if gateway.get("state") == "running"),
        "total_gateways": len(gateways),
        "running_agents": running_agents,
        "total_agents": len(agents),
        "stale_agents": stale_agents,
        "open_issues": total_open_issues,
        "alerts": len(snapshot.get("alerts", [])),
    }


def truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    if limit <= 1:
        return value[:limit]
    return value[: limit - 1] + "…"


def build_agent_lines(snapshot: dict[str, Any]) -> list[str]:
    agents = sorted(snapshot.get("agents", []), key=lambda item: item.get("profile") or "")
    lines = ["agents:"]
    if not agents:
        return lines + ["- none"]
    for agent in agents:
        stats = agent.get("issueStats", {})
        lines.append(
            "- {profile:<12} {name:<16} status={status:<7} heartbeat={heartbeat:<8} open={open_issues:<2} done={done:<2} cancelled={cancelled:<2}".format(
                profile=truncate(str(agent.get("profile") or "-"), 12),
                name=truncate(str(agent.get("name") or "-"), 16),
                status=truncate(str(agent.get("status") or "unknown"), 7),
                heartbeat=truncate(str(agent.get("heartbeatAge") or "unknown"), 8),
                open_issues=int(stats.get("open", 0)),
                done=int(stats.get("done", 0)),
                cancelled=int(stats.get("cancelled", 0)),
            )
        )
    return lines


def build_profile_lines(snapshot: dict[str, Any]) -> list[str]:
    gateways_by_profile = {item.get("profile"): item for item in snapshot.get("gateways", [])}
    slack_by_profile = {item.get("profile"): item for item in snapshot.get("slack", [])}
    cron_by_profile = {item.get("profile"): item for item in snapshot.get("cron", {}).get("profiles", [])}
    agent_by_profile = {item.get("profile"): item for item in snapshot.get("agents", [])}

    profiles = sorted(
        {
            *gateways_by_profile.keys(),
            *slack_by_profile.keys(),
            *cron_by_profile.keys(),
            *agent_by_profile.keys(),
        }
    )

    lines = ["profiles:"]
    if not profiles:
        return lines + ["- none"]

    for profile in profiles:
        gateway = gateways_by_profile.get(profile, {})
        slack = slack_by_profile.get(profile, {})
        cron = cron_by_profile.get(profile, {})
        agent = agent_by_profile.get(profile, {})
        stats = agent.get("issueStats", {})
        lines.append(
            "- {profile:<12} gateway={gateway:<7} slack={slack:<7} cron={runs}/{success}/{failure} issues={open_issues}open/{done}done".format(
                profile=truncate(str(profile or "-"), 12),
                gateway=truncate(str(gateway.get("state") or "unknown"), 7),
                slack=truncate(str(slack.get("status") or "unknown"), 7),
                runs=int(cron.get("counts", {}).get("runs", 0)),
                success=int(cron.get("counts", {}).get("success", 0)),
                failure=int(cron.get("counts", {}).get("failure", 0)),
                open_issues=int(stats.get("open", 0)),
                done=int(stats.get("done", 0)),
            )
        )
    return lines


def format_status_text(result: SnapshotLoadResult, warning_minutes: int) -> str:
    snapshot = result.snapshot
    counts = summarize_counts(snapshot, warning_minutes)
    paperclip = snapshot.get("paperclipHealth", {})
    generated_at = snapshot.get("generatedAt", "unknown")
    age_text = "unknown" if result.age_minutes is None else f"{result.age_minutes:.1f}m"

    lines = [
        f"generatedAt: {generated_at}",
        f"source: {result.source} snapshot={result.snapshot_path} age={age_text}",
        "paperclip: {status} latency={latency}ms".format(
            status=paperclip.get("status", "unknown"),
            latency=paperclip.get("latencyMs", "-"),
        ),
        "summary: gateways={running_gateways}/{total_gateways} agents={running_agents}/{total_agents} stale_agents={stale_agents} open_issues={open_issues} alerts={alerts}".format(
            **counts,
        ),
        "",
    ]
    lines.extend(build_agent_lines(snapshot))
    lines.append("")
    lines.extend(build_profile_lines(snapshot))
    lines.append("")
    alerts = snapshot.get("alerts", [])
    if alerts:
        lines.append("alerts:")
        lines.extend(f"- {alert}" for alert in alerts)
    else:
        lines.extend(["alerts:", "- none"])
    return "\n".join(lines)


def build_parser(monitor_module: Any) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read Hermes monitor snapshot and print an operator-friendly status view"
    )
    parser.add_argument("--json", action="store_true", help="Print the resolved snapshot as JSON")
    parser.add_argument(
        "--snapshot-path",
        default=str(DEFAULT_SNAPSHOT_PATH),
        help="Path to the monitor snapshot cache",
    )
    parser.add_argument(
        "--max-age-minutes",
        type=int,
        default=DEFAULT_MAX_AGE_MINUTES,
        help="Refresh when cached snapshot is older than this threshold",
    )
    parser.add_argument("--refresh", action="store_true", help="Ignore cache and collect a live snapshot")
    parser.add_argument(
        "--no-write-snapshot",
        action="store_true",
        help="Do not overwrite the snapshot file after a live refresh",
    )
    parser.add_argument("--api-base", default=monitor_module.DEFAULT_API_BASE)
    parser.add_argument("--company-id", default=monitor_module.DEFAULT_COMPANY_ID)
    parser.add_argument(
        "--warning-minutes",
        type=int,
        default=monitor_module.DEFAULT_AGENT_WARNING_MINUTES,
    )
    parser.add_argument(
        "--latency-warn-ms",
        type=int,
        default=monitor_module.DEFAULT_LATENCY_WARN_MS,
    )
    return parser


def main() -> int:
    monitor_module = load_monitor_module()
    parser = build_parser(monitor_module)
    args = parser.parse_args()

    result = resolve_snapshot(
        monitor_module,
        snapshot_path=Path(args.snapshot_path).expanduser(),
        max_age_minutes=args.max_age_minutes,
        refresh=args.refresh,
        write_snapshot=not args.no_write_snapshot,
        api_base=args.api_base,
        company_id=args.company_id,
        warning_minutes=args.warning_minutes,
        latency_warn_ms=args.latency_warn_ms,
    )

    if args.json:
        print(json.dumps(result.snapshot, indent=2, ensure_ascii=False))
    else:
        print(format_status_text(result, args.warning_minutes))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
