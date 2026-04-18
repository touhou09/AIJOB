# AIJOB Codex Branch

This branch manages the Codex-compatible layer for the AIJOB environment.

## Scope

- Keep Claude-era project knowledge in `.claude/`.
- Keep Codex-specific guidance, skills, and compatibility docs in `.codex/`.
- Use `AGENTS.md` as the Codex entry point for this branch.
- Do not commit credentials, local sessions, cache, telemetry, paste cache, shell snapshots, or file history.

## Operating Contract

- Respond in Korean unless the user asks otherwise.
- Prefer concise, concrete status updates.
- Treat `.claude/CLAUDE.md`, `.claude/STATE.md`, `.claude/CONTEXT.md`, `.claude/DECISIONS.md`, `.claude/TODO.md`, `.claude/rules/`, `.claude/work/`, `.claude/endpoints/`, and `.claude/integrations/` as legacy project knowledge.
- Use `.codex/skills/claude-structure/SKILL.md` when a task references local `.claude`, Claude commands, AIJOB state, legacy Claude agents, or legacy Claude skills.
- Prefer Codex/OMX-native roles and skills. Use `.claude/agents` and `.claude/skills` only as read-only reference unless explicitly migrating one item.

## Install

Global setup:

```bash
./init-mac.sh "" codex
```

Project setup:

```bash
./init-mac.sh /path/to/project codex
```

Linux uses `init-linux.sh` with the same arguments.

## Safety

- Never import `.claude/.credentials.json`, `.claude/projects/`, `.claude/tasks/`, `.claude/sessions/`, `.claude/session-env/`, `.claude/cache/`, `.claude/paste-cache/`, `.claude/shell-snapshots/`, `.claude/file-history/`, or `.claude/telemetry/`.
- For destructive data or infrastructure operations, apply `.claude/rules/no-delete-policy.md` plus Codex approval rules.
