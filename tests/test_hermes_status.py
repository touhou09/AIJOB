from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
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
            )

            self.assertEqual(result.source, "cache")
            self.assertEqual(result.snapshot, snapshot)

    def test_resolve_snapshot_refreshes_when_stale(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            snapshot_path = Path(tmp_dir) / "latest.json"
            snapshot_path.write_text(json.dumps({"generatedAt": "2000-01-01T00:00:00+00:00"}))
            refreshed_snapshot = {
                "generatedAt": "2026-04-10T07:20:00+00:00",
                "alerts": ["heartbeat stale:team-qa age=44m"],
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
            )

            self.assertEqual(result.source, "live")
            self.assertEqual(result.snapshot, refreshed_snapshot)
            self.assertEqual(json.loads(snapshot_path.read_text()), refreshed_snapshot)

    def test_format_status_text_includes_agent_and_profile_summary(self) -> None:
        snapshot = {
            "generatedAt": "2026-04-10T07:16:02.474691+00:00",
            "alerts": ["slack degraded:frontend"],
            "paperclipHealth": {"status": "ok", "latencyMs": 5.3},
            "gateways": [{"profile": "frontend", "state": "running"}],
            "agents": [
                {
                    "profile": "frontend",
                    "name": "team-frontend",
                    "status": "idle",
                    "heartbeatAge": "55m",
                    "lastHeartbeatAt": "2026-04-10T06:20:58.944Z",
                    "issueStats": {"open": 2, "done": 1, "cancelled": 0},
                }
            ],
            "cron": {"profiles": [{"profile": "frontend", "counts": {"runs": 3, "success": 2, "failure": 1}}]},
            "slack": [{"profile": "frontend", "status": "error"}],
        }
        result = MODULE.SnapshotLoadResult(
            snapshot=snapshot,
            source="cache",
            snapshot_path=Path("latest.json"),
            age_minutes=3.2,
        )

        text = MODULE.format_status_text(result, warning_minutes=30)

        self.assertIn("summary: gateways=1/1 agents=0/1 stale_agents=1 open_issues=2 alerts=1", text)
        self.assertIn("team-frontend", text)
        self.assertIn("gateway=running", text)
        self.assertIn("slack=error", text)
        self.assertIn("slack degraded:frontend", text)


if __name__ == "__main__":
    unittest.main()
