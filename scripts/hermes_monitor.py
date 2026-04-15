#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DEFAULT_API_BASE = "http://localhost:3100/api"
DEFAULT_COMPANY_ID = "abac28ea-9edd-4ddb-b40a-0baf52505357"
DEFAULT_AGENT_WARNING_MINUTES = 30
DEFAULT_LATENCY_WARN_MS = 1500
DEFAULT_RECENT_WINDOW_DAYS = 7
DEFAULT_COMMAND_TIMEOUT_SECONDS = 10
FAILED_ISSUE_STATUSES = frozenset({"cancelled"})
UNATTRIBUTED_ISSUE_BUCKET = "__unattributed__"
UNASSIGNED_PROJECT_BUCKET = "__unassigned_project__"


def run(
    cmd: str,
    *,
    timeout: int = DEFAULT_COMMAND_TIMEOUT_SECONDS,
    errors: list[str] | None = None,
    label: str | None = None,
) -> str:
    command_name = label or cmd
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        if errors is not None:
            errors.append(f"command timeout:{command_name} after {timeout}s")
        return ""
    if result.returncode != 0:
        if errors is not None:
            raw_detail = (result.stderr or result.stdout or "unknown error").strip()
            detail = raw_detail.splitlines()[0] if raw_detail else "unknown error"
            errors.append(f"command failed:{command_name} rc={result.returncode} detail={detail}")
        return ""
    return result.stdout.strip()


def iso_to_epoch(value: str | None) -> float | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def human_age(ts: float | None) -> str:
    if ts is None:
        return "unknown"
    diff = max(0, int(time.time() - ts))
    if diff < 60:
        return f"{diff}s"
    if diff < 3600:
        return f"{diff // 60}m"
    if diff < 86400:
        return f"{diff // 3600}h"
    return f"{diff // 86400}d"


