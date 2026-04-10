# Hermes 모니터 설치 런북

## 목적
`scripts/hermes_monitor.py`를 5분 간격으로 실행해 최신 스냅샷과 Slack alert를 유지한다.

## 준비물
- `HERMES_MONITOR_SLACK_WEBHOOK_URL` 환경변수 또는 plist 내 EnvironmentVariables 설정
- Paperclip 인증 파일 `~/.paperclip/auth.json`
- 저장 경로: `/Users/yuseungju/AIJOB/.claude/tmp/hermes-monitor/latest.json`

## 수동 점검
```bash
cd /Users/yuseungju/AIJOB
python3 scripts/hermes_monitor.py --write-snapshot .claude/tmp/hermes-monitor/latest.json
python3 scripts/hermes_status.py
python3 scripts/hermes_status.py --refresh
python3 scripts/hermes_monitor.py --notify --slack-webhook-url "$HERMES_MONITOR_SLACK_WEBHOOK_URL"
```

## launchd 설치
1. `.claude/runbooks/ai.hermes.monitor.plist.example`를 `~/Library/LaunchAgents/ai.hermes.monitor.plist`로 복사
2. `HERMES_MONITOR_SLACK_WEBHOOK_URL`를 실제 값으로 바꾸고 필요 시 경로를 수정
3. 아래 명령 실행
```bash
cp /Users/yuseungju/AIJOB/.claude/runbooks/ai.hermes.monitor.plist.example ~/Library/LaunchAgents/ai.hermes.monitor.plist
launchctl unload ~/Library/LaunchAgents/ai.hermes.monitor.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/ai.hermes.monitor.plist
launchctl start ai.hermes.monitor
```

## 확인
```bash
launchctl list | grep ai.hermes.monitor
cat /Users/yuseungju/AIJOB/.claude/tmp/hermes-monitor/latest.json
```
- JSON에 `notification` 필드가 있으면 마지막 Slack 배달 시도 결과까지 확인 가능

## 롤백
```bash
launchctl unload ~/Library/LaunchAgents/ai.hermes.monitor.plist 2>/dev/null || true
rm -f ~/Library/LaunchAgents/ai.hermes.monitor.plist
```
- 기존 스냅샷 파일은 참고용으로만 남고 운영 동작에는 영향 없음

## 장애 대응
- 스냅샷 파일이 안 생기면: `python3 scripts/hermes_monitor.py --json`으로 단독 실행
- Slack 알림이 안 오면: webhook URL 시크릿, 네트워크, `notification.message` 확인
- heartbeat가 계속 stale이면: Paperclip agent 상태와 해당 프로필 gateway 재기동 확인
