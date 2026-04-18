# Claude Compatibility Migration Map

Implemented now:

- `~/.codex/skills/claude-structure/` teaches Codex how to use existing Claude project docs, commands, rules, agents, and skills as legacy references.
- `~/.codex/AGENTS.md` links to that compatibility skill when a request mentions `.claude`, Claude commands, AIJOB state, or legacy Claude agents/skills.

Intentionally not imported:

- Credentials, tokens, session logs, task logs, project JSONL transcripts, cache, telemetry, paste cache, shell snapshots, file history, and temporary files.
- Raw Claude skills as Codex skills. They need per-skill conversion because many reference Claude-only tools and slash-command behavior.
- Raw Claude agents as Codex agents. Use Codex-native roles, and read Claude specialist profiles only as reference.

Recommended next conversions:

1. Convert only frequently used Claude skills into Codex skills one by one.
2. Add focused Codex prompts for high-value Claude specialists only when actually needed.
3. Keep `~/.claude/STATE.md`, `CONTEXT.md`, `TODO.md`, and `DECISIONS.md` as source of truth until a full migration is explicitly requested.
