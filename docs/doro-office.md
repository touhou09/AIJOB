# doro-office 운영 개요

## 목적
- Paperclip 안에서 Hermes 에이전트 상태를 오피스 레이아웃, 최근 이벤트 timeline, dashboard widget으로 관찰한다.
- stream bridge가 비활성화된 환경에서도 1초 polling fallback으로 상태 반영 SLA를 유지한다.

## UI surface
- Page: 7개 좌석 고정 배치 + overflow roster + 최근 이벤트 timeline
- Sidebar: 4개 카드 요약 + 수동 새로고침
- Dashboard widget: working/error/idle 카운트와 7개 미니 avatar 요약

## 데이터 흐름
1. worker가 `/api/companies/{companyId}/agents`를 1초 간격으로 폴링한다.
2. UI는 `agent-roster` bridge data와 `refresh-agent-roster` action만 사용한다.
3. page와 widget은 동일한 자동 갱신 hook으로 worker refresh action을 공유한다.
4. page는 이전 roster와 새 roster의 status diff를 비교해 최근 이벤트 timeline을 최대 10건 유지한다.
5. stream bridge가 501/미지원이어도 page와 widget은 polling fallback만으로 동작한다.

## 표시 옵션
- `showBubbles`: 좌석 카드 말풍선 표시 여부
- `highlightIssues`: `error` 상태 에이전트 강조 링 여부

## dashboard widget 메모
- `ui.dashboardWidget.register` capability와 `PulseWidget` slot을 선언한다.
- widget 승인 자체는 별도 approval가 필요 없고 board context 설치 권한만 필요하다.
- plugin reinstall 후 widget slot이 보이지 않으면 manifest refresh/cache 이슈로 본다.

## timeline 규칙
- status가 바뀐 에이전트만 이벤트로 기록한다.
- 이벤트는 `previousStatus -> nextStatus`와 시각을 함께 보여 준다.
- 최근 10건만 유지한다.

## Tauri 판단
- 현재 결정: 보류
- 이유: plugin page + widget + sidebar 조합으로 운영 UX가 충분하며, 별도 데스크톱 래퍼를 추가할 만큼의 이득이 아직 확인되지 않았다.
- 재검토 조건: 탭 전환 제약 때문에 상시 노출 요구가 생기거나 widget/page만으로 운영 흐름이 부족할 때
