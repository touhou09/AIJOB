# Claude Project Command Map

## `/project:status`

Read `~/.claude/STATE.md`, scan `~/.claude/work/*.md` for unfinished or blocked entries, read recent `~/.claude/DECISIONS.md`, check work-file line counts, and return a compact status table.

## `/project:done`

Inspect current changes and verification evidence. Skip documentation for simple S-size work. For M+ work, append a concise entry to the fitting `~/.claude/work/{category}.md` using `project-doc-policy.md`; update `STATE.md` only if operational state changed.

## `/project:cleanup`

Count lines in `~/.claude/work/*.md`. For files over 150 lines, remove completed entries that are obvious from code or git history, move still-relevant decisions to `DECISIONS.md`, preserve unfinished or blocked entries, and report before/after counts.

## `/project:jira ...`

Read `~/.claude/integrations/jira.md` and the requested command file. Prefer Paperclip if project state says Jira was replaced. If Jira is required, inspect hooks before running and never print token values.

## `/project:init-project`

Create Codex-native project guidance first. Preserve Claude compatibility files only when explicitly useful: `CONTEXT.md`, `STATE.md`, `TODO.md`, `DECISIONS.md`, and `work/`.