def read_auth_token() -> str | None:
    path = os.path.expanduser("~/.paperclip/auth.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        data = json.load(f)
    creds = data.get("credentials", {})
    for base in ("http://localhost:3100", "https://paperclip.dororong.dev"):
        if base in creds and creds[base].get("token"):
            return str(creds[base]["token"])
    for info in creds.values():
        if info.get("token"):
            return str(info["token"])
    return None


def http_json(
    url: str,
    token: str | None = None,
    timeout: int = 5,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
) -> tuple[Any, float]:
    headers: dict[str, str] = {}
    body: bytes | None = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode()
    req = urllib.request.Request(url, headers=headers, method=method, data=body)
    started = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw_body = resp.read().decode()
    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    return json.loads(raw_body), latency_ms


def parse_profiles(errors: list[str] | None = None) -> list[dict[str, str | None]]:
    text = run("hermes profile list", errors=errors, label="hermes profile list")
    profiles: list[dict[str, str | None]] = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("Profile") or stripped.startswith("─") or stripped.startswith("---"):
            continue
        normalized = re.sub(r"^\s*◆?\s*", "", raw).rstrip()
        columns = [part.strip() for part in re.split(r"\s{2,}", normalized) if part.strip()]
        if len(columns) < 3:
            continue
        if len(columns) >= 4:
            name = columns[0]
            gateway_cli = columns[-2]
            alias_value = columns[-1]
        else:
            name, gateway_cli, alias_value = columns
        alias = alias_value if alias_value != "—" else None
        profiles.append({"name": name, "gateway_cli": gateway_cli, "alias": alias})
    return [profile for profile in profiles if profile["name"] != "default"]


def parse_launchctl(errors: list[str] | None = None) -> dict[str, dict[str, str | None]]:
    text = run("launchctl list", errors=errors, label="launchctl list")
    services: dict[str, dict[str, str | None]] = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 3 and parts[2].startswith("ai.hermes.gateway-"):
            label = parts[2]
            pid = None if parts[0] == "-" else parts[0]
            services[label] = {"pid": pid, "last_exit_status": parts[1]}
    return services


def tail_lines(path: str, limit: int = 200) -> list[str]:
    try:
        with open(path, errors="ignore") as f:
            lines = f.readlines()
        return lines[-limit:]
    except OSError:
        return []


def latest_slack_status(profile: str) -> dict[str, str | None]:
    base = os.path.expanduser(f"~/.hermes/profiles/{profile}/logs")
    latest_ok: dict[str, str | None] | None = None
    latest_error: dict[str, str | None] | None = None
    ts_re = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")
    paths = sorted(glob.glob(os.path.join(base, "gateway.log*")), key=os.path.getmtime, reverse=True)[:4]
    for path in paths:
        for line in tail_lines(path, 400):
            lower = line.lower()
            if "slack" not in lower:
                continue
            match = ts_re.search(line)
            timestamp = match.group(1) if match else ""
            entry = {"line": line.strip(), "path": path, "timestamp": timestamp}
            if any(token in lower for token in ["✓ slack connected", "socket mode connected", "bolt app is running", "a new session"]):
                if latest_ok is None or timestamp >= str(latest_ok["timestamp"] or ""):
                    latest_ok = entry
            elif any(token in lower for token in ["failed", "error", "conflict", "already in use"]):
                if latest_error is None or timestamp >= str(latest_error["timestamp"] or ""):
                    latest_error = entry
    if latest_ok and (latest_error is None or str(latest_ok["timestamp"] or "") >= str(latest_error["timestamp"] or "")):
        return {"status": "ok", **latest_ok}
    if latest_error:
        return {"status": "error", **latest_error}
    return {"status": "unknown", "line": "no slack log found", "path": None, "timestamp": None}


def cron_history(profile: str) -> dict[str, Any]:
    counts = {"runs": 0, "success": 0, "failure": 0}
    recent: list[dict[str, str | None]] = []
    base = os.path.expanduser(f"~/.hermes/profiles/{profile}/logs")
    files = sorted(glob.glob(os.path.join(base, "agent.log*")), key=os.path.getmtime, reverse=True)[:6]
    ts_re = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")
    for path in files:
        for line in tail_lines(path, 500):
            if "cron.scheduler:" not in line:
                continue
            lower = line.lower()
            event: str | None = None
            if "running job" in lower:
                counts["runs"] += 1
                event = "run"
            elif "completed" in lower or "finished" in lower or "succeeded" in lower:
                counts["success"] += 1
                event = "success"
            elif "fail" in lower or "error" in lower or "exception" in lower:
                counts["failure"] += 1
                event = "failure"
            if event:
                match = ts_re.search(line)
                recent.append(
                    {
                        "event": event,
                        "timestamp": match.group(1) if match else None,
                        "message": line.strip(),
                    }
                )
    recent = sorted(recent, key=lambda item: str(item.get("timestamp") or ""), reverse=True)[:10]
    return {"counts": counts, "recent": recent}


def map_agent_profile(agent_name: str) -> str:
    if agent_name == "orchestrator":
        return "orchestrator"
    if agent_name.startswith("team-"):
        return agent_name.split("team-", 1)[1]
    return agent_name


def build_empty_issue_stats() -> dict[str, int]:
    return {"done": 0, "cancelled": 0, "blocked": 0, "open": 0, "total": 0}


def build_empty_recent_issue_stats(window_days: int, window_start: datetime) -> dict[str, Any]:
    return {
        "windowDays": window_days,
        "windowStart": window_start.isoformat(),
        "resolved": 0,
        "done": 0,
        "failed": 0,
        "doneRatio": 0.0,
        "failedRatio": 0.0,
        "failedStatuses": sorted(FAILED_ISSUE_STATUSES),
    }


def build_project_summary(project: dict[str, Any], window_days: int, window_start: datetime) -> dict[str, Any]:
    return {
        "id": project.get("id"),
        "name": project.get("name") or "unknown",
        "urlKey": project.get("urlKey"),
        "status": project.get("status") or "unknown",
        "issueStats": build_empty_issue_stats(),
        "recentIssueStats": build_empty_recent_issue_stats(window_days, window_start),
    }


def project_bucket_key(issue: dict[str, Any]) -> str:
    project_id = issue.get("projectId")
    if project_id:
        return str(project_id)
    return UNASSIGNED_PROJECT_BUCKET


def issue_bucket_key(issue: dict[str, Any]) -> str:
    agent_id = issue.get("assigneeAgentId")
    if agent_id:
        return str(agent_id)
    return UNATTRIBUTED_ISSUE_BUCKET


def should_ignore_issue(issue: dict[str, Any]) -> bool:
    title = str(issue.get("title") or "")
    return title.lower().startswith("[ignore]")


def issue_activity_at(issue: dict[str, Any]) -> datetime | None:
    status = str(issue.get("status") or "")
    for key in (
        "completedAt" if status == "done" else None,
        "cancelledAt" if status == "cancelled" else None,
        "updatedAt",
        "createdAt",
    ):
        if key is None:
            continue
        parsed = parse_iso_datetime(issue.get(key))
        if parsed is not None:
            return parsed.astimezone(timezone.utc)
    return None


def build_recent_issue_stats(issues: list[dict[str, Any]], window_days: int) -> dict[str, dict[str, Any]]:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=window_days)
    by_agent: dict[str, dict[str, Any]] = defaultdict(
        lambda: build_empty_recent_issue_stats(window_days, window_start)
    )
    for issue in issues:
        if should_ignore_issue(issue):
            continue
        status = str(issue.get("status") or "")
        if status != "done" and status not in FAILED_ISSUE_STATUSES:
            continue
        activity_at = issue_activity_at(issue)
        if activity_at is None or activity_at < window_start:
            continue
        bucket = by_agent[issue_bucket_key(issue)]
        bucket["resolved"] += 1
        if status == "done":
            bucket["done"] += 1
        else:
            bucket["failed"] += 1
    for bucket in by_agent.values():
        resolved = int(bucket["resolved"])
        if resolved > 0:
            bucket["doneRatio"] = round(int(bucket["done"]) / resolved, 3)
            bucket["failedRatio"] = round(int(bucket["failed"]) / resolved, 3)
    return dict(by_agent)


