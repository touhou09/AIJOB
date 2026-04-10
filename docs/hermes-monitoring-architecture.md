# Hermes Agent 모니터링 아키텍처

> 최종 업데이트: 2026-04-10

## 목표
Hermes 6개 프로필, Paperclip, Slack, cron을 한 번에 점검하는 경량 모니터를 로컬 Mac Mini에서 주기 실행한다. 장애를 빨리 감지하고 `/hermes-status`에서 같은 데이터를 재사용하는 것이 목적이다.

## 현재 관측 결과
- `hermes profile list` 기준 backend/data/devops/frontend/orchestrator/qa 게이트웨이 모두 실행 중
- `launchctl list | grep hermes` 기준 6개 LaunchAgent PID 존재
- `https://paperclip.dororong.dev/api/health` 응답 정상
- `hermes cron list` 기준 현재 등록된 cron job 없음
- `~/.hermes/profiles/*/logs/gateway.log` 기준 backend만 Slack 연결 성공 이력 존재
- 나머지 프로필은 `Slack app token already in use` 충돌 로그가 남아 있어 Slack 헬스 경고 대상으로 분류 가능

## 설계 원칙
1. 외부 SaaS 추가 없이 현재 로컬 로그와 Paperclip API만 사용
2. `/hermes-status`와 동일한 데이터 소스를 공유
3. 실패 시에도 부분 결과를 남겨 원인 파악 가능
4. alert 전송과 상태 수집을 분리해 재실행 비용을 낮춤

## 구성요소
### 1) 수집기 `scripts/hermes_monitor.py`
주기 실행되는 단일 Python 스크립트.
수집 항목:
- Hermes 프로필/게이트웨이 상태: `hermes profile list`, `launchctl list`
- Paperclip 상태: `/api/health`, `/companies/{companyId}/agents`, `/companies/{companyId}/issues`
- Cron 이력: `~/.hermes/profiles/*/logs/agent.log*`의 `cron.scheduler:` 로그 파싱
- Slack 전달 상태: `~/.hermes/profiles/*/logs/gateway.log*`의 최근 Slack 연결/실패 로그 파싱

### 2) 스냅샷 파일
권장 경로: `.claude/tmp/hermes-monitor/latest.json`
- 마지막 수집 시각
- 컴포넌트별 raw health
- 최근 alert 목록
- Slack 배달 결과(`notification.sent`, `notification.message`)
- `/hermes-status`에서 즉시 재사용할 요약 정보

### 3) 알림 경로
- 1차: Slack Incoming Webhook (`HERMES_MONITOR_SLACK_WEBHOOK_URL`)
- 채널: `#sprint-planning`
- alert가 있을 때만 전송
- 동일 alert 중복 전송 억제를 위해 후속 단계에서 이전 스냅샷 diff 비교 추가 가능

### 4) 조회 경로
`/hermes-status` 스킬은 `python3 scripts/hermes_status.py`를 기본 인터페이스로 사용한다.
1. 최신 스냅샷이 15분 이내면 그대로 출력
2. 스냅샷이 없거나 오래됐으면 내부적으로 live 수집 후 스냅샷을 갱신
3. 에이전트별 heartbeat/open issue, profile별 gateway/slack/cron 상태를 통합 요약
4. 필요 시 원시 명령(`launchctl`, `hermes cron list`, Paperclip health)로 drill-down

## 데이터 흐름
1. launchd 또는 cron이 `scripts/hermes_monitor.py` 실행
2. 스크립트가 Hermes CLI, LaunchAgent, Paperclip API, 로그 파일에서 상태 수집
3. 결과를 JSON 스냅샷으로 저장
4. alert 조건이 있으면 Slack Webhook으로 `#sprint-planning` 전송
5. `/hermes-status`는 동일 스냅샷을 읽어 인간 친화적 요약 제공

## 기술 선택
### Python 단일 스크립트 선택 이유
- 이미 Hermes/Paperclip가 Python 중심 환경
- JSON 출력, 로그 파싱, HTTP 호출을 표준 라이브러리로 처리 가능
- launchd에서 실행하기 쉬움

### Paperclip API 직접 호출 이유
- heartbeat/issue 현황은 CLI보다 API가 구조화 데이터 제공에 유리
- 로컬 `~/.paperclip/auth.json` 토큰 재사용 가능

### 로그 파싱 유지 이유
- cron 성공/실패와 Slack 연결 여부는 현재 Hermes CLI보다 로그가 더 풍부함
- 별도 DB 없이 최근 이력 확보 가능

## alert 규칙 v1
- gateway 누락: `launchctl`에서 `ai.hermes.gateway-{profile}` 미발견
- Paperclip 지연: health latency > 1500ms 또는 status != ok
- heartbeat stale: `lastHeartbeatAt`이 30분 이상 오래됨 또는 null
- cron failure: 최근 로그에 `cron.scheduler` 실패/에러 존재
- Slack degraded: 최근 `gateway.log`에 Slack connect failure/conflict 존재

## 알려진 갭
1. Hermes cron이 현재 job history API를 제공하지 않아 로그 파싱 기반이다.
2. Paperclip 이슈 상태 흐름에 `failed`가 없어 issue 실패율은 `cancelled`를 대체 지표로 사용한다.
3. Slack Webhook URL은 별도 시크릿 관리가 필요하다. 문서에는 값 저장 금지.

## 운영 방법
### 수동 실행
```bash
python3 scripts/hermes_monitor.py --write-snapshot .claude/tmp/hermes-monitor/latest.json
python3 scripts/hermes_monitor.py --notify --slack-webhook-url "$HERMES_MONITOR_SLACK_WEBHOOK_URL"
```

### launchd 권장 주기
- 5분 간격 실행
- 실패해도 다음 주기에 자동 복구
- 표준 출력은 `~/Library/Logs/hermes-monitor.log`로 리다이렉트

예시 plist 개요:
```xml
<key>StartInterval</key><integer>300</integer>
<key>ProgramArguments</key>
<array>
  <string>/usr/bin/python3</string>
  <string>/Users/yuseungju/AIJOB/scripts/hermes_monitor.py</string>
  <string>--write-snapshot</string>
  <string>/Users/yuseungju/AIJOB/.claude/tmp/hermes-monitor/latest.json</string>
  <string>--notify</string>
</array>
```

## 후속 작업
1. 중복 alert 억제용 상태 캐시 추가
2. launchd plist를 `runbooks/`에 승격
3. `/hermes-status` 출력 포맷을 표 기반으로 정리
4. Slack 충돌 원인인 다중 프로필 동시 Socket Mode 사용 정책 정리
