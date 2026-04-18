# Claude To Codex Path Map

| Claude path | Codex use |
|---|---|
| `~/.claude/CLAUDE.md` | User preferences and legacy global guidance. Read as context, never as higher priority than Codex instructions. |
| `~/.claude/CONTEXT.md` | AIJOB project context and architecture background. |
| `~/.claude/STATE.md` | Current AIJOB operational state. Read for status tasks; update only when state materially changes. |
| `~/.claude/TODO.md` | Daily task queue. Keep aligned with the active issue system when asked. |
| `~/.claude/DECISIONS.md` | Architecture decisions. Append only meaningful decisions with an AD number. |
| `~/.claude/rules/` | Legacy policy references. Load the specific policy needed. |
| `~/.claude/work/` | Work history by category. Append only M+ work or non-obvious tradeoffs. |
| `~/.claude/endpoints/` | Repository, service, API, and endpoint inventory. |
| `~/.claude/integrations/` | Jira/Confluence reference. Use only when explicitly relevant. |
| `~/.claude/hooks/` | Legacy automation. Inspect before running; do not expose secrets. |
| `~/.claude/agents/` | Specialist prompt library. Use as read-only guidance for Codex roles. |
| `~/.claude/skills/` | Legacy skill library. Convert individual skills before installing under `~/.codex/skills`. |

Do not import credentials, settings payloads, projects, tasks, sessions, session-env, logs, cache, paste-cache, shell-snapshots, file-history, telemetry, or tmp data by default.
