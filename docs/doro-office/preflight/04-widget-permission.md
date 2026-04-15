# DOR-25 preflight — dashboard widget slot 권한/승인 모델

## 결론
- `dashboardWidget` 슬롯은 plugin manifest에서 `ui.dashboardWidget.register` capability만 선언하면 되는 UI extension point다.
- 회사 설정 `requireBoardApprovalForNewAgents=true` 는 agent 생성 승인 플로우에만 연결되어 있으며, plugin widget 등록에는 적용되지 않는다.
- plugin install / ui-contributions / bridge 계열 라우트는 모두 board context(`assertBoard`)만 요구하며, approval 레코드를 생성하지 않는다.
- 따라서 MVP-3의 `PulseWidget` 자체는 승인 블로커가 아니다. 운영상 필요한 것은 plugin 설치 권한(보드/오퍼레이터)이지 별도 widget 승인 프로세스가 아니다.

## 확인 근거
1. SDK / host capability 모델
   - `@paperclipai/plugin-sdk/README.md`
     - `dashboardWidget`는 global slot
     - 요구 capability는 `ui.dashboardWidget.register`
   - `/tmp/paperclip-src/server/src/services/plugin-capability-validator.ts`
     - `UI_SLOT_CAPABILITIES.dashboardWidget = "ui.dashboardWidget.register"`
2. Dashboard host 렌더링
   - `/tmp/paperclip-src/ui/src/pages/Dashboard.tsx`
     - `PluginSlotOutlet`가 `slotTypes={["dashboardWidget"]}` 로 메인 대시보드에서 ready plugin widget을 렌더링
3. Plugin 관리 라우트
   - `/tmp/paperclip-src/server/src/routes/plugins.ts`
     - `/plugins`, `/plugins/ui-contributions`, `/plugins/install`, `/plugins/:pluginId/bridge/*` 모두 `assertBoard(req)` 사용
     - 별도 approval 생성/연결 로직 없음
4. 회사 승인 정책 적용 위치
   - `/tmp/paperclip-src/server/src/routes/agents.ts`
     - `company.requireBoardApprovalForNewAgents` 를 읽어 새 agent status를 `pending_approval` 로 결정
     - 이어서 `approvalsSvc.create(... type: "hire_agent")` 호출
   - 동일한 승인 로직이 plugin/widget route에는 없음

## 실험
- 사전 상태
  - `GET /api/companies/{companyId}/approvals` 결과: `count=0`, `pending=0`
- 더미 widget 등록 시도
  - `plugins/doro-office/src/manifest.ts` 는 이미 `ui.dashboardWidget.register` + `dashboardWidget` slot을 선언
  - root `manifest.json`도 동일하게 맞춘 뒤 `npm run build`
  - `paperclipai plugin uninstall dororong.doro-office`
  - `paperclipai plugin install --local ./plugins/doro-office`
- 결과
  - approval 개수는 재설치 전후 모두 `count=0`, `pending=0`
  - 즉 widget 등록 때문에 approval가 생성되지는 않음
  - 다만 live plugin registry / `GET /api/plugins/ui-contributions` 응답은 기존 page+sidebar만 노출해 dashboardWidget을 즉시 반영하지 못했음
  - source/instance 파일에는 `dashboardWidget` slot과 `ui.dashboardWidget.register`가 존재하므로, 이는 승인 정책 문제가 아니라 plugin manifest refresh/cache 계열 별도 결함으로 판단됨

## MVP-3 판단
- widget 승인 프로세스는 별도 필요 없음
- 블로커 여부: 승인 관점에서는 비블로커
- 단, 실제 노출 검증 전에는 아래 운영 메모를 확인할 것

## 운영 메모
- 현재 로컬 실험에서는 plugin reinstall 후 `ui-contributions`가 즉시 최신 manifest를 반영하지 않는 현상이 있었다.
- 따라서 MVP-3 착수 전 체크리스트:
  1. plugin reinstall 후 `GET /api/plugins/ui-contributions` 에 `dashboardWidget` slot이 보이는지 확인
  2. 안 보이면 plugin registry/manifest refresh 버그를 별도 이슈로 분리
  3. 권한 이슈로 오인하지 말고 plugin reload/runtime cache 문제로 추적
