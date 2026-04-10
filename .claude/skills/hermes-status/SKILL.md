---
name: hermes-status
description: Hermes Agent, Paperclip, LLM Wiki의 통합 상태를 확인한다.
---

# Hermes/Paperclip/Wiki 상태 확인

Hermes Agent, Paperclip, LLM Wiki의 통합 상태를 확인한다.

## 절차

1. **통합 모니터 스냅샷 우선 조회**
   - `python3 scripts/hermes_monitor.py --write-snapshot .claude/tmp/hermes-monitor/latest.json`
   - 최근 alert, gateway PID, Paperclip latency, heartbeat stale 여부를 먼저 확인
   - alert가 있으면 세부 원인 확인 단계로 내려간다

2. **Hermes Agent**
   - `hermes --version`
   - 활성 프로필: `hermes profile list`
   - 게이트웨이 상태: `launchctl list | grep hermes`
   - Cron 활성 수: `hermes cron list`
   - Cron 이력: `grep -R "cron.scheduler" ~/.hermes/profiles/*/logs/agent.log* | tail -20`

3. **Paperclip**
   - Health: `curl -s --max-time 3 https://paperclip.dororong.dev/api/health`
   - Agent 상태/heartbeat: `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3100/api/companies/abac28ea-9edd-4ddb-b40a-0baf52505357/agents`
   - 최근 이슈: `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3100/api/companies/abac28ea-9edd-4ddb-b40a-0baf52505357/issues`

4. **Slack 전달 상태**
   - `grep -R "slack" ~/.hermes/profiles/*/logs/gateway.log* | tail -20`
   - `Slack app token already in use`가 보이면 다중 프로필 충돌로 판단

5. **LLM Wiki**
   - Wiki 경로 존재 여부: `ls ~/wiki/`
   - 총 페이지 수: `find ~/wiki -name "*.md" -not -path "*/raw/*" | wc -l`
   - 마지막 log 엔트리: `tail -3 ~/wiki/log.md`

6. 결과를 요약 테이블 또는 bullet로 출력

## 참고 문서
- 설계: `docs/hermes-monitoring-architecture.md`
- 런북: `.claude/runbooks/hermes-gateway.md`

사용법: `/hermes-status`
