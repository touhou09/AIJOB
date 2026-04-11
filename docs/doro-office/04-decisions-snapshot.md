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
- **MVP-0~3까지 실제 구현** (agents가 Paperclip 이슈로 실행)
- Tauri는 MVP-3에서 Paperclip plugin UX가 충분하면 **배제**
- doro-office 자체가 Paperclip 개발 자동화 테스트베드이므로, 티켓 분해와 acceptance가 명확해야 함

## D8. 오픈 이슈 (착수 전 해소)
- Paperclip plugin core의 React/Tailwind 버전 호환성 확인
- Plugin worker capability 범위 (FS 읽기 허용 여부)
- 개발 중 hot reload 워크플로 확인
- 도로롱 실제 스프라이트 에셋 소싱 (사용자 또는 에이전트)

---

## 즉시 후속 액션 (user 승인 필요)

1. **DOR-5, DOR-17 수렴 처리** — 두 이슈에 이번 재기획 결론 요약 코멘트 + 상태 전환
2. **신규 epic 이슈 생성**: "doro-office 구현" (hermes-infra project)
3. **선행 기술 검증 티켓** 1건: 위 D8 오픈 이슈 4개를 하루 내 확인
4. **MVP-0 부모 + child 4개 티켓** 생성, orchestrator에 할당 → 자동 분배
5. DECISIONS.md에 AD-006 등 신규 AD 번호로 이 스냅샷 승격
