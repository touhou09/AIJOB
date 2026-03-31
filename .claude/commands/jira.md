# Jira 연동

Jira 티켓 조회, 상태 전환, TODO 동기화를 수행한다.
API 상세는 `.claude/integrations/jira.md` 참조.

## 사용법
- `/project:jira sync` — Jira → TODO.md 자동 동기화
- `/project:jira status {KEY}` — 티켓 상태 조회
- `/project:jira transition {KEY} "{상태}"` — 상태 전환
- `/project:jira review {KEY} @{담당자}` — 리뷰 요청

## 절차

### sync
`bash .claude/hooks/jira-sync.sh` 실행.
내부적으로 Jira REST API(`POST /rest/api/3/search/jql`)로 내 미완료 티켓을 조회하고 TODO.md를 갱신한다.
캐리오버 카운트도 자동 추적 (3회 이상이면 경고).

### status
```bash
source .claude/hooks/jira-lib.sh
jira_api GET "/issue/{KEY}" | jq '{key: .key, summary: .fields.summary, status: .fields.status.name, assignee: .fields.assignee.displayName, priority: .fields.priority.name}'
```

### transition
```bash
source .claude/hooks/jira-lib.sh
jira_transition "{KEY}" "{상태명}"
```
성공 시 TODO.md 상태 컬럼도 갱신.

### review
```bash
source .claude/hooks/jira-lib.sh
# 담당자 변경
jira_change_assignee "{KEY}" "{account_id}"
# 코멘트 추가
jira_api POST "/issue/{KEY}/comment" '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Review requested"}]}]}}'
```

## Confluence 문서 읽기
```bash
source .claude/hooks/confluence-lib.sh
confluence_fetch_page {PAGE_ID}
```
상세는 `.claude/integrations/confluence.md` 참조.

## 자동 전환 시점
| 시점 | 동작 | Jira 상태 |
|------|------|----------|
| 세션 시작 | jira-sync.sh 자동 실행 (하루 1회) | TODO.md 갱신 |
| 사용자가 업무 질문 | 키워드로 티켓 매핑 | → In Progress |
| 작업 완료 (/done) | TODO 삭제 직전 전환 | → Done |
| 리뷰 요청 | 담당자 변경 + 알림 | 담당자 → 리뷰어 |

## 토큰 설정
`~/.claude/.atlassian-token` 파일에 토큰 한 줄 저장 (권한 600).
파일 없으면 `JIRA_API_TOKEN` 환경변수, 그 다음 Vault 순서로 폴백.
