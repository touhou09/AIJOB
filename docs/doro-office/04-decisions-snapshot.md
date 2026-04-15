# DOR-5 재기획 — 확정 결정 스냅샷 (2026-04-11)

> DECISIONS.md로 승격할 때 이 파일 참고.

## D1. 모니터링 서비스 방향 피벗
- **폐기**: 상주 데몬 없는 cron + JSON + CLI + Slack 웹훅 단독 접근
- **채택**: 시각화 계층을 Paperclip 플러그인으로 추가. 기존 `hermes_monitor.py + hermes_status.py`는 **데이터 레이어**로 유지/활용
- 이유: 사용자가 원한 UX는 "각 에이전트가 캐릭터로 살아 있고 작동 상태가 보이는" 가시적 피드백. CLI/JSON만으로는 요구사항을 만족 못 함

## D2. 배포 형태 우선순위
1. Paperclip 공식 plugin (`@paperclipai/plugin-sdk v2026.403.0`)
2. 부족 시 Tauri 2로 같은 SPA 래핑 (MVP-3에서 판단)
3. Electron/네이티브는 배제

## D3. 시각화 기술
- **SVG + CSS keyframes** (OpenClaw Office 패턴)
- Canvas/PixiJS/Phaser/game loop 배제 (Pixel Agents 방식 배제)
- 이유: Codex 5.3 Spark가 구현할 대상, 리소스 최소, 커스텀 쉬움, 관리 쉬움

## D4. 스택
- React 19 + TS + Vite + Zustand + Tailwind CSS 4 + Vitest
- Framer Motion, React Router, Redux 등 무거운 라이브러리 배제
- 의존성 최소 원칙 — 의심되면 CSS로 가기

## D5. 캐릭터 IP
- 2차 창작 비영리 범위로 간주 — 개인 사용 OK
- 기본 스킨 = 도로롱
- 스킨 로더는 1급 기능 (MVP-2 포함) — 다른 사용자가 자기 스킨 교체 가능하도록 설계
- 플러그인 이름: `doro-office`

## D6. 레퍼런스
- `pablodelucca/pixel-agents` (MIT, VSCode extension): 상태 머신 패턴 참고, Canvas 방식은 미채택
- `WW-AI-Lab/openclaw-office` (MIT, 530 stars): React 19 + Zustand + Tailwind + SVG + WebSocket 패턴을 거의 그대로 이식
- 둘 다 라이선스 MIT이라 패턴 참조/코드 흡수 가능 (attribution 권장)

## D7. 범위
- 계획 시점 기준으로는 **MVP-0~3까지 실제 구현**을 목표로 두었다.
- 2026-04-12 확인 결과 현재 구현본(`~/workspace/doro-office-scrum-46/plugins/doro-office` v0.1.4)은 다음 범위를 이미 포함한다.
  - Page + Sidebar + Dashboard widget surface
  - `agents.read` 기반 1초 polling + manual refresh fallback
  - SVG 오피스 레이아웃 + 7석 배치 + overflow roster
  - 도로롱 상태 표현 + 말풍선/오류 강조 토글
  - 최근 이벤트 timeline
- 현재 구현에서 제외/보류된 항목:
  - `~/.hermes/skins/*` 기반 커스텀 스킨 로더
  - 선택한 스킨 persistence
  - Tauri 래퍼

## D8. 착수 전 오픈 이슈의 해소 결과
- React/Tailwind 호환성: 해소. preflight 결과와 실제 구현(`React 19`, `Tailwind 4`)이 정합하다.
- Plugin worker FS capability: 해소. 읽기 가능성은 검증됐지만, 커스텀 스킨 로더는 별도 backlog로 defer 되었다.
- 개발 루프: 해소. 현재는 로컬 재빌드/재설치 절차로 운용한다.
- 도로롱 에셋: 해소. 기본 4상태 에셋이 플러그인 번들에 포함되어 있다.
- Dashboard widget 권한: 해소. manifest와 구현본에 widget slot이 포함되어 실제 surface가 존재한다.

---

## 이슈 수렴 메모 (2026-04-12)
- `DOR-21`은 최초 구현 epic이지만 현재 상태는 cancelled다. cancelled 사유는 구현 실패가 아니라, 실행 과정에서 하위 이슈/후속 수정으로 실체가 분산되고 상위 상태 갱신이 따라가지 못했기 때문이다.
- 실제 구현 lineage는 `DOR-26`(MVP-0), `DOR-32`(MVP-1), `DOR-33`(MVP-2), `DOR-34`(MVP-3)와 후속 회귀 수정 `DOR-35`~`DOR-37`이다.
- `DOR-27`~`DOR-29`는 `DOR-26` 내부로 통합되며 cancelled 되었다.
- `DOR-87`은 위 구현본을 기준으로 문서/후속 범위를 다시 정리하는 triage 부모다.
- `DOR-88`은 문서와 이슈 상태를 현재 구현 사실에 맞춰 수렴시키는 정리 작업이다.

## 현재 후속 구현 판단
1. 커스텀 스킨 로더 + 스킨 선택 persistence는 별도 backlog로 추적한다.
2. Tauri 래퍼는 현 시점에서는 backlog로 올리지 않고 defer 메모만 유지한다.
3. 나머지 page/sidebar/widget/timeline 범위는 구현 완료로 간주한다.
