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

## AD-005: CTO 리뷰 레이어 추가 (ChatDev 7-role 차용)
- **일시**: 2026-04-10
- **결정**:
  1. 7번째 프로필 `team-cto` 추가 (role=cto in Paperclip enum)
  2. engineer 구현 완료 시 `in_review` + team-cto 재할당 필수 (team-qa 제외)
  3. CTO 리뷰 체크리스트 10개 항목 (`rules/cto-review-checklist.md`)
  4. 보안 위반은 무조건 BLOCKED + orchestrator 에스컬레이션
  5. HubSpot judge 원칙: 피드백 self-evaluate (구체성/실제 문제/수정 가능성)
  6. 모델: gpt-5.4 + `agent.reasoning_effort: high` (config.yaml에 설정, extraArgs 금지)
- **이유**: 기존 구조에 코드/아키텍처 리뷰어 부재. team-qa는 기능 테스트만 수행. ChatDev 7-role + Paperclip 공식 CTO 워크플로우 + Anthropic specialist dispatch 패턴을 참고하여 CEO(orchestrator)/CTO(team-cto)/Engineer 책임 분리
- **상태**: 완료 (DOR-16 E2E 검증 완료)
- **참조**: `.claude/profiles/cto/`, `.claude/rules/cto-review-checklist.md`, `.claude/rules/paperclip-policy.md` "CTO 리뷰 핸드오프" 섹션, work/hermes-infra.md (2026-04-10 CTO 항목)

## AD-004: Agent Harness 구조 — AIJOB 템플릿 + sync 배포 + AGENTS.md 단일 엔트리
- **일시**: 2026-04-10
- **결정**:
  1. AIJOB은 단순 템플릿 레포. 런타임은 ~/.hermes/profiles/{p}/ 에서 완결.
  2. `.claude/rules/*.md`로 규정 모듈 분리 + `profiles/_common/AGENTS.md.part` + 프로필별 `AGENTS.md.part` merge → 런타임에 AGENTS.md 하나로 배포.
  3. rules/*.md는 Hermes가 자동 로드 못 하므로 AGENTS.md의 "cat 지시"로 runtime 로드.
  4. STATE.md/CONTEXT.md/DECISIONS.md는 동적 파일이라 AGENTS.md에 merge하지 않고 cat으로 매 run 로드. 런타임 편집 보존.
  5. sync 스크립트는 단방향(AIJOB→~/.hermes), SOUL/AGENTS/rules는 덮어쓰기, STATE/CONTEXT/DECISIONS는 없을 때만 template 복사.
  6. Paperclip adapter promptTemplate은 건드리지 않음 (adapter 업데이트 호환).
- **이유**: 회사 Claude Code의 `CLAUDE.md + rules/ + STATE` 패턴을 codex 기반 Hermes에 이식. 2026년 agent harness 업계 표준(OpenHarness, everything-claude-code, AGENTS.md 오픈 표준)과 일치. Hermes는 cwd의 AGENTS.md 하나만 자동 로드하므로 이 제약에 맞춰 구조화.
- **상태**: 완료 (orchestrator E2E 검증 완료, 나머지 프로필 재검증 필요)
- **참조**: `.claude/hooks/hermes-profile-sync.sh`, `.claude/profiles/`, work/hermes-infra.md (2026-04-10 항목)

## AD-006: 단일 company 유지 + projectId 워크스트림 분리
- **일시**: 2026-04-11
- **결정**: Paperclip company `dororong`은 유지하고, 워크스트림 구분은 company 분리 대신 projectId로 강제한다. 기본 taxonomy는 `AIJOB(aijob)`, `Hermes Infra(hermes-infra)`, `AivaLink(aivalink)` 3개로 시작한다.
- **이유**: issuePrefix/issueCounter가 company 단위로 고정되어 복수 company 분리는 에이전트/토큰/운영 설정 복제를 유발한다. 단일 company 아래 projectId를 필수화하면 기존 DOR 키를 유지하면서도 필터링/집계/리드 관리가 가능하다.
- **상태**: 완료
- **참조**: `.claude/rules/paperclip-policy.md`, `.claude/integrations/paperclip.md`, `DOR-18`, `DOR-19`
