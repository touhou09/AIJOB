from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace


def load_module():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "hermes_status.py"
    spec = importlib.util.spec_from_file_location("hermes_status", script_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = load_module()


class HermesStatusTests(unittest.TestCase):
    def test_resolve_snapshot_uses_cache_when_fresh(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            snapshot_path = Path(tmp_dir) / "latest.json"
            snapshot = {
                "generatedAt": "2999-01-01T00:00:00+00:00",
                "issueKpiWindowDays": 7,
                "alerts": [],
                "agents": [],
                "gateways": [],
                "cron": {"profiles": []},
                "slack": [],
                "paperclipHealth": {"status": "ok", "latencyMs": 5},
            }
            snapshot_path.write_text(json.dumps(snapshot))

            monitor_module = SimpleNamespace(
                read_auth_token=lambda: "token",
                collect_snapshot=lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("should not refresh")),
            )

            result = MODULE.resolve_snapshot(
                monitor_module,
                snapshot_path=snapshot_path,
                max_age_minutes=15,
                refresh=False,
                write_snapshot=True,
                api_base="http://localhost:3100/api",
                company_id="company",
                warning_minutes=30,
                latency_warn_ms=1500,
                recent_window_days=7,
            )

            self.assertEqual(result.source, "cache")
            self.assertEqual(result.snapshot, snapshot)

    def test_resolve_snapshot_refreshes_when_stale_and_preserves_notification_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            snapshot_path = Path(tmp_dir) / "latest.json"
            snapshot_path.write_text(
                json.dumps(
                    {
                        "generatedAt": "2000-01-01T00:00:00+00:00",
                        "notification": {"sent": True, "message": "ok"},
                    }
                )
            )
            refreshed_snapshot = {
                "generatedAt": "2026-04-10T07:20:00+00:00",
                "alerts": ["heartbeat stale:team-devops age=44m"],
                "agents": [],
                "gateways": [],
                "cron": {"profiles": []},
                "slack": [],
                "paperclipHealth": {"status": "ok", "latencyMs": 5},
            }

            monitor_module = SimpleNamespace(
                read_auth_token=lambda: "token",
                collect_snapshot=lambda *args, **kwargs: refreshed_snapshot,
            )

            result = MODULE.resolve_snapshot(
                monitor_module,
                snapshot_path=snapshot_path,
                max_age_minutes=15,
                refresh=False,
                write_snapshot=True,
                api_base="http://localhost:3100/api",
                company_id="company",
                warning_minutes=30,
                latency_warn_ms=1500,
                recent_window_days=7,
            )

            self.assertEqual(result.source, "live")
            self.assertEqual(result.snapshot["notification"], {"sent": True, "message": "ok"})
            self.assertEqual(json.loads(snapshot_path.read_text()), result.snapshot)

    def test_resolve_snapshot_refreshes_when_requested_window_differs_from_fresh_cache(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            snapshot_path = Path(tmp_dir) / "latest.json"
            snapshot_path.write_text(
                json.dumps(
                    {
                        "generatedAt": "2999-01-01T00:00:00+00:00",
                        "issueKpiWindowDays": 7,
                        "notification": {"sent": True, "message": "cached"},
                        "alerts": [],
                        "agents": [],
                        "gateways": [],
                        "cron": {"profiles": []},
                        "slack": [],
                        "paperclipHealth": {"status": "ok", "latencyMs": 5},
                    }
                )
            )
            refreshed_snapshot = {
                "generatedAt": "2026-04-10T07:20:00+00:00",
                "issueKpiWindowDays": 30,
                "alerts": [],
                "agents": [],
                "gateways": [],
                "cron": {"profiles": []},
                "slack": [],
                "paperclipHealth": {"status": "ok", "latencyMs": 5},
            }
            collect_calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

            def collect_snapshot(*args: object, **kwargs: object) -> dict[str, object]:
                collect_calls.append((args, kwargs))
                return refreshed_snapshot

            monitor_module = SimpleNamespace(
                read_auth_token=lambda: "token",
                collect_snapshot=collect_snapshot,
            )

            result = MODULE.resolve_snapshot(
                monitor_module,
                snapshot_path=snapshot_path,
                max_age_minutes=15,
                refresh=False,
                write_snapshot=False,
                api_base="http://localhost:3100/api",
                company_id="company",
                warning_minutes=30,
                latency_warn_ms=1500,
                recent_window_days=30,
            )

            self.assertEqual(result.source, "live")
            self.assertEqual(len(collect_calls), 1)
            self.assertEqual(result.snapshot["issueKpiWindowDays"], 30)
            self.assertEqual(result.snapshot["notification"], {"sent": True, "message": "cached"})

    def test_format_status_text_excludes_idle_agents_without_open_work_from_summary(self) -> None:
        active_heartbeat_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        idle_stale_heartbeat_at = datetime.now(timezone.utc) - timedelta(hours=9)
        snapshot = {
            "generatedAt": "2026-04-10T07:16:02.474691+00:00",
            "alerts": ["slack degraded:frontend"],
            "issueKpiWindowDays": 7,
            "failedIssueStatuses": ["cancelled"],
            "paperclipHealth": {"status": "ok", "latencyMs": 5.3},
            "gateways": [{"profile": "frontend", "state": "running"}],
            "agents": [
                {
                    "profile": "frontend",
                    "name": "team-frontend",
                    "status": "idle",
                    "heartbeatAge": "5m",
                    "lastHeartbeatAt": active_heartbeat_at.isoformat(),
                    "issueStats": {"open": 2, "done": 1, "cancelled": 0, "blocked": 1},
                    "recentIssueStats": {"resolved": 2, "done": 1, "failed": 1, "doneRatio": 0.5, "failedRatio": 0.5},
                },
                {
                    "profile": "data",
                    "name": "team-data",
                    "status": "idle",
                    "heartbeatAge": "9h",
                    "lastHeartbeatAt": idle_stale_heartbeat_at.isoformat(),
                    "issueStats": {"open": 0, "done": 0, "cancelled": 0, "blocked": 0},
                    "recentIssueStats": {"resolved": 0, "done": 0, "failed": 0, "doneRatio": 0.0, "failedRatio": 0.0},
                },
            ],
            "unattributedIssueStats": {"open": 0, "done": 3, "cancelled": 0, "blocked": 0, "total": 3},
            "unattributedRecentIssueStats": {"resolved": 3, "done": 3, "failed": 0, "doneRatio": 1.0, "failedRatio": 0.0},
            "cron": {"profiles": [{"profile": "frontend", "counts": {"runs": 3, "success": 2, "failure": 1}}]},
            "slack": [{"profile": "frontend", "status": "error"}],
            "notification": {"sent": False, "message": "disabled"},
        }
        result = MODULE.SnapshotLoadResult(
            snapshot=snapshot,
            source="cache",
            snapshot_path=Path("latest.json"),
            age_minutes=3.2,
        )

        text = MODULE.format_status_text(result, warning_minutes=30)

        self.assertIn(
            "summary: gateways=1/1 fresh_agents=1/1 stale_agents=0 open_issues=2 recent_resolved=5 recent_failed=1 alerts=1",
            text,
        )
        self.assertIn("recent_issue_window: 7d failed_statuses=cancelled", text)
        self.assertIn("team-frontend", text)
        self.assertIn("ratio=0.50/0.50", text)
        self.assertIn("unattributed paperclip", text)
        self.assertIn("recent=3  done=3  failed=0", text)
        self.assertIn("gateway=running", text)
        self.assertIn("- unattributed gateway=n/a", text)
        self.assertIn("slack=error", text)
        self.assertIn("notification:", text)
        self.assertIn("message=disabled", text)
        self.assertIn("slack degraded:frontend", text)

    def test_build_project_lines_and_filter_snapshot_projects(self) -> None:
        snapshot = {
            "issueKpiWindowDays": 7,
            "failedIssueStatuses": ["cancelled"],
            "projects": [
                {
                    "id": "project-1",
                    "name": "AIJOB",
                    "urlKey": "aijob",
                    "status": "active",
                    "issueStats": {"open": 2, "blocked": 1, "done": 3, "cancelled": 0, "total": 5},
                    "recentIssueStats": {"resolved": 2, "done": 2, "failed": 0, "doneRatio": 1.0, "failedRatio": 0.0},
                }
            ],
            "unassignedProjectSummary": {
                "id": None,
                "name": "unassigned",
                "urlKey": None,
                "status": "n/a",
                "issueStats": {"open": 1, "blocked": 0, "done": 0, "cancelled": 1, "total": 2},
                "recentIssueStats": {"resolved": 1, "done": 0, "failed": 1, "doneRatio": 0.0, "failedRatio": 1.0},
            },
        }

        filtered = MODULE.filter_snapshot_projects(snapshot, "aijob")
        lines = MODULE.build_project_lines(filtered)
        self.assertEqual(filtered["projects"][0]["name"], "AIJOB")
        self.assertEqual(len(filtered["projects"]), 1)
        self.assertEqual(filtered["issueTotals"], {"open": 2, "blocked": 1, "done": 3, "cancelled": 0, "total": 5})
        self.assertEqual(filtered["recentIssueTotals"]["resolved"], 2)
        self.assertEqual(filtered["recentIssueTotals"]["done"], 2)
        self.assertEqual(filtered["recentIssueTotals"]["failed"], 0)
        self.assertIn("projects:", lines[0])
        self.assertIn("AIJOB", "\n".join(lines))
        self.assertNotIn("unassigned", "\n".join(lines))

        unassigned = MODULE.filter_snapshot_projects(snapshot, "unassigned")
        unassigned_lines = MODULE.build_project_lines(unassigned)
        self.assertEqual(unassigned["projects"], [])
        self.assertEqual(unassigned["issueTotals"], {"open": 1, "blocked": 0, "done": 0, "cancelled": 1, "total": 2})
        self.assertEqual(unassigned["recentIssueTotals"]["resolved"], 1)
        self.assertEqual(unassigned["recentIssueTotals"]["failed"], 1)
        self.assertIn("unassigned", "\n".join(unassigned_lines))

        with self.assertRaises(ValueError):
            MODULE.filter_snapshot_projects(snapshot, "missing-project")

    def test_format_status_text_scopes_issue_summary_with_project_filter(self) -> None:
        snapshot = {
            "generatedAt": "2026-04-11T00:00:00Z",
            "issueKpiWindowDays": 7,
            "failedIssueStatuses": ["cancelled"],
            "paperclipHealth": {"status": "ok", "latencyMs": 12},
            "gateways": [{"profile": "frontend", "state": "running", "pid": "123", "gatewayCli": "frontend"}],
            "agents": [
                {
                    "name": "team-frontend",
                    "profile": "frontend",
                    "status": "running",
                    "lastHeartbeatAt": "2999-01-01T00:00:00Z",
                    "issueStats": {"open": 5, "blocked": 1, "done": 8, "cancelled": 0, "total": 13},
                    "recentIssueStats": {"resolved": 6, "done": 5, "failed": 1, "doneRatio": 0.833, "failedRatio": 0.167},
                }
            ],
            "profiles": [{"profile": "frontend", "gateway": {"state": "running"}, "agents": [{"name": "team-frontend"}], "issues": {"open": 5, "done": 8, "cancelled": 0, "blocked": 1, "total": 13}, "recentIssues": {"resolved": 6, "done": 5, "failed": 1, "doneRatio": 0.833, "failedRatio": 0.167}}],
            "notification": None,
            "alerts": [],
            "unattributedIssueStats": {"open": 0, "blocked": 0, "done": 0, "cancelled": 0, "total": 0},
            "unattributedRecentIssueStats": {"resolved": 0, "done": 0, "failed": 0, "doneRatio": 0.0, "failedRatio": 0.0},
            "issueTotals": {"open": 5, "blocked": 1, "done": 8, "cancelled": 0, "total": 13},
            "recentIssueTotals": {"resolved": 6, "done": 5, "failed": 1, "doneRatio": 0.833, "failedRatio": 0.167},
            "projects": [
                {
                    "id": "project-1",
                    "name": "AIJOB",
                    "urlKey": "aijob",
                    "status": "active",
                    "issueStats": {"open": 2, "blocked": 1, "done": 3, "cancelled": 0, "total": 5},
                    "recentIssueStats": {"resolved": 2, "done": 2, "failed": 0, "doneRatio": 1.0, "failedRatio": 0.0},
                },
                {
                    "id": "project-2",
                    "name": "Hermes Infra",
                    "urlKey": "hermes-infra",
                    "status": "planned",
                    "issueStats": {"open": 3, "blocked": 0, "done": 5, "cancelled": 0, "total": 8},
                    "recentIssueStats": {"resolved": 4, "done": 3, "failed": 1, "doneRatio": 0.75, "failedRatio": 0.25},
                },
            ],
            "unassignedProjectSummary": {
                "id": None,
                "name": "unassigned",
                "urlKey": None,
                "status": "n/a",
                "issueStats": {"open": 0, "blocked": 0, "done": 0, "cancelled": 0, "total": 0},
                "recentIssueStats": {"resolved": 0, "done": 0, "failed": 0, "doneRatio": 0.0, "failedRatio": 0.0},
            },
        }
        result = MODULE.SnapshotLoadResult(snapshot=snapshot, source="cache", snapshot_path=Path("latest.json"), age_minutes=1.0)

        text = MODULE.format_status_text(result, warning_minutes=30, project="hermes-infra")
        filtered = MODULE.filter_snapshot_projects(snapshot, "hermes-infra")

        self.assertIn("project_filter: hermes-infra", text)
        self.assertIn("summary: gateways=1/1 fresh_agents=1/1 stale_agents=0 open_issues=3 recent_resolved=4 recent_failed=1 alerts=0", text)
        self.assertEqual(filtered["issueTotals"], {"open": 3, "blocked": 0, "done": 5, "cancelled": 0, "total": 8})
        self.assertEqual(filtered["recentIssueTotals"]["resolved"], 4)
        self.assertEqual(filtered["recentIssueTotals"]["failed"], 1)


if __name__ == "__main__":
    unittest.main()
