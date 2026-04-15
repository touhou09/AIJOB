# AIJOB 가이드

AI 협업 구조(.claude) 관리 레포. 브랜치별 프로필(master/personal/work)로 Claude Code 환경을 세팅한다.

## 컨텍스트 로딩

| Tier | 파일 | 단위 | 로드 시점 | 완료 시 |
|------|------|------|----------|--------|
| 1 (Hot) | 이 파일 + `STATE.md` + `TODO.md` + `CONTEXT.md` + `DECISIONS.md` | 일일 | 매 세션 자동 | 갱신 |
| 2 (Warm) | `endpoints/` + `weekly/{YYYY-Www}.md` | 주간 | 작업 시작 시 | 갱신 |
| 3 (Cold) | `roadmap/{YYYY-Qn}.md` + `runbooks/` + `integrations/` + `work/{category}.md` | 분기 | 해당 작업 시 | 완료 체크 |

## Jira 상태 흐름
```
Inbox → Ready → To Do(In Progress) → Review ←→ Ready (핑퐁) → Done
```

## 문서 흐름
```
TODO.md (일일) → work/ (주간) → docs/ (장기)
                              → DECISIONS.md (결정 사항)
```

## 세션 시작
1. STATE.md 읽고 현재 상태 파악
2. CONTEXT.md, DECISIONS.md 읽고 프로젝트 컨텍스트 + 결정 이력 파악
3. TODO.md 읽고 오늘의 작업 확인
4. 사용자 요청에 해당하는 work/ 파일 로드

## 작업 카테고리 인덱스

| 카테고리 | 파일 | 범위 |
|----------|------|------|
| 트러블슈팅 | `.claude/work/troubleshooting.md` | 장애, 버그, 예기치 않은 이슈 |
| Hermes 인프라 (구) | `.claude/work/hermes-infra.md` | v1 하네스 + CTO 루프 이력 (deprecated, 정리 예정) |
| Harness v2 | `.claude/work/harness-v2.md` | 7-agent 파이프라인 (CEO/Planner/Inspector/Coder/QA/DevOps/Monitor) |

> 새 작업 계열 발생 시 카테고리 자동 추가

## 핵심 명령어
- `init-mac.sh [target] [branch]` — macOS에서 Claude Code 환경 복제
- `init-linux.sh [target] [branch]` — Linux/WSL에서 Claude Code 환경 복제
- 경로 생략 시 전역(~/.claude/) 세팅

## 핵심 규칙
- Jira가 원본 (이중 관리 금지)
- 문서 먼저, 작업은 이후
- TODO에 Jira 티켓 없으면 경고
- devops 레포 내용 복사 금지 (참조만)
- 이월 3회 시 재검토 질문

## 보안 규칙
- .env, credentials, API key 등 시크릿 파일 커밋 금지
- 시크릿은 Vault 경로만 기록 (예: `vault kv get secret/personal/jira`)
- 민감 정보 직접 저장 금지

## 응답 스타일
- 한국어로 응답
- 요약 없이 바로 본론
