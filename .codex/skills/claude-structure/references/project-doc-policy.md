# Project Documentation Policy

Distilled from `~/.claude/rules/`.

## Hot Context

For Claude-compatible project work, load only the needed files from `CLAUDE.md`, `STATE.md`, `CONTEXT.md`, `DECISIONS.md`, and `TODO.md`.

## Work Log Threshold

Write work logs only for M+ work: multi-file or cross-system changes, architecture decisions, external dependency additions, or meaningful tradeoffs. Do not log simple bug fixes, style changes, routine version updates, or facts recoverable from git.

## Work Log Template

```markdown
## YYYY-MM-DD: 작업 제목 [done|in-progress|blocked]
- **What**: 한 줄 변경 요약
- **Why**: 결정 이유
- **Impact**: 영향 범위
- **Test**: 통과/실패 요약 + 커버 못하는 영역
- **Trap**: 시도→실패→해결 (30분 이상 삽질한 것만)
- **Next**: 다음 단계 또는 블로커
- **[DEBT]**: 수용한 기술 부채
---
```

Omit optional fields when they do not apply.

## Endpoint Changes

Update `~/.claude/endpoints/` when repos, sites, API URLs, ports, auth mode, or service status changes. Record auth method only, never token values.

## Data Deletion Safety

Treat unknown environments as production. Never run direct destructive production operations such as `DROP`, `TRUNCATE`, unscoped `DELETE`, Redis flushes, `rm -rf` on data directories, stateful `terraform destroy`, or PVC/PV/namespace deletion without the full approval workflow.
