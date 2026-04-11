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


def snapshot_issue_kpi_window_days(snapshot: dict[str, Any] | None) -> int | None:
    if snapshot is None:
        return None
    raw_value = snapshot.get("issueKpiWindowDays")
    if raw_value is None:
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


def merge_snapshot_metadata(live_snapshot: dict[str, Any], cached_snapshot: dict[str, Any] | None) -> dict[str, Any]:
    if cached_snapshot is None:
        return live_snapshot
    if "notification" not in live_snapshot and "notification" in cached_snapshot:
        live_snapshot["notification"] = cached_snapshot["notification"]
    return live_snapshot


def collect_live_snapshot(
    monitor_module: Any,
    *,
    api_base: str,
    company_id: str,
    warning_minutes: int,
    latency_warn_ms: int,
    recent_window_days: int,
) -> dict[str, Any]:
    token = monitor_module.read_auth_token()
    return monitor_module.collect_snapshot(
        api_base,
        company_id,
        token,
        warning_minutes,
        latency_warn_ms,
        recent_window_days,
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
    recent_window_days: int,
) -> SnapshotLoadResult:
    cached_snapshot = load_snapshot(snapshot_path)
    age_minutes = snapshot_age_minutes(cached_snapshot) if cached_snapshot else None
    is_fresh = cached_snapshot is not None and age_minutes is not None and age_minutes <= max_age_minutes
    cached_window_days = snapshot_issue_kpi_window_days(cached_snapshot)
    window_matches = cached_window_days == recent_window_days

    snapshot: dict[str, Any] | None
    if refresh or not is_fresh or not window_matches:
        snapshot = collect_live_snapshot(
            monitor_module,
            api_base=api_base,
            company_id=company_id,
            warning_minutes=warning_minutes,
            latency_warn_ms=latency_warn_ms,
            recent_window_days=recent_window_days,
        )
        snapshot = merge_snapshot_metadata(snapshot, cached_snapshot)
        age_minutes = snapshot_age_minutes(snapshot)
        if write_snapshot:
            snapshot_path.parent.mkdir(parents=True, exist_ok=True)
            snapshot_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
        source = "live"
    else:
        snapshot = cached_snapshot
        source = "cache"

    if snapshot is None:
        raise RuntimeError("Failed to resolve Hermes monitor snapshot")

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
    fresh_agents = 0
    monitored_agents = 0
    for agent in agents:
        open_issues = int(agent.get("issueStats", {}).get("open", 0))
        should_count = str(agent.get("status") or "") == "running" or open_issues > 0
        if not should_count:
            continue
        monitored_agents += 1
        heartbeat_at = parse_iso_datetime(agent.get("lastHeartbeatAt"))
        if heartbeat_at is None:
            stale_agents += 1
            continue
        if datetime.now(timezone.utc) - heartbeat_at.astimezone(timezone.utc) > timedelta(minutes=warning_minutes):
            stale_agents += 1
        else:
            fresh_agents += 1
    issue_totals = snapshot.get("issueTotals")
    recent_issue_totals = snapshot.get("recentIssueTotals")
    if issue_totals is None:
        unattributed_stats = snapshot.get("unattributedIssueStats", {})
        total_open_issues = sum(int(agent.get("issueStats", {}).get("open", 0)) for agent in agents) + int(
            unattributed_stats.get("open", 0)
        )
    else:
        total_open_issues = int(issue_totals.get("open", 0))
    if recent_issue_totals is None:
        unattributed_recent = snapshot.get("unattributedRecentIssueStats", {})
        resolved_recent = sum(int(agent.get("recentIssueStats", {}).get("resolved", 0)) for agent in agents) + int(
            unattributed_recent.get("resolved", 0)
        )
        failed_recent = sum(int(agent.get("recentIssueStats", {}).get("failed", 0)) for agent in agents) + int(
            unattributed_recent.get("failed", 0)
        )
    else:
        resolved_recent = int(recent_issue_totals.get("resolved", 0))
        failed_recent = int(recent_issue_totals.get("failed", 0))
    return {
        "running_gateways": sum(1 for gateway in gateways if gateway.get("state") == "running"),
        "total_gateways": len(gateways),
        "fresh_agents": fresh_agents,
        "stale_agents": stale_agents,
        "total_agents": monitored_agents,
        "open_issues": total_open_issues,
        "recent_resolved": resolved_recent,
        "recent_failed": failed_recent,
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
        lines.append("- none")
    else:
        for agent in agents:
            stats = agent.get("issueStats", {})
            recent = agent.get("recentIssueStats", {})
            lines.append(
                "- {profile:<12} {name:<16} status={status:<7} heartbeat={heartbeat:<8} open={open_issues:<2} blocked={blocked:<2} recent={resolved:<2} done={done:<2} failed={failed:<2} ratio={ratio}".format(
                    profile=truncate(str(agent.get("profile") or "-"), 12),
                    name=truncate(str(agent.get("name") or "-"), 16),
                    status=truncate(str(agent.get("status") or "unknown"), 7),
                    heartbeat=truncate(str(agent.get("heartbeatAge") or "unknown"), 8),
                    open_issues=int(stats.get("open", 0)),
                    blocked=int(stats.get("blocked", 0)),
                    resolved=int(recent.get("resolved", 0)),
                    done=int(recent.get("done", 0)),
                    failed=int(recent.get("failed", 0)),
                    ratio=f"{float(recent.get('doneRatio', 0.0)):.2f}/{float(recent.get('failedRatio', 0.0)):.2f}",
                )
            )
    unattributed_stats = snapshot.get("unattributedIssueStats", {})
    unattributed_recent = snapshot.get("unattributedRecentIssueStats", {})
    if int(unattributed_stats.get("total", 0)) > 0 or int(unattributed_recent.get("resolved", 0)) > 0:
        lines.append(
            "- {profile:<12} {name:<16} status={status:<7} heartbeat={heartbeat:<8} open={open_issues:<2} blocked={blocked:<2} recent={resolved:<2} done={done:<2} failed={failed:<2} ratio={ratio}".format(
                profile=truncate("unattributed", 12),
                name=truncate("paperclip", 16),
                status=truncate("n/a", 7),
                heartbeat=truncate("-", 8),
                open_issues=int(unattributed_stats.get("open", 0)),
                blocked=int(unattributed_stats.get("blocked", 0)),
                resolved=int(unattributed_recent.get("resolved", 0)),
                done=int(unattributed_recent.get("done", 0)),
                failed=int(unattributed_recent.get("failed", 0)),
                ratio=f"{float(unattributed_recent.get('doneRatio', 0.0)):.2f}/{float(unattributed_recent.get('failedRatio', 0.0)):.2f}",
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
        recent = agent.get("recentIssueStats", {})
        lines.append(
            "- {profile:<12} gateway={gateway:<7} slack={slack:<7} cron={runs}/{success}/{failure} issues={open_issues}open/{blocked}blocked recent={done}/{failed}/{resolved}".format(
                profile=truncate(str(profile or "-"), 12),
                gateway=truncate(str(gateway.get("state") or "unknown"), 7),
                slack=truncate(str(slack.get("status") or "unknown"), 7),
                runs=int(cron.get("counts", {}).get("runs", 0)),
                success=int(cron.get("counts", {}).get("success", 0)),
                failure=int(cron.get("counts", {}).get("failure", 0)),
                open_issues=int(stats.get("open", 0)),
                blocked=int(stats.get("blocked", 0)),
                done=int(recent.get("done", 0)),
                failed=int(recent.get("failed", 0)),
                resolved=int(recent.get("resolved", 0)),
            )
        )
    unattributed_stats = snapshot.get("unattributedIssueStats", {})
    unattributed_recent = snapshot.get("unattributedRecentIssueStats", {})
    if int(unattributed_stats.get("total", 0)) > 0 or int(unattributed_recent.get("resolved", 0)) > 0:
        lines.append(
            "- {profile:<12} gateway={gateway:<7} slack={slack:<7} cron={runs}/{success}/{failure} issues={open_issues}open/{blocked}blocked recent={done}/{failed}/{resolved}".format(
                profile=truncate("unattributed", 12),
                gateway=truncate("n/a", 7),
                slack=truncate("n/a", 7),
                runs=0,
                success=0,
                failure=0,
                open_issues=int(unattributed_stats.get("open", 0)),
                blocked=int(unattributed_stats.get("blocked", 0)),
                done=int(unattributed_recent.get("done", 0)),
                failed=int(unattributed_recent.get("failed", 0)),
                resolved=int(unattributed_recent.get("resolved", 0)),
            )
        )
    return lines


def build_notification_lines(snapshot: dict[str, Any]) -> list[str]:
    notification = snapshot.get("notification")
    lines = ["notification:"]
    if not notification:
        return lines + ["- none"]
    return lines + [f"- sent={notification.get('sent')} message={notification.get('message')}"]


def match_project(project: dict[str, Any], selector: str) -> bool:
    normalized = selector.strip().lower()
    candidates = [
        str(project.get("id") or "").lower(),
        str(project.get("name") or "").lower(),
        str(project.get("urlKey") or "").lower(),
    ]
    return normalized in candidates


def build_empty_issue_stats() -> dict[str, int]:
    return {"done": 0, "cancelled": 0, "blocked": 0, "open": 0, "total": 0}


def build_empty_recent_issue_stats(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "windowDays": int(snapshot.get("issueKpiWindowDays", 0)),
        "windowStart": "",
        "resolved": 0,
        "done": 0,
        "failed": 0,
        "doneRatio": 0.0,
        "failedRatio": 0.0,
        "failedStatuses": list(snapshot.get("failedIssueStatuses", [])),
    }


def sum_project_issue_stats(projects: list[dict[str, Any]]) -> dict[str, int]:
    totals = build_empty_issue_stats()
    for project in projects:
        for key in totals:
            totals[key] += int(project.get("issueStats", {}).get(key, 0))
    return totals


def sum_project_recent_issue_stats(snapshot: dict[str, Any], projects: list[dict[str, Any]]) -> dict[str, Any]:
    totals = build_empty_recent_issue_stats(snapshot)
    for project in projects:
        recent_stats = project.get("recentIssueStats", {})
        for key in ("resolved", "done", "failed"):
            totals[key] += int(recent_stats.get(key, 0))
    resolved = int(totals["resolved"])
    if resolved > 0:
        totals["doneRatio"] = round(int(totals["done"]) / resolved, 3)
        totals["failedRatio"] = round(int(totals["failed"]) / resolved, 3)
    return totals


def filter_snapshot_projects(snapshot: dict[str, Any], selector: str | None) -> dict[str, Any]:
    if not selector:
        return snapshot
    filtered_snapshot = dict(snapshot)
    projects = list(snapshot.get("projects", []))
    selected_projects = [project for project in projects if match_project(project, selector)]
    unassigned_summary = snapshot.get("unassignedProjectSummary", {})
    if selector.strip().lower() == "unassigned":
        filtered_snapshot["projects"] = []
        filtered_snapshot["unassignedProjectSummary"] = unassigned_summary
        filtered_snapshot["issueTotals"] = dict(unassigned_summary.get("issueStats", build_empty_issue_stats()))
        filtered_snapshot["recentIssueTotals"] = dict(unassigned_summary.get("recentIssueStats", build_empty_recent_issue_stats(snapshot)))
        return filtered_snapshot
    if not selected_projects:
        raise ValueError(f"Unknown project selector: {selector}")
    filtered_snapshot["projects"] = selected_projects
    filtered_snapshot["unassignedProjectSummary"] = {
        "id": None,
        "name": "unassigned",
        "urlKey": None,
        "status": "n/a",
        "issueStats": build_empty_issue_stats(),
        "recentIssueStats": build_empty_recent_issue_stats(snapshot),
    }
    filtered_snapshot["issueTotals"] = sum_project_issue_stats(selected_projects)
    filtered_snapshot["recentIssueTotals"] = sum_project_recent_issue_stats(snapshot, selected_projects)
    return filtered_snapshot


def build_project_lines(snapshot: dict[str, Any]) -> list[str]:
    projects = list(snapshot.get("projects", []))
    lines = ["projects:"]
    if not projects:
        unassigned = snapshot.get("unassignedProjectSummary", {})
        unassigned_stats = unassigned.get("issueStats", {})
        unassigned_recent = unassigned.get("recentIssueStats", {})
        if int(unassigned_stats.get("total", 0)) == 0 and int(unassigned_recent.get("resolved", 0)) == 0:
            return lines + ["- none"]
    for project in projects:
        issue_stats = project.get("issueStats", {})
        recent = project.get("recentIssueStats", {})
        lines.append(
            "- {name:<18} key={url_key:<12} status={status:<8} open={open_issues:<2} blocked={blocked:<2} done={done:<2} total={total:<2} recent={recent_done}/{recent_failed}/{recent_resolved}".format(
                name=truncate(str(project.get("name") or "unknown"), 18),
                url_key=truncate(str(project.get("urlKey") or project.get("id") or "-"), 12),
                status=truncate(str(project.get("status") or "unknown"), 8),
                open_issues=int(issue_stats.get("open", 0)),
                blocked=int(issue_stats.get("blocked", 0)),
                done=int(issue_stats.get("done", 0)),
                total=int(issue_stats.get("total", 0)),
                recent_done=int(recent.get("done", 0)),
                recent_failed=int(recent.get("failed", 0)),
                recent_resolved=int(recent.get("resolved", 0)),
            )
        )
    unassigned = snapshot.get("unassignedProjectSummary", {})
    unassigned_stats = unassigned.get("issueStats", {})
    unassigned_recent = unassigned.get("recentIssueStats", {})
    if int(unassigned_stats.get("total", 0)) > 0 or int(unassigned_recent.get("resolved", 0)) > 0:
        lines.append(
            "- {name:<18} key={url_key:<12} status={status:<8} open={open_issues:<2} blocked={blocked:<2} done={done:<2} total={total:<2} recent={recent_done}/{recent_failed}/{recent_resolved}".format(
                name=truncate(str(unassigned.get("name") or "unassigned"), 18),
                url_key=truncate("unassigned", 12),
                status=truncate(str(unassigned.get("status") or "n/a"), 8),
                open_issues=int(unassigned_stats.get("open", 0)),
                blocked=int(unassigned_stats.get("blocked", 0)),
                done=int(unassigned_stats.get("done", 0)),
                total=int(unassigned_stats.get("total", 0)),
                recent_done=int(unassigned_recent.get("done", 0)),
                recent_failed=int(unassigned_recent.get("failed", 0)),
                recent_resolved=int(unassigned_recent.get("resolved", 0)),
            )
        )
    return lines


def format_status_text(result: SnapshotLoadResult, warning_minutes: int, project: str | None = None) -> str:
    filtered_snapshot = filter_snapshot_projects(result.snapshot, project)
    counts = summarize_counts(filtered_snapshot, warning_minutes)
    paperclip = result.snapshot.get("paperclipHealth", {})
    generated_at = result.snapshot.get("generatedAt", "unknown")
    age_text = "unknown" if result.age_minutes is None else f"{result.age_minutes:.1f}m"
    kpi_window_days = int(filtered_snapshot.get("issueKpiWindowDays", 0))
    failed_statuses = ",".join(filtered_snapshot.get("failedIssueStatuses", [])) or "-"

    lines = [
        f"generatedAt: {generated_at}",
        f"source: {result.source} snapshot={result.snapshot_path} age={age_text}",
        "paperclip: {status} latency={latency}ms".format(
            status=paperclip.get("status", "unknown"),
            latency=paperclip.get("latencyMs", "-"),
        ),
        "summary: gateways={running_gateways}/{total_gateways} fresh_agents={fresh_agents}/{total_agents} stale_agents={stale_agents} open_issues={open_issues} recent_resolved={recent_resolved} recent_failed={recent_failed} alerts={alerts}".format(
            **counts,
        ),
        f"recent_issue_window: {kpi_window_days}d failed_statuses={failed_statuses}",
        f"project_filter: {project or 'all'}",
        "",
    ]
    lines.extend(build_project_lines(filtered_snapshot))
    lines.append("")
    lines.extend(build_agent_lines(result.snapshot))
    lines.append("")
    lines.extend(build_profile_lines(result.snapshot))
    lines.append("")
    lines.extend(build_notification_lines(result.snapshot))
    lines.append("")
    alerts = result.snapshot.get("alerts", [])
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
    parser.add_argument(
        "--recent-window-days",
        type=int,
        default=monitor_module.DEFAULT_RECENT_WINDOW_DAYS,
    )
    parser.add_argument(
        "--project",
        help="Filter the project summary section by project id, name, urlKey, or 'unassigned'",
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
        recent_window_days=args.recent_window_days,
    )

    filtered_snapshot = filter_snapshot_projects(result.snapshot, args.project)

    if args.json:
        print(json.dumps(filtered_snapshot, indent=2, ensure_ascii=False))
    else:
        print(format_status_text(result, args.warning_minutes, args.project))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
