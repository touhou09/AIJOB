# AIJOB 가이드

AI 협업 구조(.claude) 관리 레포. 브랜치별 프로필(master/personal/work)로 Claude Code 환경을 세팅한다.

## 컨텍스트 로딩

| Tier | 파일 | 로드 시점 |
|------|------|----------|
| 1 (Hot) | 이 파일 + `.claude/STATE.md` | 매 세션 자동 |
| 2 (Warm) | @.claude/CONTEXT.md + @.claude/DECISIONS.md | 작업 시작 시 |
| 3 (Cold) | `.claude/work/{category}.md` | 해당 작업 시 |

## 세션 시작
1. STATE.md 읽고 현재 상태 파악
2. 사용자 요청에 해당하는 work/ 파일 로드
3. 필요 시 CONTEXT.md, DECISIONS.md 참조

## 작업 카테고리 인덱스

| 카테고리 | 파일 | 범위 |
|----------|------|------|
| 트러블슈팅 | `.claude/work/troubleshooting.md` | 장애, 버그, 예기치 않은 이슈 |

> 새 작업 계열 발생 시 카테고리 자동 추가

## 핵심 명령어
- `init-mac.sh [target] [branch]` — macOS에서 Claude Code 환경 복제
- `init-linux.sh [target] [branch]` — Linux/WSL에서 Claude Code 환경 복제
- 경로 생략 시 전역(~/.claude/) 세팅

## 보안 규칙
- .env, credentials, API key 등 시크릿 파일 커밋 금지
- 민감 정보는 환경변수 또는 시크릿 매니저 사용

## 응답 스타일
- 한국어로 응답
- 요약 없이 바로 본론
