# doro-office 구현 계획

> 사용자 결정 (2026-04-11):
> - IP: 2차 창작 / 비영리 범위, 기본 스킨 = 도로롱, 스킨 로더는 있음
> - 대상 모델: Codex 5.3 Spark (경량 reasoning 모델) — 구조 단순, 파일 작게, 명확한 acceptance
> - 용도: Paperclip 개발 자동화 테스트베드 (에이전트가 실제로 구현)
> - 이름: `doro-office`
> - Tauri: MVP-3까지에서 plugin만으로 UX 충분하면 배제, 부족할 때만 래퍼 추가
> - 시각화: SVG + CSS 애니메이션 (Canvas game loop 아님)

---

## 기술 스택 (Codex 5.3 Spark 친화)

### Plugin Package
```
@dororong/doro-office (npm 패키지)
├── package.json
├── manifest.json              # Paperclip plugin manifest
├── src/
│   ├── worker/                # JSON-RPC 워커 (Node.js)
│   │   ├── index.ts           # entry
│   │   ├── paperclip-client.ts  # /api/* 래퍼
│   │   ├── monitor-bridge.ts  # hermes_monitor 스냅샷 읽기
│   │   ├── skin-loader.ts     # ~/.hermes/skins/* 로컬 로딩
│   │   └── poller.ts          # 상태 수집 + UI push
│   └── ui/                    # React SPA (same-origin in Paperclip)
│       ├── index.tsx
│       ├── OfficePage.tsx     # 메인 페이지 (Pages slot)
│       ├── PulseWidget.tsx    # 대시보드 위젯 (Widget slot)
│       ├── store.ts           # Zustand store
│       ├── character/
│       │   ├── Character.tsx  # SVG <image> + CSS 애니메이션
│       │   ├── SpeechBubble.tsx
│       │   └── state-machine.ts  # Paperclip status → visual state
│       ├── office/
│       │   ├── OfficeScene.tsx   # SVG 배경 + 데스크 좌표
│       │   └── desks.ts       # 에이전트 → 좌표 매핑
│       └── assets/
│           └── skins/
│               └── dororong/      # 기본 스킨 (PNG 번들)
│                   ├── skin.json  # 상태별 프레임 매니페스트
│                   ├── idle.png
│                   ├── working.png
│                   ├── error.png
│                   └── sleeping.png
└── tests/
    └── (Vitest unit tests)
```

### 의존성 (최소)
- `react@19`, `react-dom@19`, `typescript@5`, `vite@6`
- `@paperclipai/plugin-sdk`, `@paperclipai/plugin-sdk/ui`
- `zustand@5` (상태 관리, 3KB, API 단순)
- `tailwindcss@4` (유틸리티 클래스)
- `vitest@2` (테스트)
- **사용 안 함**: Framer Motion (CSS keyframes로 충분), Redux, React Router, Canvas/PixiJS/Phaser, Framer-style heavy animation libs

### 아키텍처 원칙
1. **Worker는 Paperclip API를 단방향 풀링** (10초 간격 MVP-0~2, MVP-3에서 5초)
2. **UI는 Worker에서 받은 snapshot만 렌더** (UI는 self-fetch 금지, 단일 진실의 원천)
3. **Character는 순수 함수형** — `<Character state="working" skin="dororong"/>` 이상의 API 없음
4. **애니메이션은 CSS keyframes만** — JS animation loop 없음
5. **파일당 150줄 이내** — Codex가 한 번에 읽고 수정 가능한 크기

---

## 상태 머신: Paperclip → Character

```typescript
// src/ui/character/state-machine.ts
export type CharacterState = "idle" | "working" | "error" | "sleeping" | "waiting";

export function mapAgentToCharacter(agent: AgentSnapshot): CharacterState {
  if (agent.status === "error") return "error";
  if (agent.heartbeatAgeMinutes === null || agent.heartbeatAgeMinutes > 360) return "sleeping";
  if (agent.status === "running") return "working";
  if (agent.openIssues > 0) return "waiting";
  return "idle";
}
```

