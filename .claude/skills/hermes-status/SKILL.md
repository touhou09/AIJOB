---
name: hermes-status
description: Hermes Agent, Paperclip, Slack 상태를 하나의 조회 인터페이스로 확인한다.
---

# Hermes 통합 상태 조회

`/hermes-status`는 모니터 스냅샷을 재사용해 게이트웨이, Paperclip heartbeat, 이슈 처리 현황, cron/slack 상태를 한 번에 보여준다.

## 기본 사용

```bash
cd /Users/yuseungju/AIJOB
python3 scripts/hermes_status.py
```

동작 규칙:
1. `.claude/tmp/hermes-monitor/latest.json`가 15분 이내이고 요청한 `--recent-window-days` 와 cache의 `issueKpiWindowDays` 가 같으면 캐시를 사용한다
2. 스냅샷이 없거나 오래됐거나 KPI window 요청이 다르면 `scripts/hermes_monitor.py`와 같은 데이터 소스로 live 수집 후 스냅샷을 갱신한다
3. live refresh 시 마지막 Slack `notification` 결과를 유지한다
4. 에이전트별 heartbeat age, open/blocked backlog, 최근 window의 resolved/done/failed ratio, profile별 gateway/slack/cron 상태를 함께 출력한다

## 자주 쓰는 옵션

```bash
python3 scripts/hermes_status.py --refresh
python3 scripts/hermes_status.py --json
python3 scripts/hermes_status.py --max-age-minutes 5
python3 scripts/hermes_status.py --snapshot-path .claude/tmp/hermes-monitor/latest.json
```

- `--refresh`: 캐시 무시 후 즉시 live 수집
- `--json`: 후처리용 raw snapshot 출력
- `--max-age-minutes`: 캐시 허용 시간 조정
- `--recent-window-days`: recent KPI 기간 조정, cache window가 다르면 자동 refresh
- `--snapshot-path`: 다른 스냅샷 경로 사용

## 출력 해석

- `summary`: gateway 총량, fresh/stale agent 수, open issue 총합, recent resolved/failed, alert 수. assignee가 비어도 `unattributed` bucket을 포함해 recent 총량을 보존한다
- `agents`: 에이전트별 현재 상태와 heartbeat 나이, open/blocked, recent resolved/done/failed, doneRatio/failedRatio. assignee 없는 종결 이슈는 `unattributed paperclip` 행으로 표시된다
- `profiles`: profile별 gateway/slack/cron 집계와 open/blocked, recent done/failed/resolved. assignee 없는 종결 이슈는 `unattributed` profile 행으로 따로 보인다
- `alerts`: 즉시 drill-down이 필요한 경고 목록

## drill-down 기준

- `heartbeat stale:*`: 해당 agent의 recent heartbeat 및 gateway 로그 확인
- `slack degraded:*`: `~/.hermes/profiles/{profile}/logs/gateway.log*` 확인
- gateway가 `missing`: `launchctl list | grep ai.hermes.gateway-{profile}` 확인

## 참고 문서
- 설계: `docs/hermes-monitoring-architecture.md`
- 수집기: `scripts/hermes_monitor.py`
- 런북: `.claude/runbooks/hermes-monitoring.md`

사용법: `/hermes-status`
