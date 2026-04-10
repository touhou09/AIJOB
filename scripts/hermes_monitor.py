#!/usr/bin/env python3
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_API_BASE = "http://localhost:3100/api"
DEFAULT_COMPANY_ID = "abac28ea-9edd-4ddb-b40a-0baf52505357"
DEFAULT_AGENT_WARNING_MINUTES = 30
DEFAULT_LATENCY_WARN_MS = 1500


def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def iso_to_epoch(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def human_age(ts):
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


def read_auth_token():
    path = os.path.expanduser("~/.paperclip/auth.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        data = json.load(f)
    creds = data.get("credentials", {})
    for base in ("http://localhost:3100", "https://paperclip.dororong.dev"):
        if base in creds and creds[base].get("token"):
            return creds[base]["token"]
    for info in creds.values():
        if info.get("token"):
            return info["token"]
    return None


def http_json(url, token=None, timeout=5, method="GET", payload=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(payload).encode()
    req = urllib.request.Request(url, headers=headers, method=method, data=payload)
    started = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode()
    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    return json.loads(body), latency_ms


def parse_profiles():
    text = run("hermes profile list")
    profiles = []
    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("Profile") or stripped.startswith("─") or stripped.startswith("---"):
            continue
        if stripped[0] not in {"◆", "default"[0], "b", "d", "f", "o", "q"}:
            continue
        parts = stripped.replace("◆", "").split()
        if len(parts) < 3:
            continue
        name = parts[0]
        gateway = parts[-2]
        alias = parts[-1] if parts[-1] != "—" else None
        profiles.append({"name": name, "gateway_cli": gateway, "alias": alias})
    return [p for p in profiles if p["name"] != "default"]


def parse_launchctl():
    text = run("launchctl list | grep hermes || true")
    services = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 3 and parts[2].startswith("ai.hermes.gateway-"):
            label = parts[2]
            pid = None if parts[0] == "-" else parts[0]
            services[label] = {"pid": pid, "last_exit_status": parts[1]}
    return services


def tail_lines(path, limit=200):
    try:
        with open(path, errors="ignore") as f:
            lines = f.readlines()
        return lines[-limit:]
    except OSError:
        return []


def latest_slack_status(profile):
    base = os.path.expanduser(f"~/.hermes/profiles/{profile}/logs")
    latest_ok = None
    latest_error = None
    ts_re = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")
    for path in sorted(glob.glob(os.path.join(base, "gateway.log*")), key=os.path.getmtime, reverse=True)[:4]:
        for line in tail_lines(path, 400):
            lower = line.lower()
            if "slack" not in lower:
                continue
            m = ts_re.search(line)
            ts = m.group(1) if m else ""
            entry = {"line": line.strip(), "path": path, "timestamp": ts}
            if any(token in lower for token in ["✓ slack connected", "socket mode connected", "bolt app is running", "a new session"]):
                if latest_ok is None or entry["timestamp"] >= latest_ok["timestamp"]:
                    latest_ok = entry
            elif any(token in lower for token in ["failed", "error", "conflict", "already in use"]):
                if latest_error is None or entry["timestamp"] >= latest_error["timestamp"]:
                    latest_error = entry
    if latest_ok and (latest_error is None or latest_ok["timestamp"] >= latest_error["timestamp"]):
        return {"status": "ok", **latest_ok}
    if latest_error:
        return {"status": "error", **latest_error}
    return {"status": "unknown", "line": "no slack log found", "path": None, "timestamp": None}


def cron_history(profile):
    counts = {"runs": 0, "success": 0, "failure": 0}
    recent = []
    base = os.path.expanduser(f"~/.hermes/profiles/{profile}/logs")
    files = sorted(glob.glob(os.path.join(base, "agent.log*")), key=os.path.getmtime, reverse=True)[:6]
    ts_re = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")
    for path in files:
        for line in tail_lines(path, 500):
            if "cron.scheduler:" not in line:
                continue
            lower = line.lower()
            event = None
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
                m = ts_re.search(line)
                recent.append({
                    "event": event,
                    "timestamp": m.group(1) if m else None,
                    "message": line.strip(),
                })
    recent = sorted(recent, key=lambda x: x.get("timestamp") or "", reverse=True)[:10]
    return {"counts": counts, "recent": recent}


def map_agent_profile(agent_name):
    if agent_name == "orchestrator":
        return "orchestrator"
    if agent_name.startswith("team-"):
        return agent_name.split("team-", 1)[1]
    return agent_name


def collect_snapshot(api_base, company_id, token, warning_minutes, latency_warn_ms):
    snapshot = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apiBase": api_base,
        "companyId": company_id,
        "alerts": [],
    }

    profiles = parse_profiles()
    services = parse_launchctl()
    snapshot["gateways"] = []
    for profile in profiles:
        label = f"ai.hermes.gateway-{profile['name']}"
        svc = services.get(label)
        state = "running" if svc and svc.get("pid") else "missing"
        item = {
            "profile": profile["name"],
            "gatewayCli": profile["gateway_cli"],
            "label": label,
            "state": state,
            "pid": svc.get("pid") if svc else None,
            "lastExitStatus": svc.get("last_exit_status") if svc else None,
        }
        if state != "running":
            snapshot["alerts"].append(f"gateway:{profile['name']} missing")
        snapshot["gateways"].append(item)

    try:
        health, latency_ms = http_json(f"{api_base}/health", timeout=3)
        snapshot["paperclipHealth"] = {"status": health.get("status"), "latencyMs": latency_ms, "raw": health}
        if health.get("status") != "ok" or latency_ms > latency_warn_ms:
            snapshot["alerts"].append(f"paperclip health degraded ({latency_ms}ms)")
    except Exception as exc:
        snapshot["paperclipHealth"] = {"status": "error", "error": str(exc)}
        snapshot["alerts"].append(f"paperclip health check failed: {exc}")

    agents = []
    issues = []
    if token:
        try:
            agents, _ = http_json(f"{api_base}/companies/{company_id}/agents", token=token)
        except Exception as exc:
            snapshot["alerts"].append(f"paperclip agents fetch failed: {exc}")
        try:
            issues, _ = http_json(f"{api_base}/companies/{company_id}/issues", token=token)
        except Exception as exc:
            snapshot["alerts"].append(f"paperclip issues fetch failed: {exc}")
    else:
        snapshot["alerts"].append("paperclip token missing")

    issue_stats = defaultdict(lambda: {"done": 0, "cancelled": 0, "open": 0, "total": 0})
    for issue in issues:
        aid = issue.get("assigneeAgentId")
        if not aid:
            continue
        bucket = issue_stats[aid]
        bucket["total"] += 1
        status = issue.get("status")
        if status == "done":
            bucket["done"] += 1
        elif status == "cancelled":
            bucket["cancelled"] += 1
        else:
            bucket["open"] += 1

    snapshot["agents"] = []
    stale_cutoff = warning_minutes * 60
    for agent in agents:
        hb_ts = iso_to_epoch(agent.get("lastHeartbeatAt"))
        profile = map_agent_profile(agent.get("name", ""))
        stats = issue_stats[agent["id"]]
        item = {
            "name": agent.get("name"),
            "role": agent.get("role"),
            "status": agent.get("status"),
            "profile": profile,
            "lastHeartbeatAt": agent.get("lastHeartbeatAt"),
            "heartbeatAge": human_age(hb_ts),
            "issueStats": stats,
        }
        if hb_ts is None or time.time() - hb_ts > stale_cutoff:
            snapshot["alerts"].append(f"heartbeat stale:{agent.get('name')} age={item['heartbeatAge']}")
        snapshot["agents"].append(item)

    cron_status_text = run("hermes cron status")
    cron_list_text = run("hermes cron list")
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
        profile = gateway["profile"]
        cron = cron_history(profile)
        slack = latest_slack_status(profile)
        snapshot["cron"]["profiles"].append({"profile": profile, **cron})
        snapshot["slack"].append({"profile": profile, **slack})
        if cron["counts"]["failure"] > 0:
            snapshot["alerts"].append(f"cron failure detected:{profile}")
        if slack["status"] == "error":
            snapshot["alerts"].append(f"slack degraded:{profile}")

    snapshot["alerts"] = sorted(set(snapshot["alerts"]))
    return snapshot


def format_text(snapshot):
    lines = []
    lines.append(f"generatedAt: {snapshot['generatedAt']}")
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
        lines.append(
            f"- {item['name']}: status={item['status']} heartbeat={item['heartbeatAge']} done={stats['done']} cancelled={stats['cancelled']} open={stats['open']}"
        )
    lines.append("")
    lines.append("cron/slack:")
    cron_by_profile = {c['profile']: c for c in snapshot.get('cron', {}).get('profiles', [])}
    slack_by_profile = {s['profile']: s for s in snapshot.get('slack', [])}
    for profile in sorted(cron_by_profile):
        cron = cron_by_profile[profile]
        slack = slack_by_profile.get(profile, {})
        lines.append(
            f"- {profile}: cron runs={cron['counts']['runs']} success={cron['counts']['success']} failure={cron['counts']['failure']} | slack={slack.get('status')}"
        )
    lines.append("")
    if snapshot.get("alerts"):
        lines.append("alerts:")
        for alert in snapshot["alerts"]:
            lines.append(f"- {alert}")
    else:
        lines.append("alerts:\n- none")
    return "\n".join(lines)


def send_slack(webhook_url, snapshot):
    if not webhook_url or not snapshot.get("alerts"):
        return False, "skipped"
    text = "[hermes-monitor] 이상 감지\n" + "\n".join(f"• {a}" for a in snapshot["alerts"][:20])
    data = json.dumps({"text": text}).encode()
    req = urllib.request.Request(webhook_url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=5) as resp:
        body = resp.read().decode()
    return True, body


def main():
    parser = argparse.ArgumentParser(description="Collect Hermes/Paperclip monitoring snapshot")
    parser.add_argument("--json", action="store_true", help="Print JSON snapshot")
    parser.add_argument("--write-snapshot", help="Write JSON snapshot to file")
    parser.add_argument("--notify", action="store_true", help="Send Slack alert when alerts exist")
    parser.add_argument("--slack-webhook-url", default=os.getenv("HERMES_MONITOR_SLACK_WEBHOOK_URL"))
    parser.add_argument("--api-base", default=DEFAULT_API_BASE)
    parser.add_argument("--company-id", default=DEFAULT_COMPANY_ID)
    parser.add_argument("--warning-minutes", type=int, default=DEFAULT_AGENT_WARNING_MINUTES)
    parser.add_argument("--latency-warn-ms", type=int, default=DEFAULT_LATENCY_WARN_MS)
    args = parser.parse_args()

    token = read_auth_token()
    snapshot = collect_snapshot(args.api_base, args.company_id, token, args.warning_minutes, args.latency_warn_ms)

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
