# Jira 연동

Jira 티켓 조회, 생성, 상태 전환, TODO 동기화를 수행한다.
API 상세는 `.claude/integrations/jira.md` 참조.
대상 프로젝트: **IW만**.

## 사용법
- `/project:jira sync` — Jira → TODO.md 자동 동기화
- `/project:jira status {KEY}` — 티켓 상태 조회
- `/project:jira transition {KEY} "{상태}"` — 상태 전환
- `/project:jira review {KEY}` — 리뷰 요청
- `/project:jira create` — 티켓 생성 (대화형)
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

### create — 대화형 티켓 생성

**IMPORTANT: 티켓 생성 전 반드시 사용자에게 확인받는다. 정보가 부족하면 질문한다.**

사용자가 "티켓 만들어" 등 요청 시 아래 순서로 진행:

**질문 1 — 뭘 하려는 건지:**
사용자 설명을 듣고 Claude가 아래를 판단한다:
- **제목**: 한 줄 요약
- **유형**: 아래 기준으로 자동 선택 (사용자에게 확인)

| 유형 | 기준 | 예시 |
|------|------|------|
| Task | 일반 작업, 설정, 연동, 배포 등 | "Slack 웹훅 연동", "Claude 환경 세팅" |
| Story | 규모 있는 기능 개발, 인프라 구축 | "CI/CD 파이프라인 구축", "클러스터 테스트" |
| Bug | 장애, 오류, 기존 기능 안 되는 것 | "VPN 접속 불가", "API 500 에러" |

**질문 2 — 부모 티켓:**
> "기존 티켓의 하위 작업인가요? (예: IW-XX의 Sub-task)"
- 예 → Sub-task로 생성 (제목만, 본문 없음)
- 아니오 → 독립 티켓으로 진행

**질문 3 — 본문 (Sub-task가 아닌 경우):**
사용자 설명에서 아래를 추출하고, 빠진 항목만 추가 질문:
- 배경: 왜 필요한지
- 포함 범위 / 제외 범위
- 완료 조건
- 참고 (선택)

**질문 4 — 최종 확인:**
수집한 정보를 요약해서 보여주고 "이대로 생성할까요?" 확인 후 API 호출.

```bash
source $HOME/.claude/hooks/jira-lib.sh
# 독립 티켓
jira_create_issue "{type}" "{제목}" "{배경}" "{포함}" "{제외}" "{완료조건1|완료조건2}" "{참고}" "{우선순위}"
# Sub-task
jira_create_subtask "{PARENT-KEY}" "{제목}"
# 담당자 변경 (본인 외)
jira_change_assignee "{KEY}" "{account_id}"
```

### comment
코멘트는 티켓 생성과 별개로 독립 실행.
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