**CSS 애니메이션 매핑**
```css
.char-idle     { animation: bob 2s ease-in-out infinite; }
.char-working  { animation: pulse 0.8s ease-in-out infinite; }
.char-error    { animation: shake 0.3s linear infinite; filter: hue-rotate(330deg); }
.char-sleeping { animation: none; opacity: 0.5; filter: grayscale(1); }
.char-waiting  { animation: glance 3s ease-in-out infinite; }

@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes glance { 0%,100% { transform: rotate(0); } 50% { transform: rotate(2deg); } }
```

---

## MVP 단계 — 각 단계가 독립적으로 작동 + 다음 단계가 쌓임

### MVP-0: 플러그인 스켈레톤 + 정적 카드 그리드 (리스크 제거용)
**목표**: Paperclip 안에서 플러그인이 로드되고, 7개 에이전트 카드가 뜬다. 애니메이션 없음.

**산출물**
- `package.json` + `manifest.json` (Page + Sidebar slot 선언)
- 워커: `/api/companies/{id}/agents` 10초 폴링, UI로 push
- UI: Tailwind 그리드로 7개 카드. 각 카드 = `<Character>` placeholder (주황 동그라미) + 이름 + 상태 텍스트
- README: `paperclipai plugin install ./` 으로 로컬 설치 방법

**완료 조건**
- Paperclip 재시작 없이 `plugin install` 후 사이드바에 "Doro Office" 진입점 노출
- 페이지 열면 에이전트 카드 7개가 표시되고 이름/상태가 실제 Paperclip 데이터와 일치
- CTO 리뷰 통과

**예상 파일 수**: 10개 이하

---

### MVP-1: 상태 머신 + 말풍선 + 도로롱 기본 스킨
**목표**: 캐릭터가 도로롱 PNG로 바뀌고, 상태별 CSS 애니메이션이 돌고, 작업 중이면 이슈 번호 말풍선.

**산출물**
- `assets/skins/dororong/` 에 idle/working/error/sleeping PNG 4장 + skin.json (사용자가 로컬에 이미 있는 에셋을 `~/.hermes/skins/dororong/`에 두고, 빌드 시 플러그인 번들로 복사)
- `Character.tsx` — SVG `<image>` + state별 className
- `state-machine.ts` + 단위 테스트 5케이스
- `SpeechBubble.tsx` — `running` 상태에서 현재 이슈 key 표시
- 워커: `/api/issues?assigneeAgentId=...` 추가 조회

**완료 조건**
- 7개 캐릭터가 도로롱 PNG로 렌더, 실제 Paperclip 상태에 따라 5가지 CSS 애니메이션 중 하나 재생
- backend 에이전트가 DOR-X 처리 중이면 "DOR-X" 말풍선 보임
- `state-machine.ts` Vitest 통과

**예상 파일 수**: 15개 이하 (누적)

---

### MVP-2: SVG 오피스 레이아웃 + 스킨 로더 + 설정 페이지
**목표**: 카드 그리드가 "사무실" SVG로 바뀌고, 스킨을 런타임에 바꿀 수 있다.

**산출물**
- `OfficeScene.tsx` — 1000x600 SVG 배경 (책상 7개, 고정 좌표)
- `desks.ts` — 에이전트 이름 → `{x,y}` 좌표 매핑
- 각 캐릭터가 자기 책상 위치에 배치됨
- `skin-loader.ts` 워커: `~/.hermes/skins/` 폴더 스캔 → skin.json 파싱 → base64 PNG 반환
- UI Settings 페이지: 스킨 드롭다운 (default/dororong/<사용자 스킨>)
- 활성 스킨 선택을 Paperclip plugin state에 저장 (plugin-sdk 캡.)

**완료 조건**
- 오피스 뷰가 책상 배치로 렌더, 도로롱이 각자 자리에 앉아 있음
- 설정에서 스킨 바꾸면 즉시 리렌더
- 테스트: skin.json 파싱, desks 좌표 매핑

**예상 파일 수**: 25개 이하 (누적)

---

### MVP-3: 실시간 + 히스토리 타임라인 + (조건부) Tauri
**목표**: 상태 전환이 애니메이션으로 부드럽게 전환, 하단에 최근 이벤트 타임라인, 필요 시 데스크탑 앱.

