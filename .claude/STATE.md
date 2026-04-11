# 현재 프로젝트 상태

> 최종 업데이트: 2026-04-11

## 현재 상태
- Hermes v0.8.0 + Paperclip + **7개 에이전트** 정상 가동 (CTO 신규 추가)
- **Agent Harness 구조 적용**: AIJOB = 템플릿 레포, `~/.hermes/profiles/{p}/` = 런타임 (단방향 sync)
- 7개 프로필 전부 SOUL + AGENTS.md + rules/ + STATE/CONTEXT/DECISIONS 배포 완료
- **CTO 리뷰 레이어 구축 완료**: engineer 완료 → in_review → team-cto 자동 핸드오프 → 10개 체크리스트 기반 리뷰 → PASS/CHANGES_REQUESTED/BLOCKED (DOR-16 E2E 검증 완료)
- Orchestrator 자율 분해/분배 E2E 검증 완료 (DOR-6 → DOR-8/9/10, DOR-5 → DOR-13/14/15)
- backend만 Slack 연결, 나머지 6개는 cron/heartbeat 전용 (Socket Mode 충돌 해결)
- Hermes 모니터 수집기 + launchd plist 예제가 저장소에 정착, 스냅샷에 Slack 배달 결과까지 기록
- `/hermes-status` 조회 인터페이스 추가: 캐시 재사용 + stale 시 live refresh + agent/profile별 통합 요약 지원
- [auto] `/hermes-status`가 Paperclip project별 open/done/blocked/recent KPI를 표시하고 `--project` 필터로 워크스트림 단위 조회를 지원
- Paperclip 외부 접속 정상화 (cloudflared 커넥터 단일화)
- Paperclip project 3종(`AIJOB`, `Hermes Infra`, `AivaLink`) 생성 완료, 기존 DOR 이슈 projectId backfill 및 생성 규칙 반영 완료

## 인프라 현황

| 컴포넌트 | 상태 | 비고 |
|---------|------|------|
| Hermes Agent v0.8.0 | 실행 중 | 6개 프로필 활성 |
| Hermes Gateway (6개) | 실행 중 | backend=Slack+cron, 나머지=cron만 |
| Paperclip 2026.403.0 | 실행 중 | https://paperclip.dororong.dev |
| Cloudflare Tunnel | 실행 중 | 단일 커넥터 (root launchd) |
| Memvid MCP | 연결됨 | Hermes config에서 관리 |
| LLM Wiki | 초기화 완료 | ~/wiki (SCHEMA+index+log) |
| OpenClaw | 아카이브 | ~/.openclaw.pre-migration |

## Agent Harness 구조

```
AIJOB/.claude/                         ← 템플릿 (git, source of truth)
├── rules/*.md                          ← 9종 공통 규정
├── profiles/
│   ├── _common/AGENTS.md.part          ← 공통 헤더
│   ├── orchestrator/                   ← SOUL + AGENTS.md.part + 3 templates
│   └── backend/frontend/qa/devops/data/
└── hooks/hermes-profile-sync.sh        ← 단방향 배포

~/.hermes/profiles/{p}/                 ← 런타임 (sync 결과물)
├── SOUL.md                             ← 덮어쓰기
├── AGENTS.md                           ← _common + profile merge + {profile} 치환
├── rules/*.md                          ← 프로필별 복제
├── STATE.md CONTEXT.md DECISIONS.md    ← 최초만 template 복사, 이후 런타임 편집 보존
└── workspace/                          ← adapterConfig.cwd
```

## Paperclip 에이전트 adapterConfig

| 에이전트 | role | 모델 | cwd |
|---------|------|------|-----|
| orchestrator | ceo | gpt-5.4 | `~/.hermes/profiles/orchestrator/workspace` |
| team-cto | cto | gpt-5.4 (reasoning: high) | `~/.hermes/profiles/cto/workspace` |
| team-backend | engineer | gpt-5.4 | `~/.hermes/profiles/backend/workspace` |
| team-frontend | engineer | gpt-5.4 | `~/.hermes/profiles/frontend/workspace` |
| team-qa | qa | gpt-5.4 | `~/.hermes/profiles/qa/workspace` |
| team-devops | devops | gpt-5.4 | `~/.hermes/profiles/devops/workspace` |
| team-data | researcher | gpt-5.4 | `~/.hermes/profiles/data/workspace` |

## Cron Jobs (backend 프로필만)

| Job | 스케줄 | Slack 채널 |
|-----|--------|-----------|
| hermes-updates | 매일 9AM KST | C0AQVFM1K1Q |
| noon-ib-wsj | 매일 12PM KST | C0AQVFM1K1Q |

## Paperclip Projects

| 이름 | urlKey | 범위 |
|------|--------|------|
| AIJOB | `aijob` | 템플릿 / 운영 규정 / agent harness / Paperclip 운영 체계 자체 변경 |
| Hermes Infra | `hermes-infra` | gateway, Paperclip, 모니터링, `/hermes-status`, 런타임 운영 변경 |
| AivaLink | `aivalink` | AivaLink 제품 기능 / API / UI / E2E |

## 활성 이슈 (2026-04-11 09:30 KST 기준)

| 이슈 | 프로젝트 | 상태 | 담당 | 비고 |
|------|---------|------|------|------|
| DOR-5 | hermes-infra | in_review | user | CTO 리뷰 후 user 반려 상태, DOR-17에서 설계 재검토 중 |
| DOR-17 | hermes-infra | todo | orchestrator | DOR-5 설계 기대치 gap 수집 (사용자 구조 피드백 대기) |

완료: DOR-13/14/15 (monitor 구축), DOR-18/19/20 (Paperclip projects 도입 + backfill + `/hermes-status --project` 필터), 기존 DOR-6/8/9/10/16 등 harness E2E.

## 알려진 이슈
- Paperclip 서버가 `adapterConfig.cwd`를 확인 않고 fallback workspace warning 출력 — adapter 자체는 config.cwd 우선이지만 실제 Hermes subprocess cwd 검증 필요
- Slack 봇 1개로 멀티 게이트웨이 불가 — 채널 분리 시 별도 앱 필요
- engineer가 `in_review` 전환 시 `assigneeAgentId`를 비우고 `assigneeUserId`에 사용자를 남기는 경우 발생 — CTO 픽업 실패로 orphan. DOR-13/14/15에서 재현 확인, 수동 재할당으로 복구.
- `scripts/hermes_monitor.py::parse_profiles()` 첫 글자 whitelist로 인한 프로필 누락 버그 — 알파벳 검사로 교체 (같은 버그를 DOR-5에서 backend 에이전트도 독립 수정 중)

## 다음 작업
1. DOR-17 (DOR-5 설계 재검토): 사용자가 기대한 모니터링 구조 항목화 → gap 리스트 → 수용/변경/기각 분류
2. RFC paperclipai/paperclip#175 `worktreeIsolation` 머지 감시 + `hermes-paperclip-adapter` 업그레이드 추적
3. Paperclip project별 `workspaceStrategy.provisionCommand` 설정 검토 (per-이슈 worktree 초기화)
4. in_review 전환 시 assignee 누락 방지 — engineer SOUL.md 또는 paperclip-policy에 체크 추가
5. 코멘트 트리거 테스트 (done 이슈에 질문 코멘트 → wake 확인)
6. 기존 레거시 `AIJOB/profiles/` 삭제
7. init-mac.sh / init-linux.sh 에 Hermes 세팅 섹션 추가
8. OpenClaw 완전 제거 판단
