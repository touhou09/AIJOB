from __future__ import annotations

import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


def load_module():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "hermes_monitor.py"
    spec = importlib.util.spec_from_file_location("hermes_monitor", script_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = load_module()


class HermesMonitorTests(unittest.TestCase):
    def test_parse_profiles_uses_actual_cli_columns(self) -> None:
        profile_list_output = """
Profile          Model                        Gateway      Alias
 ───────────────    ───────────────────────────    ───────────    ────────────
  default         anthropic/claude-opus-4.6    stopped      —
  backend         gpt-5.4                      running      backend
  cto             gpt-5.4                      running      cto
 ◆devops          gpt-5.4                      running      devops
""".strip()

        with patch.object(MODULE, "run", return_value=profile_list_output):
            profiles = MODULE.parse_profiles()

        self.assertEqual(
            profiles,
            [
                {"name": "backend", "gateway_cli": "running", "alias": "backend"},
                {"name": "cto", "gateway_cli": "running", "alias": "cto"},
                {"name": "devops", "gateway_cli": "running", "alias": "devops"},
            ],
        )

    def test_collect_snapshot_skips_idle_agents_without_open_work_for_stale_alerts(self) -> None:
        agents = [
            {
                "id": "idle-agent",
                "name": "team-frontend",
                "role": "engineer",
                "status": "idle",
                "lastHeartbeatAt": None,
            },
            {
                "id": "busy-agent",
                "name": "team-devops",
                "role": "devops",
                "status": "running",
                "lastHeartbeatAt": None,
            },
        ]
        issues = [
            {
                "assigneeAgentId": "busy-agent",
                "status": "in_progress",
            }
        ]

        def fake_http_json(url: str, **_: object):
            if url.endswith("/health"):
                return ({"status": "ok"}, 5.0)
            if url.endswith("/agents"):
                return (agents, 5.0)
            if url.endswith("/projects"):
                return ([], 5.0)
            if url.endswith("/issues"):
                return (issues, 5.0)
            raise AssertionError(url)

        with patch.object(
            MODULE,
            "parse_profiles",
            return_value=[
                {"name": "frontend", "gateway_cli": "running", "alias": "frontend"},
                {"name": "devops", "gateway_cli": "running", "alias": "devops"},
            ],
        ), patch.object(
            MODULE,
            "parse_launchctl",
            return_value={
                "ai.hermes.gateway-frontend": {"pid": "1", "last_exit_status": "0"},
                "ai.hermes.gateway-devops": {"pid": "2", "last_exit_status": "0"},
            },
        ), patch.object(
            MODULE,
            "http_json",
            side_effect=fake_http_json,
        ), patch.object(
            MODULE,
            "run",
            return_value="No active jobs",
        ), patch.object(
            MODULE,
            "cron_history",
            return_value={"counts": {"runs": 0, "success": 0, "failure": 0}, "recent": []},
        ), patch.object(
            MODULE,
            "latest_slack_status",
            return_value={"status": "unknown", "line": "-", "path": None, "timestamp": None},
        ):
            snapshot = MODULE.collect_snapshot(
                MODULE.DEFAULT_API_BASE,
                MODULE.DEFAULT_COMPANY_ID,
                token="token",
                warning_minutes=30,
                latency_warn_ms=1500,
            )

        self.assertIn("heartbeat stale:team-devops age=unknown", snapshot["alerts"])
        self.assertNotIn("heartbeat stale:team-frontend age=unknown", snapshot["alerts"])

    def test_run_records_timeout_as_partial_alert(self) -> None:
        timeout_error = subprocess.TimeoutExpired(cmd="hermes profile list", timeout=10)
        errors: list[str] = []

        with patch.object(MODULE.subprocess, "run", side_effect=timeout_error):
            result = MODULE.run("hermes profile list", errors=errors, label="hermes profile list")

        self.assertEqual(result, "")
        self.assertEqual(errors, ["command timeout:hermes profile list after 10s"])

    def test_run_records_blank_failure_output_as_unknown_error(self) -> None:
        failure = subprocess.CompletedProcess(args="hermes profile list", returncode=2, stdout="\n", stderr="")
        errors: list[str] = []

        with patch.object(MODULE.subprocess, "run", return_value=failure):
            result = MODULE.run("hermes profile list", errors=errors, label="hermes profile list")

        self.assertEqual(result, "")
        self.assertEqual(errors, ["command failed:hermes profile list rc=2 detail=unknown error"])

    def test_parse_launchctl_records_command_failure_as_partial_alert(self) -> None:
        failure = subprocess.CompletedProcess(args="launchctl list", returncode=1, stdout="", stderr="launchctl unavailable\n")
        errors: list[str] = []

        with patch.object(MODULE.subprocess, "run", return_value=failure):
            services = MODULE.parse_launchctl(errors)

        self.assertEqual(services, {})
        self.assertEqual(errors, ["command failed:launchctl list rc=1 detail=launchctl unavailable"])

    def test_parse_launchctl_filters_hermes_gateways_without_shell_masking(self) -> None:
        launchctl_output = "\n".join(
            [
                "123\t0\tai.hermes.gateway-devops",
                "-\t0\tai.hermes.gateway-frontend",
                "456\t0\tcom.apple.some-service",
            ]
        )

        with patch.object(MODULE, "run", return_value=launchctl_output) as run_mock:
            services = MODULE.parse_launchctl([])

        run_mock.assert_called_once_with("launchctl list", errors=[], label="launchctl list")
        self.assertEqual(
            services,
            {
                "ai.hermes.gateway-devops": {"pid": "123", "last_exit_status": "0"},
                "ai.hermes.gateway-frontend": {"pid": None, "last_exit_status": "0"},
            },
        )

    def test_collect_snapshot_does_not_mark_gateways_missing_when_launchctl_command_fails(self) -> None:
        agents = [{"id": "agent-1", "name": "team-devops", "role": "devops", "status": "running", "lastHeartbeatAt": None}]
        issues = [{"assigneeAgentId": "agent-1", "status": "in_progress"}]

        def fake_http_json(url: str, **_: object):
            if url.endswith("/health"):
                return ({"status": "ok"}, 5.0)
            if url.endswith("/agents"):
                return (agents, 5.0)
            if url.endswith("/projects"):
                return ([], 5.0)
            if url.endswith("/issues"):
                return (issues, 5.0)
            raise AssertionError(url)

        def fake_parse_launchctl(errors: list[str] | None = None):
            assert errors is not None
            errors.append("command failed:launchctl list rc=1 detail=launchctl unavailable")
            return {}

        with patch.object(
            MODULE,
            "parse_profiles",
            return_value=[{"name": "devops", "gateway_cli": "running", "alias": "devops"}],
        ), patch.object(MODULE, "parse_launchctl", side_effect=fake_parse_launchctl), patch.object(
            MODULE,
            "http_json",
            side_effect=fake_http_json,
        ), patch.object(MODULE, "run", return_value="No active jobs"), patch.object(
            MODULE,
            "cron_history",
            return_value={"counts": {"runs": 0, "success": 0, "failure": 0}, "recent": []},
        ), patch.object(
            MODULE,
            "latest_slack_status",
            return_value={"status": "unknown", "line": "-", "path": None, "timestamp": None},
        ):
            snapshot = MODULE.collect_snapshot(
                MODULE.DEFAULT_API_BASE,
                MODULE.DEFAULT_COMPANY_ID,
                token="token",
                warning_minutes=30,
                latency_warn_ms=1500,
            )

        self.assertIn("command failed:launchctl list rc=1 detail=launchctl unavailable", snapshot["alerts"])
        self.assertNotIn("gateway:devops missing", snapshot["alerts"])
        self.assertEqual(snapshot["gateways"][0]["state"], "unknown")

    def test_build_recent_issue_stats_counts_only_terminal_statuses(self) -> None:
        issues = [
            {
                "assigneeAgentId": "agent-1",
                "status": "done",
                "completedAt": "2026-04-10T10:00:00+00:00",
                "createdAt": "2026-04-09T10:00:00+00:00",
            },
            {
                "assigneeAgentId": "agent-1",
                "status": "blocked",
                "updatedAt": "2026-04-10T09:00:00+00:00",
                "createdAt": "2026-04-08T10:00:00+00:00",
            },
            {
                "assigneeAgentId": "agent-1",
                "status": "cancelled",
                "cancelledAt": "2026-04-10T08:00:00+00:00",
                "createdAt": "2026-04-07T10:00:00+00:00",
            },
            {
                "status": "done",
                "completedAt": "2026-04-10T07:00:00+00:00",
                "createdAt": "2026-04-06T09:00:00+00:00",
            },
            {
                "assigneeAgentId": "agent-1",
                "status": "done",
                "completedAt": "2026-03-01T10:00:00+00:00",
                "createdAt": "2026-03-01T09:00:00+00:00",
            },
        ]

        real_datetime = MODULE.datetime
        fake_now = real_datetime(2026, 4, 10, 12, 0, tzinfo=MODULE.timezone.utc)
        with patch.object(MODULE, "datetime", wraps=real_datetime) as mock_datetime:
            mock_datetime.now.return_value = fake_now
            mock_datetime.fromisoformat.side_effect = real_datetime.fromisoformat
            stats = MODULE.build_recent_issue_stats(issues, window_days=7)

        agent_stats = stats["agent-1"]
        self.assertEqual(agent_stats["resolved"], 2)
        self.assertEqual(agent_stats["done"], 1)
        self.assertEqual(agent_stats["failed"], 1)
        self.assertEqual(agent_stats["doneRatio"], 0.5)
        self.assertEqual(agent_stats["failedRatio"], 0.5)
        self.assertEqual(agent_stats["failedStatuses"], ["cancelled"])

    def test_build_recent_issue_stats_keeps_unattributed_terminal_issues(self) -> None:
        issues = [
            {
                "assigneeAgentId": None,
                "status": "done",
                "completedAt": "2026-04-10T10:00:00+00:00",
                "createdAt": "2026-04-09T10:00:00+00:00",
            },
            {
                "assigneeAgentId": None,
                "status": "cancelled",
                "cancelledAt": "2026-04-10T08:00:00+00:00",
                "createdAt": "2026-04-07T10:00:00+00:00",
            },
            {
                "assigneeAgentId": None,
                "title": "[ignore] accidental test issue",
                "status": "cancelled",
                "cancelledAt": "2026-04-10T07:00:00+00:00",
                "createdAt": "2026-04-07T09:00:00+00:00",
            },
        ]

        real_datetime = MODULE.datetime
        fake_now = real_datetime(2026, 4, 10, 12, 0, tzinfo=MODULE.timezone.utc)
        with patch.object(MODULE, "datetime", wraps=real_datetime) as mock_datetime:
            mock_datetime.now.return_value = fake_now
            mock_datetime.fromisoformat.side_effect = real_datetime.fromisoformat
            stats = MODULE.build_recent_issue_stats(issues, window_days=7)

        unattributed = stats[MODULE.UNATTRIBUTED_ISSUE_BUCKET]
        self.assertEqual(unattributed["resolved"], 2)
        self.assertEqual(unattributed["done"], 1)
        self.assertEqual(unattributed["failed"], 1)
        self.assertEqual(unattributed["doneRatio"], 0.5)
        self.assertEqual(unattributed["failedRatio"], 0.5)

    def test_build_project_summaries_groups_project_and_unassigned_issues(self) -> None:
        projects = [{"id": "project-1", "name": "AIJOB", "urlKey": "aijob", "status": "active"}]
        issues = [
            {
                "projectId": "project-1",
                "status": "in_progress",
                "createdAt": "2026-04-10T09:00:00+00:00",
            },
            {
                "projectId": "project-1",
                "status": "done",
                "completedAt": "2026-04-10T10:00:00+00:00",
                "createdAt": "2026-04-09T10:00:00+00:00",
            },
            {
                "status": "cancelled",
                "cancelledAt": "2026-04-10T08:00:00+00:00",
                "createdAt": "2026-04-08T10:00:00+00:00",
            },
        ]

        real_datetime = MODULE.datetime
        fake_now = real_datetime(2026, 4, 10, 12, 0, tzinfo=MODULE.timezone.utc)
        with patch.object(MODULE, "datetime", wraps=real_datetime) as mock_datetime:
            mock_datetime.now.return_value = fake_now
            mock_datetime.fromisoformat.side_effect = real_datetime.fromisoformat
            project_summaries, unassigned_summary = MODULE.build_project_summaries(projects, issues, recent_window_days=7)

        self.assertEqual(len(project_summaries), 1)
        self.assertEqual(project_summaries[0]["name"], "AIJOB")
        self.assertEqual(project_summaries[0]["issueStats"]["open"], 1)
        self.assertEqual(project_summaries[0]["issueStats"]["done"], 1)
        self.assertEqual(project_summaries[0]["recentIssueStats"]["resolved"], 1)
        self.assertEqual(project_summaries[0]["recentIssueStats"]["done"], 1)
        self.assertEqual(unassigned_summary["issueStats"]["cancelled"], 1)
        self.assertEqual(unassigned_summary["recentIssueStats"]["failed"], 1)


if __name__ == "__main__":
    unittest.main()
