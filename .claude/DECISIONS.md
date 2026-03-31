# Architecture Decisions

> 주요 아키텍처 결정 이력. AI가 "왜 이렇게 했는지" 파악할 때 참조.

---

## AD-001: Confluence Spec 업그레이드 — Tier 시스템 확장 + Jira 연동
- **일시**: 2026-03-31
- **결정**: 3-Tier 구조를 Confluence 문서 기준으로 확장. TODO.md(Hot), weekly.md+endpoints/(Warm), roadmap.md+runbooks/+integrations/(Cold) 추가. Jira REST API 연동(jira-lib.sh + /jira 커맨드) 도입.
- **이유**: 기존 AIJOB은 "기반 구조"(Tier 로딩 + 세션 정책)만 구현. Confluence 문서가 정의한 운영 수준(일일 TODO 관리, Jira 자동 전환, 4단 업무 흐름, endpoints 관리)과 갭 존재. 12+ 레포 횡단 작업 시 매번 컨텍스트 재설명하는 비용을 구조적으로 제거하기 위해 업그레이드.
- **상태**: 완료
- **참조**: Confluence "Infra: 개인 AI 업무환경 세팅 (AIJOB)", `docs/aijob-upgrade.md`

### 세부 결정

**AD-001-1: 파일 배치** — TODO.md, weekly.md, roadmap.md를 `.claude/` 루트에 배치
- STATE.md, CONTEXT.md와 동일 레벨. Tier 시스템이 로드 시점을 제어하므로 하위 디렉토리 불필요.
- 대안: `plans/` 디렉토리 하위 → 기존 패턴과 불일치, 접근 경로 길어짐.

**AD-001-2: endpoints/ 위치** — `.claude/endpoints/`에 배치
- work/와 동일 패턴 (Claude가 소비하는 메타데이터). 프로젝트 루트 오염 방지.
- 대안: 프로젝트 루트 → 앱 코드와 혼재, .gitignore 복잡도 증가.

**AD-001-3: Jira 연동 방식** — hook + command 이중 구조
- session-start.sh: 수동적 힌트 (동기화 제안만). 자동 수정 안 함 → 안전.
- /project:jira 커맨드: 능동적 동작 (실제 API 호출). 사용자 의도 명확할 때만.
- jira-lib.sh: 공통 함수 분리 → 중복 제거.
- 대안: hook에서 직접 TODO.md 수정 → 예기치 않은 파일 변경 위험.

**AD-001-4: 시크릿 관리** — Vault 우선 + 환경변수 폴백
- Confluence 스펙: "Vault 경로만". 현실: 개발 환경에 Vault 미설치 가능.
- `JIRA_API_TOKEN` 환경변수를 폴백으로 허용하되, jira-policy.md에서 운영 환경은 Vault 필수로 명시.

**AD-001-5: init 스크립트 전략** — 새 파일은 기존 패턴 따름
- 단일 파일(TODO.md 등): overwrite (템플릿이므로 항상 최신 유지)
- 디렉토리(endpoints/ 등): merge (기존 커스텀 내용 보존)
- 대안: 모두 merge → 템플릿 업데이트가 반영 안 됨.
