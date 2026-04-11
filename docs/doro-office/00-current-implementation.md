# DOR-5 현재 구현 요약 (스냅샷 2026-04-11)

> 이 파일은 재기획 인터뷰 시 "현재 무엇이 있는지" 공통 참조용.
> 코드 실물은 이 파일과 분리되어 변할 수 있으므로, 인터뷰 시점에 `wc -l`/최근 커밋으로 재확인.

## 1. 한 줄 요약
로컬 Mac Mini에서 **5분 간격 launchd polling → JSON 스냅샷 파일 → Slack Incoming Webhook 알림 + CLI 조회 스킬** 구조. 상주 서버/웹 UI 없음.

## 2. 컴포넌트

### `scripts/hermes_monitor.py` (699줄)
- 실행 단위: 단일 Python 스크립트 (cron형). 실행 때마다 새 프로세스, 끝나면 종료
- 수집 소스 6종:
  1. `hermes profile list` (Hermes CLI) → 게이트웨이 CLI 상태
  2. `launchctl list | grep hermes` → 게이트웨이 PID 존재 여부
  3. `~/.hermes/profiles/*/logs/gateway.log*` → Slack 연결 성공/실패 로그 파싱
  4. `~/.hermes/profiles/*/logs/agent.log*` → cron 실행 성공/실패 로그 파싱
  5. Paperclip `/api/health` → 서버 지연
  6. Paperclip `/api/companies/{id}/agents` + `/issues` → heartbeat, open/done/cancelled
- 출력: `.claude/tmp/hermes-monitor/latest.json` 스냅샷 단일 파일
- alert 규칙 v1:
  - gateway 누락 (launchctl PID 없음)
  - Paperclip health latency > 1500ms 또는 status != ok
  - heartbeat stale: 실행중 또는 open issue 있는 에이전트만 30분 초과
  - cron failure 로그 감지
  - Slack degraded (gateway.log의 최근 conflict/failure)

### `scripts/hermes_status.py` (523줄)
- 역할: `/hermes-status` 스킬의 백엔드. 모니터 스냅샷을 읽어 사람이 보기 편한 포맷으로 렌더
- 주요 동작:
  - 스냅샷 15분 이내면 그대로 사용 (캐시)
  - stale이거나 `--refresh`면 `hermes_monitor.collect_snapshot()`을 직접 호출하여 live 수집
  - `--project {id|name|urlKey|unassigned}` 필터 지원 (DOR-20 결과)
- 출력 섹션:
  - `summary`: 게이트웨이/에이전트 총량, stale 수, open issue, alerts, recent window
  - `projects`: project별 open/blocked/done/total + recent 집계
  - `agents`: 에이전트별 heartbeat/open/blocked/recent done/failed/ratio
  - `profiles`: 프로필별 gateway/slack/cron 상태 + 최근 이슈 처리
  - `notification`: Slack 웹훅 전송 결과
  - `alerts`: 즉시 drill-down 대상

### 스냅샷 파일 `.claude/tmp/hermes-monitor/latest.json`
- 모니터와 `/hermes-status`의 유일한 공유 인터페이스 (DB 없음)
- 매 수집 시 덮어씌움 (history 없음)
- diff 기반 중복 알림 억제: 미구현 (설계 문서 후속 과제로 명시)

### `/hermes-status` 스킬 `.claude/skills/hermes-status/SKILL.md` (56줄)
- 사용자/에이전트가 호출하는 CLI 인터페이스
- 옵션: `--refresh`, `--json`, `--max-age-minutes`, `--snapshot-path`, `--project`
- drill-down 가이드 포함 (stale → 로그 확인, gateway missing → launchctl 확인 등)

### 런북 `.claude/runbooks/hermes-monitoring.md` (48줄)
- 운영 절차: 수동 실행, launchd 등록, 장애 대응 요약

### launchd plist 예시 `.claude/runbooks/ai.hermes.monitor.plist.example`
- 5분 간격 모니터 실행, 표준 출력 `~/Library/Logs/hermes-monitor.log`로 리다이렉트
- **실제 launchd에는 미등록 상태**. 수동 복사 + `launchctl bootstrap` 필요

### 설계 문서 `docs/hermes-monitoring-architecture.md` (117줄)
- 목표, 구성요소, 데이터 흐름, 기술 선택, alert 규칙, 알려진 갭, 운영 방법
- "후속 작업" 섹션에 중복 알림 억제/plist 승격/출력 포맷 개선이 명시됨

## 3. 완료 조건 충족 현황 (DOR-5 원 description 기준)

| 조건 | 상태 |
|------|:---:|
| 게이트웨이 프로세스 상태 (launchd PID) | ✅ |
| Paperclip heartbeat 응답 시간 + 마지막 실행 | ✅ |
| Cron job 실행 성공/실패 이력 | ✅ 로그 파싱 기반 |
| Slack 메시지 배달 성공 여부 | ✅ gateway.log 파싱 |
| 에이전트별 최근 done/failed 비율 | ✅ recent window 집계 (CTO 리뷰 피드백 반영) |
| 모니터링 스크립트 또는 서비스 주기 수집 | ✅ 스크립트는 완성, launchd는 plist 예시만 존재 |
| 이상 감지 시 Slack 알림 | ⚠️ 코드 완성, webhook URL 미설정 → 실운영 미확인 |
| `/hermes-status` 통합 조회 | ✅ |
| 설계 문서 (아키텍처/기술/데이터흐름) | ✅ |

## 4. 의도적으로 안 한 것 (설계 원칙에서 제외됨)

- 외부 SaaS 연동 (Prometheus/Grafana/Datadog 등)
- 웹 대시보드/UI
- 상주 서버 프로세스 (all is cron-style)
- 시계열 history 저장
- 심각도별 알림 채널 분리
- 에이전트별 임계값 개별 튜닝
- Push 기반 heartbeat (에이전트가 스스로 상태 전송)
- 장애 자동 복구 (self-healing)
- 멀티 호스트 지원 (Mac Mini 단일)
