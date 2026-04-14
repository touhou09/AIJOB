# Doro Office

Paperclip 안에서 Hermes 에이전트 상태를 오피스 레이아웃, 최근 이벤트 timeline, dashboard widget으로 보여 주는 `doro-office` 플러그인입니다.

## 개발 요구사항

- Node.js 20+
- npm 10+
- 실행 중인 Paperclip 인스턴스

## 로컬 설치 절차

1. 의존성 설치
   - `npm install`
2. 플러그인 빌드
   - `npm run build`
3. board token 로드
   ```sh
   export PAPERCLIP_TOKEN="<~/.paperclip/auth.json 에서 읽은 token>"
   ```
4. 기존 플러그인 제거 후 현재 디렉터리를 로컬 경로로 재설치
   ```sh
   curl -s -X DELETE "http://localhost:3101/api/plugins/dororong.doro-office?purge=true" \
     -H "Authorization: Bearer <paperclip-token>"

   curl -s -X POST "http://localhost:3101/api/plugins/install" \
     -H "Authorization: Bearer <paperclip-token>" \
     -H "Content-Type: application/json" \
     -d "{\"packageName\":\"$(pwd)\",\"isLocalPath\":true}"
   ```
5. 설치 결과 확인
   ```sh
   curl -s -H "Authorization: Bearer <paperclip-token>" "http://localhost:3101/api/plugins" \
     | python3 -c 'import json,sys; plugins=json.load(sys.stdin); rows=[{"pluginKey":p["pluginKey"],"status":p["status"],"packageVersion":p["version"],"manifestVersion":p["manifestJson"]["version"],"manifestDescription":p["manifestJson"]["description"]} for p in plugins if p["pluginKey"]=="dororong.doro-office"]; print(json.dumps(rows, ensure_ascii=False, indent=2))'
   ```
6. UI contribution 확인
   ```sh
   curl -s -H "Authorization: Bearer <paperclip-token>" "http://localhost:3101/api/plugins/ui-contributions" \
     | python3 -c 'import json,sys; rows=[c for c in json.load(sys.stdin) if c["pluginKey"]=="dororong.doro-office"]; print(json.dumps(rows, ensure_ascii=False, indent=2))'
   ```
7. Paperclip UI에서 회사 컨텍스트를 연 뒤 사이드바의 `Doro Office` 진입점을 확인합니다.
8. `/office` 페이지에서 오피스 배경 위 7개 좌석 카드가 지정 좌표로 배치되는지 확인합니다.
9. `표시 옵션` 탭에서 말풍선 표시와 오류 상태 강조 토글, `selectedSkin` 선택 버튼이 동작하는지 확인합니다.
10. `~/.hermes/skins/<skin-id>/skin.json`에 추가한 커스텀 스킨이 `스킨 선택` 섹션에 노출되고, 선택 즉시 오피스 캐릭터 렌더링에 반영되는지 확인합니다.
11. 에이전트 상태를 바꾸거나 heartbeat를 발생시킨 뒤 1초 이내에 좌석 카드와 widget 요약이 갱신되는지 확인합니다.

## 현재 포함 범위

- strict mode TypeScript 설정
- Vite 기반 worker / manifest / UI 번들 빌드
- Tailwind 4 prefix(`do:` variant) 설정
- Page + Sidebar + Dashboard widget slot UI
- Worker의 `/api/companies/{id}/agents` 1초 폴링 + refresh action
- SVG 오피스 배경과 7개 좌석 고정 좌표 배치
- `표시 옵션` 탭의 말풍선 / 오류 강조 토글
- `selectedSkin` 상태와 `~/.hermes/skins` 기반 커스텀 스킨 선택 UI
- 선택한 스킨의 상태별 에셋을 사용하는 오피스 캐릭터 렌더링
- overflow roster fallback 카드 리스트
- 최근 이벤트 timeline
- 수동 새로고침과 기본 로딩/오류/빈 상태 UI

## 제외 범위

- Tauri 래핑
- 유료 에셋 구매 기반 스킨
- Paperclip core 수정

## 레이아웃 / 설정 구조

1. 오피스 뷰는 `OFFICE_SEATS` 7개 좌석에 에이전트를 순서대로 배치합니다.
2. 좌석 수를 초과한 에이전트는 오른쪽 `overflow roster` 카드 리스트로 안전하게 노출합니다.
3. `표시 옵션` 탭에서는 말풍선 표시와 오류 상태 강조를 켜고 끌 수 있습니다.
4. 같은 탭의 `스킨 선택` 섹션에서 기본 도로롱 또는 `~/.hermes/skins`에 추가한 커스텀 스킨을 선택할 수 있습니다.
5. 사이드바는 빠른 요약을 위해 카드 리스트만 렌더링하고, 상세 레이아웃과 스킨 선택 결과는 페이지 뷰에서 제공합니다.
6. dashboard widget은 working/error/idle 집계와 7개 미니 avatar를 같은 roster payload로 보여 줍니다.

## 상태 표시 규칙

1. worker는 `agents.read`만 사용해 회사 roster를 1초마다 다시 읽습니다.
2. poll 또는 manual refresh 실패 시 worker가 `AgentRosterState.error`를 data 응답에 포함해 UI가 오류 상태를 즉시 표시합니다.
3. 오류 화면의 `다시 시도` 버튼은 worker action을 호출해 즉시 재조회합니다.
4. page와 widget은 동일한 자동 갱신 hook으로 stale 상태 없이 같은 최신 roster payload를 사용합니다.
5. page 뷰는 이전 roster와 새 roster의 status diff를 비교해 최근 10건의 timeline을 유지합니다.
