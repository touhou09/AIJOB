# Architecture Decisions

> 주요 아키텍처 결정 이력.

---

## AD-001: OpenClaw → Hermes Agent + Paperclip 전환
- **일시**: 2026-04-08
- **결정**: OpenClaw를 폐기하고 Hermes Agent v0.8.0 + Paperclip으로 전환
- **이유**: Hermes가 프로필/게이트웨이/cron/메모리를 네이티브 지원, Paperclip이 에이전트 오케스트레이션 제공
- **상태**: 완료
- **참조**: ~/.openclaw.pre-migration, ~/.hermes/config.yaml

## AD-002: Jira → Paperclip 이슈 시스템 전환
- **일시**: 2026-04-09
- **결정**: hermes 브랜치에서 Jira를 제거하고 Paperclip 이슈 시스템(DOR-xxx)으로 대체
- **이유**: Paperclip이 에이전트와 네이티브 통합, 이중 관리 제거. Jira는 work 브랜치에서만 유지.
- **상태**: 진행 중
- **참조**: https://paperclip.dororong.dev

## AD-003: Confluence → LLM Wiki (Obsidian + Memvid) 전환
- **일시**: 2026-04-09
- **결정**: Confluence KB를 LLM Wiki 패턴(Karpathy)으로 전환. Obsidian Vault + Memvid MCP 병행.
- **이유**: 로컬 마크다운 기반으로 에이전트가 직접 읽기/쓰기 가능. Memvid로 시맨틱 검색, Obsidian으로 구조화 브라우징.
- **상태**: 계획
- **참조**: ~/.hermes/skills/research/llm-wiki/SKILL.md
