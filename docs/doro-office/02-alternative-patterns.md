# 참고: 다른 모니터링 시스템 패턴

> 인터뷰 Q20 ("참고한 시스템이 있나?") 답변을 위한 비교표.
> 사용자가 특정 시스템 스타일을 원한다고 말하면 그 쪽으로 재설계 방향이 정해진다.

## 1. 현재 DOR-5 = "cron + JSON + CLI" 패턴
- 상주 프로세스 없음. 5분마다 깨어남
- 스냅샷 1개 (history 없음)
- CLI + Slack 웹훅
- 외부 의존성 0

비슷한 철학: `cron + sysstat`, `checkmk` 스크립트 모드, 작은 셸 스크립트 + `mail`

## 2. "Uptime Kuma" 패턴 — 경량 상주 + 웹 UI
- Node.js 상주 서버, 브라우저 대시보드
- 단일 binary/container, SQLite 내장
- HTTP/TCP/Ping 같은 외부 probe가 주
- 자체 알림 스케줄러, 중복 억제 내장

**적용 시 변경 포인트:**
- Python FastAPI 상주 서버 + 브라우저 뷰
- SQLite history
- Hermes/Paperclip은 내부 probe로 재구현

## 3. "Grafana + Prometheus" 패턴 — 시계열 풀스택
- exporter가 메트릭 공개 (pull)
- Prometheus가 scrape + TSDB 저장
- Grafana로 시각화
- Alertmanager로 알림

**적용 시 변경 포인트:**
- `hermes-monitor`를 Prometheus exporter로 변환 (metrics endpoint)
- 별도 Prometheus 서버 띄워야 함 (Mac Mini 부담)
- Grafana 대시보드 템플릿 유지보수 필요
- 러닝 코스트 급증

## 4. "PagerDuty / Better Uptime" 패턴 — incident 중심
- 외부 SaaS, 사건 수명 주기 (open → acknowledged → resolved)
- On-call rotation, escalation policy
- 모바일 앱, 전화 호출
- 무료 플랜 있으나 외부 의존

**적용 시 변경 포인트:**
- incident 객체 도입
- 알림과 incident 상태 관리
- "확인 / 해결" 인터페이스 필요 (현재 없음)

## 5. "Datadog / New Relic" 패턴 — APM + 로그 통합
- Agent가 서버에 상주, 자동 메트릭/로그/트레이스 수집
- 중앙 SaaS 대시보드
- 분산 트레이싱 가능
- 돈 먹음

**적용 시 변경 포인트:**
- 현재 범위를 한참 벗어남
- Hermes 에이전트를 OpenTelemetry span 생성자로 바꿔야
- 현실성 낮음

## 6. "Netdata" 패턴 — 1초 해상도 실시간 웹 UI
- 초당 메트릭, 각 호스트에 경량 에이전트
- 내장 웹 서버 (단일 프로세스)
- 히스토리 짧음 (기본 몇 시간)
- "실시간 건강검진기"

**적용 시 변경 포인트:**
- Python으로 상주 프로세스 + WebSocket streaming
- 1초 간격 수집은 Hermes CLI 호출 비용 고려하면 불가능 → 10-30초가 현실
- 대시보드 UX가 "지금 이 순간"에 초점

## 7. "에이전트 self-report" 패턴 — push 기반
- 에이전트가 heartbeat + 상태를 주기적으로 모니터로 전송
- 모니터는 수집기, 감지, 저장만 담당
- 에이전트 SOUL.md에 "상태 보고" 책임 추가

**적용 시 변경 포인트:**
- Hermes 에이전트 SOUL.md 수정 (모든 프로필)
- 모니터 `receive_heartbeat` 엔드포인트 추가
- Paperclip의 `lastHeartbeatAt`과 이중화 (아니면 Paperclip을 완전히 대체)

---

## 사용 방법

인터뷰 답변이 "Uptime Kuma 같은 거" → #2로 가는 것. "Grafana에서 본 듯한" → #3. "이런 거 본 적 없고 그냥 ..." → 그 설명을 들어서 위 중 하나에 매핑하거나, 새 카테고리 추가.

사용자가 **여러 개를 섞고 싶다**고 하면 그게 현재 단일 스크립트 구조로는 안 되는 이유가 되고, 그때 재설계 범위가 확정됨.
