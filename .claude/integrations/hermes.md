# Hermes Agent 연동

> 최종 업데이트: 2026-04-09

---

## 설치 경로
- Home: `~/.hermes/`
- 바이너리: `~/.local/bin/hermes`
- 소스: `~/.hermes/hermes-agent/` (git clone)
- Python venv: `~/.hermes/hermes-agent/venv/`

## 설정
- 글로벌 config: `~/.hermes/config.yaml`
- 프로필별: `~/.hermes/profiles/{name}/`
- 환경변수: `~/.hermes/.env` (API 키 등)

## 프로필 관리
```bash
hermes profile list                # 프로필 목록
hermes profile create <name>       # 프로필 생성
<name> chat                        # 프로필로 대화
<name> gateway start               # 프로필 게이트웨이 시작
<name> cron list                   # 프로필 cron 목록
```

각 프로필은 독립된 config, SOUL.md, memories, skills, cron, 게이트웨이를 가짐.

## 게이트웨이
- launchd plist: `~/Library/LaunchAgents/ai.hermes.gateway-{profile}.plist`
- 로그: `~/.hermes/profiles/{profile}/logs/gateway.log`
- 설치: `<profile> gateway install`
- 상태: `<profile> gateway status`

## Cron
- jobs.json: `~/.hermes/profiles/{profile}/cron/jobs.json`
- 관리: `<profile> cron list/create/remove/pause/resume`
- 게이트웨이가 실행 중이어야 cron 동작

## MCP 서버
- Memvid: `config.yaml`의 `mcp_servers.memvid`에 설정
- 에이전트 실행 시 자동 연결

## 주의사항
- 프로필은 머신 로컬 — AIJOB 레포에 커밋하지 않음
- AIJOB의 `profiles/` 디렉토리는 템플릿 용도
- config.yaml 직접 수정보다 `hermes config` 명령 권장
