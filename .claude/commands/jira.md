# Jira 연동

Jira 티켓 조회, 상태 전환, TODO 동기화를 수행한다.

## 사용법
- `/project:jira sync` — 할당된 티켓을 TODO.md로 동기화
- `/project:jira status {KEY}` — 티켓 상태 조회
- `/project:jira transition {KEY} "{상태}"` — 상태 전환
- `/project:jira review {KEY} @{담당자}` — 리뷰 요청 (담당자 변경)

## 절차

### sync
1. `.claude/hooks/jira-lib.sh`의 `jira_get_my_issues` 호출
2. 결과를 `.claude/TODO.md` 테이블 포맷으로 변환
3. 기존 TODO.md의 캐리오버 카운트 확인 (3회 이상 → 경고 출력)
4. TODO.md 갱신 + 최종 업데이트 날짜 반영

### transition
1. `jira_transition {KEY} "{상태}"` 호출
2. 성공 시 TODO.md 상태 컬럼 갱신
3. "Done" 전환 시 → TODO에서 완료 섹션으로 이동

### review
1. Jira API로 assignee 변경
2. 코멘트 추가: "Review requested by {user}"
3. TODO.md에 리뷰 상태 반영

### status
1. `jira_api GET "/issue/{KEY}"` 호출
2. 상태, 담당자, 우선순위, 설명 요약 출력

## 자동 전환 시점
| 시점 | 동작 | Jira 상태 |
|------|------|----------|
| 아침 TODO 생성 | 오늘 업무 티켓 전환 | → Ready |
| 사용자가 업무 질문 | 키워드로 티켓 매핑 | → In Progress |
| 작업 완료 (/done) | TODO 삭제 직전 전환 | → Done |
| 리뷰 요청 | 담당자 변경 + 알림 | 담당자 → 리뷰어 |
| 리뷰 완료 | 담당자 복귀 + 전환 | → Done |

## 키워드 → 티켓 매핑
1. 티켓 키 직접 언급: "IW-10" → 즉시 매핑
2. 업무 키워드: "Slack 알람" → TODO 목록에서 매칭
3. 불확실 시 사용자에게 확인

## Vault 토큰 설정
Jira API 토큰은 Vault 경로 참조: `secret/data/jira/api-token`
Vault 미설치 시 `JIRA_API_TOKEN` 환경변수 폴백.
