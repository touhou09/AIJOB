# AIJOB Confluence Spec 업그레이드

> 2026-03-31 | Confluence 문서 "Infra: 개인 AI 업무환경 세팅" 기준 정합

## 1. 왜 업그레이드했는가

기존 AIJOB은 Tier 로딩, 세션 정책, 문서화 정책의 **기반 구조**만 갖추고 있었다.
Confluence 문서가 정의한 **운영 수준** — TODO 기반 일일관리, Jira 자동 전환, 4단 업무 흐름, endpoints 관리 — 이 구현되지 않아 실제 업무에서 매 세션마다 컨텍스트를 수동으로 재설명해야 했다.

## 2. 무엇이 바뀌었는가

### 2.1 Tier 시스템 확장

| Before | After |
|--------|-------|
| Hot: CLAUDE.md + STATE.md | Hot: CLAUDE.md + STATE.md + **TODO.md** |
| Warm: CONTEXT.md + DECISIONS.md | Warm: CONTEXT.md + DECISIONS.md + **endpoints/** + **weekly.md** |
| Cold: work/{category}.md | Cold: **roadmap.md** + **runbooks/** + **integrations/** + work/{category}.md |

**왜 이 구조인가**: Tier는 로드 빈도를 결정한다. TODO는 매일 바뀌므로 Hot, weekly/endpoints는 주 단위로 참조하므로 Warm, roadmap/runbooks는 분기 단위이므로 Cold. work/는 기존과 동일하게 유지 (작업 카테고리별 이력은 Tier와 직교).

### 2.2 4단 업무 흐름

```
Jira(원본) → roadmap(분기) → weekly(주간) → TODO(일일)
완료 → TODO 삭제 → roadmap 체크
```

**핵심 규칙**: Jira가 유일한 원본. 역방향 흐름 금지. 이중 관리 금지.

### 2.3 Jira 연동

| 컴포넌트 | 역할 |
|----------|------|
| `hooks/jira-lib.sh` | REST API 공통 함수 (인증, 전환, 조회) |
| `commands/jira.md` | `/project:jira` 커맨드 (sync, transition, review, status) |
| `rules/jira-policy.md` | 운영 규칙 (캐리오버 3회 재검토, Vault 필수 등) |

**자동 전환 6개 시점**: 아침 TODO 생성(→Ready), 업무 질문(→In Progress), 작업 완료(→Done), 리뷰 요청(담당자 변경), 리뷰 완료(→Done), 블로커(→Blocked).

**시크릿**: Vault 경로(`secret/data/jira/api-token`) 우선, `JIRA_API_TOKEN` 환경변수 폴백.

### 2.4 endpoints/ 관리

`endpoints/repos.md`에 저장소 목록, 로컬 경로, URL, 상태(active/deprecated/archived)를 관리한다.
레포/사이트/엔드포인트 변경 시 즉시 업데이트 트리거 (`rules/endpoint-policy.md` 참조).

## 3. 새로 추가된 파일

```
.claude/
├── TODO.md                    # [NEW] 일일 작업 (Jira 동기화)
├── weekly.md                  # [NEW] 주간 계획
├── roadmap.md                 # [NEW] 분기 로드맵
├── endpoints/
│   └── repos.md               # [NEW] 저장소/엔드포인트 관리
├── runbooks/.gitkeep          # [NEW] 운영 런북 디렉토리
├── integrations/.gitkeep      # [NEW] 외부 연동 디렉토리
├── hooks/
│   └── jira-lib.sh            # [NEW] Jira REST API 공통 함수
├── commands/
│   └── jira.md                # [NEW] /project:jira 커맨드
└── rules/
    ├── jira-policy.md         # [NEW] Jira 운영 규칙
    └── endpoint-policy.md     # [NEW] endpoints 관리 규칙
```

## 4. 수정된 파일

| 파일 | 변경 요약 |
|------|----------|
| `CLAUDE.md` | Tier 테이블 확장, 업무 흐름 섹션, 핵심 규칙, 보안규칙 Vault 참조 |
| `hooks/session-start.sh` | TODO.md 로딩 + Jira 동기화 힌트 (하루 1회) |
| `rules/session-policy.md` | 세션 시작에 TODO.md 단계 삽입 |
| `rules/templates.md` | TODO/weekly/roadmap/endpoints 템플릿 추가 |
| `rules/documentation-policy.md` | endpoints/runbooks/integrations 분류 추가 |
| `commands/done.md` | Step 4.5 Jira 상태 전환 추가 |
| `init-mac.sh` / `init-linux.sh` | 새 파일 overwrite/merge + 완료 메시지 |
| `settings.json` | `vault` 권한 추가 |
| `DECISIONS.md` | AD-001 기록 |

## 5. 사용법

### Jira 동기화
```bash
# 세션 시작 시 자동 힌트 출력 → 아래 실행
/project:jira sync
```

### 엔드포인트 관리
`.claude/endpoints/repos.md`에 저장소 추가/수정 후 상태 컬럼과 변경 이력 갱신.

### init 스크립트
```bash
# 전역 설정 (모든 새 파일 포함)
bash init-mac.sh

# 프로젝트별 설정
bash init-mac.sh ~/projects/my-app work
```

## 6. 아키텍처 결정

상세 결정 사항은 `.claude/DECISIONS.md` AD-001 참조.
