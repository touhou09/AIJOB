# 트러블슈팅 작업 이력

> 장애, 버그, 예기치 않은 이슈

---

## 2026-04-10: hermes-status에서 cto 프로필이 missing으로 뜨는 문제 [done]
- **What**: `scripts/hermes_monitor.py::parse_profiles()`의 첫 글자 화이트리스트에 `c`가 빠져 cto 행이 필터링됨. 알파벳 검사로 교체.
- **Why**: 원 구현이 `{"◆","b","d","f","o","q"}` 화이트리스트라 프로필 이름이 새로 추가될 때마다 조용히 탈락. cto 추가 시점부터 `gateway=unknown` 오탐 발생.
- **Impact**: monitor 스냅샷·`/hermes-status`가 cto를 집계에서 누락 → gateways=6/7, alerts 12개 중 1건 허위. 실제 launchctl은 정상이었음.
- **Test**: `hermes profile list` 파싱 결과 7개 전부 수집, `python3 scripts/hermes_status.py --refresh`로 `gateways=7/7` 확인.
---

## 2026-04-10: Hermes 모니터가 idle agent stale/CLI hang을 장애로 오탐하는 문제 [done]
- **What**: `hermes profile list` 실측 포맷에 맞춰 프로필 파서를 재작성하고, subprocess timeout + partial alert를 넣고, heartbeat stale alert를 running/open issue agent로 제한했다.
- **Why**: gateway 컬럼을 잘못 읽어 스냅샷 메타데이터가 왜곡됐고, idle agent까지 stale로 알리며, CLI 한 번 멈추면 launchd 모니터 전체가 hang될 수 있었다.
- **Impact**: 운영 알림이 9건→5건으로 정리되어 실제 Slack 충돌만 남았고, 향후 CLI 이상 시에도 snapshot/alert가 일부라도 남는다.
- **Test**: `python3 -m unittest tests.test_hermes_monitor tests.test_hermes_status`, `python3 scripts/hermes_monitor.py --json`, `python3 scripts/hermes_status.py --refresh`.
---
