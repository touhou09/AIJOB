# Jira 연동 가이드

## 접속 정보
| 항목 | 값 |
|------|---|
| Base URL | `https://ingkle.atlassian.net` |
| 인증 | Basic Auth (email:token → base64) |
| 사용자 | `seungju.yu@ingkle.com` |
| 토큰 파일 | `~/.claude/.atlassian-token` (로컬 전용, 커밋 금지) |
| 토큰 폴백 | 환경변수 `JIRA_API_TOKEN` |

## API 패턴

### 티켓 검색 (v3 — POST 필수)
```bash
curl -s -X POST \
  -H "Authorization: Basic $(printf '%s:%s' "$JIRA_USER" "$(cat ~/.claude/.atlassian-token)" | base64)" \
  -H "Content-Type: application/json" \
  -d '{"jql":"assignee=currentUser() AND status != Done ORDER BY priority DESC","fields":["key","summary","priority","status"],"maxResults":20}' \
  "https://ingkle.atlassian.net/rest/api/3/search/jql"
```
> GET /rest/api/3/search는 deprecated. 반드시 POST /rest/api/3/search/jql 사용.

### 티켓 상세 조회
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/rest/api/3/issue/{KEY}"
```

### 상태 전환
```bash
# 1. 가능한 전환 목록 조회
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/rest/api/3/issue/{KEY}/transitions"

# 2. 전환 실행
curl -s -X POST -H "Authorization: Basic $AUTH" -H "Content-Type: application/json" \
  -d '{"transition":{"id":"TRANSITION_ID"}}' \
  "https://ingkle.atlassian.net/rest/api/3/issue/{KEY}/transitions"
```

## 자동화 스크립트
| 스크립트 | 역할 |
|---------|------|
| `hooks/jira-lib.sh` | 공통 함수 (인증, API 호출, 전환) |
| `hooks/jira-sync.sh` | Jira → TODO.md 자동 동기화 |

## 프로젝트
| 키 | 이름 | 용도 |
|----|------|------|
| IW | Infra Work | 인프라 업무 |
| MICO | MICO | 제품 개발 |

## 주의사항
- 토큰을 코드/커밋/로그에 절대 기록 금지
- `~/.claude/.atlassian-token` 파일 권한 600
