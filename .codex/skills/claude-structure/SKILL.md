---
name: claude-structure
description: Use when the user asks Codex to use, migrate, adapt, inspect, or operate the local ~/.claude structure; when requests mention Claude commands such as /project:status, /project:done, /project:cleanup, Jira or Confluence hooks, AIJOB state, legacy .claude agents, .claude skills, or .claude rules; or when Codex needs to translate Claude Code project docs into Codex-compatible workflows without copying sessions, cache, logs, credentials, or file history.
---

# Claude Structure

Use the local `~/.claude` directory as a legacy operating knowledge base from Codex. Keep Codex-native behavior authoritative, and load Claude-era files only when they are relevant to the current task.

## Ground Rules

- Treat `~/.codex/AGENTS.md` and active system/developer instructions as higher priority than Claude-era guidance.
- Do not import or summarize secrets, credentials, auth tokens, session transcripts, cache, telemetry, shell snapshots, paste cache, file history, or project JSONL logs.
- Prefer Codex-native tools and OMX skills first. Use Claude files as policy, memory, templates, or reference material.
- Keep `.claude` as the source of truth unless the user explicitly asks for a full migration to `.codex`.

## Workflow

1. Read `~/.claude/CLAUDE.md` for global user preferences when the task references Claude structure.
2. Read only the needed hot context files: `STATE.md`, `CONTEXT.md`, `DECISIONS.md`, and `TODO.md`.
3. For operational or documentation-heavy work, load the relevant file from `~/.claude/rules/`, `work/`, `endpoints/`, or `integrations/`.
4. Translate Claude-specific tool names to Codex/OMX equivalents before acting.
5. Report which Claude source files informed the work when traceability matters.

## References

- `references/path-map.md`: path-by-path mapping from `~/.claude` to Codex usage.
- `references/command-map.md`: Codex equivalents for local Claude project commands.
- `references/project-doc-policy.md`: working rules distilled from `.claude/rules/*`.

Load references only as needed.

## Agent And Skill Mapping

- Use Codex roles in `~/.codex/prompts/` for standard work.
- Use `~/.claude/agents/*.md` as read-only specialist reference when no Codex-native role covers it.
- Do not spawn arbitrary legacy Claude agents. If delegation is needed, choose an available Codex role and include relevant Claude specialist guidance in the task brief.
- Do not copy raw `~/.claude/skills` into `~/.codex/skills` without conversion.

## Safety

- For data deletion or destructive infrastructure changes, apply `~/.claude/rules/no-delete-policy.md` plus Codex sandbox approval rules.
- For Jira or Confluence actions, prefer Paperclip when the project has already migrated.
- Never print token values; use token paths or environment variable names only.
