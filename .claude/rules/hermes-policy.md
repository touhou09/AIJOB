# Hermes Agent 운영 규칙

## 프로필 관리
- 프로필 생성/삭제 시 STATE.md 즉시 갱신
- SOUL.md 수정 시 변경 사유를 DECISIONS.md에 기록 (AD 번호 부여)
- 프로필별 config는 머신 로컬 — AIJOB 레포에 커밋하지 않음
- AIJOB의 `profiles/` 디렉토리는 템플릿 용도만

## 게이트웨이
- 재시작 절차: `launchctl bootout gui/$(id -u)/ai.hermes.gateway-{profile} && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.gateway-{profile}.plist`
- 로그 확인: `~/.hermes/profiles/{profile}/logs/gateway.log`
- 게이트웨이 미실행 시 cron job 동작 안 함

## Cron
- 작업 추가/변경 시 Slack 채널 배달 설정 확인
- `hermes cron list`로 등록 확인 후 `hermes cron run <id>`로 테스트

## config.yaml
- 직접 수정보다 `hermes config` 명령 사용 권장
- API 키는 `~/.hermes/.env` 또는 프로필별 `.env`에 관리
- API 키를 AIJOB 레포에 커밋 금지

## Paperclip 연동
- 에이전트 등록/삭제는 사용자 승인 후 실행
- 이슈 상태 변경: backlog → todo → in_progress → done
- description 없는 이슈 생성 금지
