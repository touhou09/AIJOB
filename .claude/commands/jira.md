# Jira 연동

Jira 티켓 조회, 생성, 상태 전환, TODO 동기화를 수행한다.
API 상세는 `.claude/integrations/jira.md` 참조.
대상 프로젝트: **IW만**.

## 사용법
- `/project:jira sync` — Jira → TODO.md 자동 동기화
- `/project:jira status {KEY}` — 티켓 상태 조회
- `/project:jira transition {KEY} "{상태}"` — 상태 전환
- `/project:jira review {KEY}` — 리뷰 요청 (Review 전환 + 담당자 → reporter)
- `/project:jira create {type} "{제목}"` — 티켓 생성 (task/story/bug/epic)
- `/project:jira subtask {PARENT-KEY} "{제목}"` — Sub-task 생성
- `/project:jira comment {KEY} "{내용}"` — 코멘트 추가

## 절차

### sync
`bash $HOME/.claude/hooks/jira-sync.sh` 실행.
JQL: `project = IW AND assignee=currentUser() AND status != Done`

### status
```bash
source $HOME/.claude/hooks/jira-lib.sh
jira_api GET "/issue/{KEY}" | jq '{key: .key, summary: .fields.summary, status: .fields.status.name, assignee: .fields.assignee.displayName, priority: .fields.priority.name}'
```

### transition
```bash
source $HOME/.claude/hooks/jira-lib.sh
jira_transition "{KEY}" "{상태명}"
```

### review
```bash
source $HOME/.claude/hooks/jira-lib.sh
REPORTER_ID=$(jira_api GET "/issue/{KEY}?fields=reporter" | jq -r '.fields.reporter.accountId')
jira_transition "{KEY}" "Review"
jira_change_assignee "{KEY}" "$REPORTER_ID"
```

### create — 사전 질문 플로우

**IMPORTANT: 티켓 생성 전 반드시 아래 질문을 사용자에게 확인한다. API 호출 전에 모든 항목을 채운다.**

사용자가 "티켓 만들어", "이슈 생성해" 등 요청 시:

**1단계 — 기본 정보 확인:**
| 질문 | 선택지 | 기본값 |
|------|--------|--------|
| 이슈 유형? | task / story / bug / epic | task |
| 부모 티켓이 있나요? (Sub-task인 경우) | 없음 / {IW-XX} | 없음 |
| 담당자? | 본인 / {이름} | 본인 |
| 우선순위? | Highest / High / Medium / Low / Lowest | Medium |

**2단계 — 본문 정보 (Sub-task가 아닌 경우):**
| 질문 | 설명 |
|------|------|
| 배경 | 왜 이 작업이 필요한지 (한두 줄) |
| 포함 범위 | 이 티켓에서 다루는 것 |
| 제외 범위 | 이 티켓에서 다루지 않는 것 |
| 완료 조건 | 무엇이 되면 끝인지 (여러 개 가능) |
| 참고 (선택) | 관련 문서, 레포, endpoints 등 |

**3단계 — 확인 후 생성:**
- 수집한 정보를 테이블로 요약해서 보여준다
- 사용자 승인 후 API 호출

사용자가 한 번에 정보를 충분히 줬으면 빠진 항목만 질문한다. 모든 항목을 기계적으로 묻지 않는다.

```bash
source $HOME/.claude/hooks/jira-lib.sh
# 부모 티켓 없는 경우
jira_create_issue "{type}" "{제목}" "{배경}" "{포함 범위}" "{제외 범위}" "{완료조건1|완료조건2}" "{참고}"
# 생성 후 담당자 변경 (본인이 아닌 경우)
jira_change_assignee "{KEY}" "{account_id}"
```

**티켓 본문 템플릿** (자동 적용):
```
### 배경
{왜 이 작업이 필요한지}

### 범위
- 포함: {이 티켓에서 다루는 것}
- 제외: {이 티켓에서 다루지 않는 것}

### 완료 조건
- {조건1}
- {조건2}

### 참고 (선택)
- {관련 문서, 레포, endpoints 등}
```

### subtask
```bash
source $HOME/.claude/hooks/jira-lib.sh
jira_create_subtask "{PARENT-KEY}" "{제목}"
```
Sub-task는 제목만. 상세 설명은 부모 티켓에서 참조.
부모 티켓 확인 질문에서 키가 주어지면 subtask로 자동 전환.

### comment
```bash
source $HOME/.claude/hooks/jira-lib.sh
jira_add_comment "{KEY}" "{내용}"
```

## 자동 전환 시점
| 시점 | 동작 | Jira 상태 |
|------|------|----------|
| 세션 시작 | jira-sync.sh 자동 실행 (하루 1회) | TODO.md 갱신 |
| 사용자가 업무 질문 | 키워드로 티켓 매핑 | → In Progress |
| 작업 완료 (Stop hook) | 본인 생성 → Done / 외부 할당 → Review + 담당자 → reporter | 자동 |

## 토큰 설정
`~/.claude/.atlassian-token` 파일에 토큰 한 줄 저장 (권한 600).
파일 없으면 `JIRA_API_TOKEN` 환경변수, 그 다음 Vault 순서로 폴백.