def build_project_summaries(
    projects: list[dict[str, Any]],
    issues: list[dict[str, Any]],
    recent_window_days: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=recent_window_days)
    summaries_by_id: dict[str, dict[str, Any]] = {
        str(project["id"]): build_project_summary(project, recent_window_days, window_start)
        for project in projects
        if project.get("id")
    }
    unassigned_summary = build_project_summary(
        {"id": None, "name": "unassigned", "urlKey": None, "status": "n/a"},
        recent_window_days,
        window_start,
    )

    for issue in issues:
        if should_ignore_issue(issue):
            continue
        bucket_key = project_bucket_key(issue)
        if bucket_key == UNASSIGNED_PROJECT_BUCKET:
            summary = unassigned_summary
        else:
            summary = summaries_by_id.setdefault(
                bucket_key,
                build_project_summary(
                    {
                        "id": bucket_key,
                        "name": f"unknown:{bucket_key}",
                        "urlKey": None,
                        "status": "unknown",
                    },
                    recent_window_days,
                    window_start,
                ),
            )
        issue_stats = summary["issueStats"]
        issue_stats["total"] += 1
        status = str(issue.get("status") or "")
        if status == "done":
            issue_stats["done"] += 1
        elif status == "cancelled":
            issue_stats["cancelled"] += 1
        elif status == "blocked":
            issue_stats["blocked"] += 1
            issue_stats["open"] += 1
        else:
            issue_stats["open"] += 1

        recent_stats = summary["recentIssueStats"]
        activity_at = issue_activity_at(issue)
        if activity_at is None or activity_at < window_start:
            continue
        if status == "done":
            recent_stats["resolved"] += 1
            recent_stats["done"] += 1
        elif status in FAILED_ISSUE_STATUSES:
            recent_stats["resolved"] += 1
            recent_stats["failed"] += 1

    for summary in [*summaries_by_id.values(), unassigned_summary]:
        recent_stats = summary["recentIssueStats"]
        resolved = int(recent_stats["resolved"])
        if resolved > 0:
            recent_stats["doneRatio"] = round(int(recent_stats["done"]) / resolved, 3)
            recent_stats["failedRatio"] = round(int(recent_stats["failed"]) / resolved, 3)

    sorted_projects = sorted(
        summaries_by_id.values(),
        key=lambda item: (str(item.get("name") or "").lower(), str(item.get("id") or "")),
    )
    return sorted_projects, unassigned_summary