**산출물**
- 워커 폴링 5초로 단축 + 이전 스냅샷과 diff 계산 → 변경된 에이전트만 UI push
- 상태 전환 시 CSS `transition` 으로 fade/scale
- `TimelinePanel.tsx` — 최근 30분 이벤트 스트림 (이슈 오픈/완료/에러)
- 대시보드 위젯 `PulseWidget.tsx` — 미니 버전 (working 수 / error 수 / 캐릭터 아이콘 7개)
- **Tauri 판단 포인트**: 플러그인으로 열리는 Paperclip 페이지가 "탭 전환해야 보이는" 제약이 사용자 경험에 중요하게 걸림 여부
  - 걸림 → Tauri 래퍼 추가 (같은 Vite 빌드를 `tauri build`로 .dmg/.msi 생성, Paperclip API URL만 설정)
  - 안 걸림 → 배제, MVP-3 완료

**완료 조건**
- 상태 전환이 1초 내 UI에 반영, 애니메이션 전환 부드러움
- 타임라인에 최근 이벤트 5~10건 표시
- 대시보드 위젯이 Paperclip 메인에 카드로 노출
- Tauri 빌드 결정 문서화 (DECISIONS.md AD 항목)

**예상 파일 수**: 35개 이하 (누적)

---

## 티켓 분해 제안 (epic + MVP별 부모 + child)

```
EPIC: doro-office 구현 (DOR-?? 신규)
├── MVP-0 부모 (team-frontend)
│   ├── 플러그인 스캐폴딩 + manifest (team-frontend)
│   ├── 워커 Paperclip 클라이언트 (team-backend)
│   ├── OfficePage 정적 카드 그리드 (team-frontend)
│   └── 로컬 설치 검증 (team-qa)
├── MVP-1 부모 (team-frontend)
│   ├── 상태 머신 + 단위 테스트 (team-backend or team-frontend)
│   ├── Character SVG 컴포넌트 + CSS 애니메이션 (team-frontend)
│   ├── 도로롱 스킨 번들링 (team-frontend — 사용자가 에셋 제공 전제)
│   └── SpeechBubble + 이슈 조회 워커 (team-backend)
├── MVP-2 부모 (team-frontend)
│   ├── OfficeScene SVG 배경 + desks 좌표 (team-frontend)
│   ├── 스킨 로더 워커 (team-backend)
│   ├── Settings 페이지 + state persistence (team-frontend)
│   └── QA 스킨 교체 시나리오 (team-qa)
├── MVP-3 부모 (team-frontend)
│   ├── diff 기반 실시간 폴링 (team-backend)
│   ├── TimelinePanel (team-frontend)
│   ├── PulseWidget (team-frontend)
│   ├── Tauri 판단 + (조건부) 빌드 설정 (team-devops)
│   └── E2E 회귀 (team-qa)
```

**총**: 1 epic + 4 MVP 부모 + 16 child = **21 티켓**. 전부 `hermes-infra` project.

---

## 에셋 문제 (차단 가능)

- 도로롱 idle/working/error/sleeping PNG 4장이 MVP-1 착수 조건
- 사용자 제공 또는 에이전트가 웹에서 찾아 다운로드 (IP 2차 창작 범위 내 → OK)
- 사용자가 직접 BOOTH/Patreon 에셋 구매 가능하면 가장 깨끗
- 임시 플레이스홀더: 크리티컬 패스 풀기 위해 MVP-0는 단색 동그라미로 진행

---

## 리스크 & 오픈 질문

1. **Paperclip plugin 로컬 개발 루프**: `plugin install` 후 코드 변경 시 hot reload 되는지, 아니면 매번 재설치인지 확인 필요
2. **Plugin worker의 FS 권한**: `~/.hermes/skins/` 읽기가 capability로 허용되는지 — MVP-2 차단 가능
3. **Plugin UI가 React 19 + Tailwind 4** 버전을 core와 맞춰야 하는지 (core가 React 18이면 충돌)
4. **도로롱 스프라이트 실물**: 현재 없음. 에셋 소싱을 별도 체크리스트로 분리할지?
5. **PulseWidget**이 Paperclip 메인 대시보드에 실제로 노출되려면 기본 사용자 권한만으로 가능한지 (operator 승인 필요?)

이 중 1~3은 MVP-0 착수 전에 **기술 검증 티켓** 하나 만들어서 선행 확인하는 게 안전함.
