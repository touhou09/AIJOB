# Hermes Gateway 장애 대응 런북

## 증상 1: 게이트웨이 프로세스 없음

### 진단
```bash
launchctl list | grep hermes
ps aux | grep "hermes.*gateway"
```

### 해결
```bash
launchctl bootout gui/$(id -u)/ai.hermes.gateway-backend
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.hermes.gateway-backend.plist
# 또는
backend gateway install
```

## 증상 2: Slack 연결 실패

### 진단
```bash
tail -50 ~/.hermes/profiles/backend/logs/gateway.log | grep -i "slack\|error\|fail"
```

### 해결
- Slack 토큰 확인: `~/.hermes/profiles/backend/.env`
- Socket Mode 활성화 여부 확인
- 게이트웨이 재시작

## 증상 3: Cron job 미실행

### 진단
```bash
backend cron status
backend cron list
```

### 해결
- 게이트웨이 실행 중인지 확인 (cron은 게이트웨이 내장)
- `backend cron run <id>`로 수동 실행 테스트

## 증상 4: Paperclip 연결 불가

### 진단
```bash
curl -s --max-time 3 https://paperclip.dororong.dev/api/health
lsof -ti:3100
```

### 해결
- Paperclip 서버 재시작: `npx paperclipai run`
- Cloudflare Tunnel 확인: `brew services info cloudflared`

## 로그 위치
- Gateway: `~/.hermes/profiles/{profile}/logs/gateway.log`
- Error: `~/.hermes/profiles/{profile}/logs/gateway.error.log`
- Paperclip: `~/.paperclip/instances/default/logs/`
