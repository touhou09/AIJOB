# DOR-22 React/Tailwind preflight

## 결론
- React 호환성: OK
- Tailwind 호환성: OK
- MVP-0 스캐폴딩 권장값: `react@19`, `react-dom@19`, `tailwindcss@4`
- 권장 대응 1안: host와 같은 major를 유지하고, CSS 충돌 방어용으로 plugin 쪽 Tailwind `prefix: "do-"`를 적용한다. Shadow DOM은 현재 근거상 필수 아님.

## 확인 근거

### 1) `@paperclipai/plugin-sdk@2026.403.0`
- npm registry 조회 결과 `peerDependencies.react = ">=18"`
- 설치된 package.json에서도 동일하게 `peerDependencies.react = ">=18"`
- 설치된 package.json의 `devDependencies["@types/react"] = ^19.0.8`
- Tailwind 관련 peer/dependency 선언은 없음

해석:
- SDK는 React를 host/consumer가 제공하는 형태를 전제로 한다.
- 최소 요구 조건은 React 18 이상이며, React 19를 막지 않는다.
- Tailwind는 SDK 차원의 강제 버전 요구가 없다.

### 2) Paperclip core `@paperclipai/server@2026.403.0`
- 설치된 server package version은 `2026.403.0`
- 설치된 package.json의 direct dependency에 `@paperclipai/plugin-sdk: 2026.403.0` 포함
- UI 번들 `ui-dist/assets/index-Br2N7xYL.js` 내부 React runtime 문자열에서 `Tn.version="19.2.4"` 확인
- 같은 번들에서 plugin import를 host bridge로 rewrite 하는 코드 확인:
  - `react/jsx-runtime` -> `globalThis.__paperclipPluginBridge__?.react`
  - `react-dom/client` -> `globalThis.__paperclipPluginBridge__?.reactDom`
  - `@paperclipai/plugin-sdk/ui` -> `globalThis.__paperclipPluginBridge__?.sdkUi`

해석:
- Plugin UI는 자체 React를 독립 실행하지 않고 host가 제공하는 React/ReactDOM bridge를 사용한다.
- Host React는 19.2.4이므로 plugin을 React 19로 맞추는 것이 가장 안전하다.
- React 18도 SDK 관점에서는 가능하지만, host bridge가 19 계열이므로 굳이 다운그레이드할 이유가 없다.

### 3) Paperclip core Tailwind 버전
- UI CSS 번들 `ui-dist/assets/index-CYurTMty.css` 배너에서 `/*! tailwindcss v4.1.18 | MIT License | https://tailwindcss.com */` 확인

해석:
- Host UI는 Tailwind 4.1.18 기반이다.
- doro-office의 목표 스택인 Tailwind 4는 host와 같은 major라서 기본 호환성은 문제 없다.

## 격리 방식 점검

### Shadow DOM / iframe 필요성
- `server/dist/routes/plugin-ui-static.js` 주석에서 plugin UI는 host가 "dynamically imports" 후 extension slot에 "mounts" 한다고 명시
- server/dist, ui-dist에서 plugin mount 경로 대상으로 `attachShadow`, `shadowRoot` 사용 흔적을 찾지 못함
- plugin bridge는 동일 문맥의 React/ReactDOM를 주입하는 구조임

해석:
- 현재 구조는 별도 Shadow DOM/iframe 격리보다 same-document mount에 가깝다.
- 따라서 React는 host와 동일 major를 맞추는 것이 중요하다.
- CSS는 전역 문서 기준으로 영향을 줄 수 있으므로 Tailwind 네임스페이스 방어가 의미 있다.

## 대응안 평가

### (a) plugin 다운그레이드
평가: 비권장
- 이유 1: host React가 이미 19.2.4다.
- 이유 2: SDK가 React 18+를 허용하므로 19를 피할 근거가 없다.
- 이유 3: 계획 문서의 스택(React 19)과도 맞는다.

적용 조건:
- future host가 React 18로 내려가거나, plugin build toolchain이 React 19 bridge와 실증 충돌할 때만 재검토

### (b) Shadow DOM 격리
평가: 지금은 과함
- 이유 1: host mount 구조가 same-document bridge 기반이며 Shadow DOM 제공 근거가 없다.
- 이유 2: plugin slot/page/widget 동작을 먼저 단순 경로로 검증하는 MVP-0 목표와 어긋난다.
- 이유 3: theme/token 전달, portal, overlay, host style alignment까지 복잡도가 증가한다.

적용 조건:
- 실제로 host CSS가 plugin 레이아웃을 깨뜨리거나 plugin CSS가 host widget/card를 오염시키는 실측 증거가 나올 때 2차 대응안으로 고려

### (c) Tailwind prefix 네임스페이스
평가: 권장 1안
- 이유 1: same-document mount 구조에서 가장 저비용으로 CSS 충돌면을 줄인다.
- 이유 2: host도 Tailwind 4라 version mismatch 문제는 없지만, class namespace 충돌/override 위험은 남는다.
- 이유 3: Shadow DOM보다 구현/디버깅/운영 비용이 낮다.

권장 방식:
- plugin Tailwind config에 `prefix: "do-"`
- plugin 내부 class는 `do-flex`, `do-grid`, `do-text-sm` 같은 형태로 사용
- host 토큰을 의도적으로 재사용할 경우에만 최소 범위의 커스텀 CSS를 추가

## 최종 판정

### React
- 판정: OK
- 사용 버전: `react@19`, `react-dom@19`
- 사유: host React가 19.2.4이고 plugin SDK가 React 18+를 허용하며, plugin bridge가 host React를 직접 주입함

### Tailwind
- 판정: OK
- 사용 버전: `tailwindcss@4`
- 사유: host UI가 Tailwind 4.1.18이고 plugin 계획도 Tailwind 4 기반이라 major mismatch가 없음
- 추가 조치: CSS 충돌 방어를 위해 plugin prefix 적용 권장

## MVP-0 스캐폴딩 반영값
- `react`: `^19.0.0`
- `react-dom`: `^19.0.0`
- `tailwindcss`: `^4.0.0`
- Tailwind prefix: `do-`
- Shadow DOM: 미적용
- Plugin strategy: host React/ReactDOM bridge 사용 전제, React 중복 번들링 금지

## 실행 메모
- MVP-0에서는 host와 같은 major만 맞추고 prefix까지 바로 넣으면 가장 안전하다.
- 첫 로컬 렌더 검증 시 확인 항목:
  1. hooks dispatcher mismatch 경고 없음
  2. `createRoot` 경로 정상 마운트
  3. plugin CSS가 host dashboard/sidebar 스타일을 덮어쓰지 않음
  4. host CSS가 doro-office sprite/grid를 깨뜨리지 않음