def collect_snapshot(
    api_base: str,
    company_id: str,
    token: str | None,
    warning_minutes: int,
    latency_warn_ms: int,
    recent_window_days: int = DEFAULT_RECENT_WINDOW_DAYS,
) -> dict[str, Any]:
    snapshot: dict[str, Any] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apiBase": api_base,
        "companyId": company_id,
        "alerts": [],
        "issueKpiWindowDays": recent_window_days,
        "failedIssueStatuses": sorted(FAILED_ISSUE_STATUSES),
    }

    profiles = parse_profiles(snapshot["alerts"])
    launchctl_alerts_before = len(snapshot["alerts"])
    services = parse_launchctl(snapshot["alerts"])
    launchctl_failed = any(
        alert.startswith(("command failed:launchctl list", "command timeout:launchctl list"))
        for alert in snapshot["alerts"][launchctl_alerts_before:]
    )
    snapshot["gateways"] = []
    for profile_info in profiles:
        label = f"ai.hermes.gateway-{profile_info['name']}"
        svc = services.get(label)
        if launchctl_failed:
            state = "unknown"
        else:
            state = "running" if svc and svc.get("pid") else "missing"
        gateway_item = {
            "profile": profile_info['name'],
            "gatewayCli": profile_info['gateway_cli'],
            "label": label,
            "state": state,
            "pid": svc.get('pid') if svc else None,
            "lastExitStatus": svc.get('last_exit_status') if svc else None,
        }
        if state == "missing":
            snapshot["alerts"].append(f"gateway:{profile_info['name']} missing")
        snapshot["gateways"].append(gateway_item)

    try:
        health, latency_ms = http_json(f"{api_base}/health", timeout=3)
        snapshot["paperclipHealth"] = {"status": health.get("status"), "latencyMs": latency_ms, "raw": health}
        if health.get("status") != "ok" or latency_ms > latency_warn_ms:
            snapshot["alerts"].append(f"paperclip health degraded ({latency_ms}ms)")
    except Exception as exc:
        snapshot["paperclipHealth"] = {"status": "error", "error": str(exc)}
        snapshot["alerts"].append(f"paperclip health check failed: {exc}")

    agents: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    projects: list[dict[str, Any]] = []
    if token:
        try:
            agents_result, _ = http_json(f"{api_base}/companies/{company_id}/agents", token=token)
            agents = list(agents_result)
        except Exception as exc:
            snapshot["alerts"].append(f"paperclip agents fetch failed: {exc}")
        try:
            projects_result, _ = http_json(f"{api_base}/companies/{company_id}/projects", token=token)
            projects = list(projects_result)
        except Exception as exc:
            snapshot["alerts"].append(f"paperclip projects fetch failed: {exc}")
        try:
            issues_result, _ = http_json(f"{api_base}/companies/{company_id}/issues", token=token)
            issues = list(issues_result)
        except Exception as exc:
            snapshot["alerts"].append(f"paperclip issues fetch failed: {exc}")
    else:
        snapshot["alerts"].append("paperclip token missing")

    issue_stats: dict[str, dict[str, int]] = defaultdict(build_empty_issue_stats)
    for issue in issues:
        if should_ignore_issue(issue):
            continue
        bucket = issue_stats[issue_bucket_key(issue)]
        bucket["total"] += 1
        status = str(issue.get("status") or "")
        if status == "done":
            bucket["done"] += 1
        elif status == "cancelled":
            bucket["cancelled"] += 1
        elif status == "blocked":
            bucket["blocked"] += 1
            bucket["open"] += 1
        else:
            bucket["open"] += 1

    recent_issue_stats = build_recent_issue_stats(issues, recent_window_days)
    window_start = datetime.now(timezone.utc) - timedelta(days=recent_window_days)

    snapshot["agents"] = []
    stale_cutoff = warning_minutes * 60
    for agent in agents:
        heartbeat_ts = iso_to_epoch(agent.get("lastHeartbeatAt"))
        profile = map_agent_profile(str(agent.get("name") or ""))
        stats = issue_stats[str(agent["id"])]
        recent_stats = recent_issue_stats.get(
            str(agent["id"]),
            build_empty_recent_issue_stats(recent_window_days, window_start),
        )
        agent_item: dict[str, Any] = {
            "name": agent.get("name"),
            "role": agent.get("role"),
            "status": agent.get("status"),
            "profile": profile,
            "lastHeartbeatAt": agent.get("lastHeartbeatAt"),
            "heartbeatAge": human_age(heartbeat_ts),
            "issueStats": stats,
            "recentIssueStats": recent_stats,
        }
        should_alert_stale = str(agent.get("status") or "") == "running" or int(stats.get("open", 0)) > 0
        if should_alert_stale and (heartbeat_ts is None or time.time() - heartbeat_ts > stale_cutoff):
            snapshot["alerts"].append(f"heartbeat stale:{agent.get('name')} age={agent_item['heartbeatAge']}")
        snapshot["agents"].append(agent_item)

    snapshot["unattributedIssueStats"] = issue_stats.get(UNATTRIBUTED_ISSUE_BUCKET, build_empty_issue_stats())
    snapshot["unattributedRecentIssueStats"] = recent_issue_stats.get(
        UNATTRIBUTED_ISSUE_BUCKET,
        build_empty_recent_issue_stats(recent_window_days, window_start),
    )
    snapshot["issueTotals"] = build_empty_issue_stats()
    for bucket in issue_stats.values():
        for key in snapshot["issueTotals"]:
            snapshot["issueTotals"][key] += int(bucket.get(key, 0))
    snapshot["recentIssueTotals"] = build_empty_recent_issue_stats(recent_window_days, window_start)
    for bucket in recent_issue_stats.values():
        for key in ("resolved", "done", "failed"):
            snapshot["recentIssueTotals"][key] += int(bucket.get(key, 0))
    total_resolved = int(snapshot["recentIssueTotals"]["resolved"])
    if total_resolved > 0:
        snapshot["recentIssueTotals"]["doneRatio"] = round(int(snapshot["recentIssueTotals"]["done"]) / total_resolved, 3)
        snapshot["recentIssueTotals"]["failedRatio"] = round(int(snapshot["recentIssueTotals"]["failed"]) / total_resolved, 3)

    project_summaries, unassigned_project_summary = build_project_summaries(projects, issues, recent_window_days)
    snapshot["projects"] = project_summaries
    snapshot["unassignedProjectSummary"] = unassigned_project_summary

    cron_status_text = run("hermes cron status", errors=snapshot["alerts"], label="hermes cron status")
    cron_list_text = run("hermes cron list", errors=snapshot["alerts"], label="hermes cron list")
    snapshot["cron"] = {
        "scheduler": cron_status_text or "unknown",
        "configuredJobs": cron_list_text,
        "profiles": [],
    }
    cron_lower = cron_status_text.lower()
    if ("not running" in cron_lower or "stopped" in cron_lower) and "no active jobs" not in cron_lower:
        snapshot["alerts"].append("cron scheduler not running")

    snapshot["slack"] = []
    for gateway in snapshot["gateways"]:
        profile = str(gateway["profile"])
        cron = cron_history(profile)
        slack = latest_slack_status(profile)
        snapshot["cron"]["profiles"].append({"profile": profile, **cron})
        snapshot["slack"].append({"profile": profile, **slack})
        if int(cron["counts"]["failure"]) > 0:
            snapshot["alerts"].append(f"cron failure detected:{profile}")
        if slack["status"] == "error":
            snapshot["alerts"].append(f"slack degraded:{profile}")

    snapshot["alerts"] = sorted(set(snapshot["alerts"]))
    return snapshot


def format_text(snapshot: dict[str, Any]) -> str:
    lines = [f"generatedAt: {snapshot['generatedAt']}"]
    paperclip = snapshot.get("paperclipHealth", {})
    if paperclip.get("status") == "ok":
        lines.append(f"paperclip: ok ({paperclip.get('latencyMs')}ms)")
    else:
        lines.append(f"paperclip: {paperclip.get('status')} {paperclip.get('error', '')}".strip())
    lines.append("")
    lines.append("gateways:")
    for item in snapshot.get("gateways", []):
        lines.append(f"- {item['profile']}: {item['state']} pid={item['pid'] or '-'} cli={item['gatewayCli']}")
    lines.append("")
    lines.append("agents:")
    for item in snapshot.get("agents", []):
        stats = item["issueStats"]
        recent = item.get("recentIssueStats", {})
        lines.append(
            "- {name}: status={status} heartbeat={heartbeat} open={open_issues} total_done={done} total_cancelled={cancelled} recent_done={recent_done}/{recent_resolved} recent_failed={recent_failed} done_ratio={done_ratio:.3f}".format(
                name=item["name"],
                status=item["status"],
                heartbeat=item["heartbeatAge"],
                open_issues=stats["open"],
                done=stats["done"],
                cancelled=stats["cancelled"],
                recent_done=int(recent.get("done", 0)),
                recent_resolved=int(recent.get("resolved", 0)),
                recent_failed=int(recent.get("failed", 0)),
                done_ratio=float(recent.get("doneRatio", 0.0)),
            )
        )
    unattributed_stats = snapshot.get("unattributedIssueStats", {})
    unattributed_recent = snapshot.get("unattributedRecentIssueStats", {})
    if int(unattributed_stats.get("total", 0)) > 0 or int(unattributed_recent.get("resolved", 0)) > 0:
        lines.append(
            "- unattributed: status=unknown heartbeat=- open={open_issues} total_done={done} total_cancelled={cancelled} recent_done={recent_done}/{recent_resolved} recent_failed={recent_failed} done_ratio={done_ratio:.3f}".format(
                open_issues=int(unattributed_stats.get("open", 0)),
                done=int(unattributed_stats.get("done", 0)),
                cancelled=int(unattributed_stats.get("cancelled", 0)),
                recent_done=int(unattributed_recent.get("done", 0)),
                recent_resolved=int(unattributed_recent.get("resolved", 0)),
                recent_failed=int(unattributed_recent.get("failed", 0)),
                done_ratio=float(unattributed_recent.get("doneRatio", 0.0)),
            )
        )
    lines.append("")
    lines.append("cron/slack:")
    cron_by_profile = {c["profile"]: c for c in snapshot.get("cron", {}).get("profiles", [])}
    slack_by_profile = {s["profile"]: s for s in snapshot.get("slack", [])}
    for profile in sorted(cron_by_profile):
        cron = cron_by_profile[profile]
        slack = slack_by_profile.get(profile, {})
        lines.append(
            f"- {profile}: cron runs={cron['counts']['runs']} success={cron['counts']['success']} failure={cron['counts']['failure']} | slack={slack.get('status')}"
        )
    lines.append("")
    notification = snapshot.get("notification")
    lines.append("notification:")
    if notification:
        lines.append(f"- sent={notification.get('sent')} message={notification.get('message')}")
    else:
        lines.append("- none")
    lines.append("")
    if snapshot.get("alerts"):
        lines.append("alerts:")
        for alert in snapshot["alerts"]:
            lines.append(f"- {alert}")
    else:
        lines.append("alerts:\n- none")
    return "\n".join(lines)


def send_slack(webhook_url: str | None, snapshot: dict[str, Any]) -> tuple[bool, str]:
    if not webhook_url or not snapshot.get("alerts"):
        return False, "skipped"
    text = "[hermes-monitor] 이상 감지\n" + "\n".join(f"• {alert}" for alert in snapshot["alerts"][:20])
    data = json.dumps({"text": text}).encode()
    req = urllib.request.Request(webhook_url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=5) as resp:
        body = resp.read().decode()
    return True, body


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect Hermes/Paperclip monitoring snapshot")
    parser.add_argument("--json", action="store_true", help="Print JSON snapshot")
    parser.add_argument("--write-snapshot", help="Write JSON snapshot to file")
    parser.add_argument("--notify", action="store_true", help="Send Slack alert when alerts exist")
    parser.add_argument("--slack-webhook-url", default=os.getenv("HERMES_MONITOR_SLACK_WEBHOOK_URL"))
    parser.add_argument("--api-base", default=DEFAULT_API_BASE)
    parser.add_argument("--company-id", default=DEFAULT_COMPANY_ID)
    parser.add_argument("--warning-minutes", type=int, default=DEFAULT_AGENT_WARNING_MINUTES)
    parser.add_argument("--latency-warn-ms", type=int, default=DEFAULT_LATENCY_WARN_MS)
    parser.add_argument("--recent-window-days", type=int, default=DEFAULT_RECENT_WINDOW_DAYS)
    args = parser.parse_args()

    token = read_auth_token()
    snapshot = collect_snapshot(
        args.api_base,
        args.company_id,
        token,
        args.warning_minutes,
        args.latency_warn_ms,
        args.recent_window_days,
    )

    if args.notify:
        try:
            sent, message = send_slack(args.slack_webhook_url, snapshot)
            snapshot["notification"] = {"sent": sent, "message": message}
        except Exception as exc:
            snapshot["notification"] = {"sent": False, "message": str(exc)}
            snapshot["alerts"].append(f"slack webhook send failed: {exc}")
    else:
        snapshot["notification"] = {"sent": False, "message": "disabled"}

    if args.write_snapshot:
        path = Path(args.write_snapshot).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")

    if args.json:
        print(json.dumps(snapshot, indent=2, ensure_ascii=False))
    else:
        print(format_text(snapshot))

    return 0 if not snapshot.get("alerts") else 1


if __name__ == "__main__":
    sys.exit(main())
