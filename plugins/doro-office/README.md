# Doro Office

Paperclip 안에서 Hermes 에이전트 상태를 카드 그리드로 보여 주는 `doro-office` 플러그인입니다.

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
   export PAPERCLIP_TOKEN="$(python3 - <<'PY'
import json, os
with open(os.path.expanduser('~/.paperclip/auth.json')) as f:
    data = json.load(f)
for base in ('http://localhost:3101', 'http://localhost:3100', 'https://paperclip.dororong.dev'):
    info = data.get('credentials', {}).get(base)
    if info and info.get('token'):
        print(info['token'])
        raise SystemExit
raise SystemExit('Paperclip token not found in ~/.paperclip/auth.json')
PY
)"
   ```
4. 기존 플러그인 제거 후 로컬 경로 재설치
   ```sh
   curl -s -X DELETE "http://localhost:3101/api/plugins/dororong.doro-office?purge=true" \
     -H "Authorization: Bearer ${PAPERCLIP_TOKEN}"

   curl -s -X POST "http://localhost:3101/api/plugins/install" \
     -H "Authorization: Bearer ${PAPERCLIP_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"packageName":"/Users/yuseungju/AIJOB/plugins/doro-office","isLocalPath":true}'
   ```
5. 설치 결과 확인
   ```sh
   curl -s -H "Authorization: Bearer ${PAPERCLIP_TOKEN}" "http://localhost:3101/api/plugins" \
     | jq '.[] | select(.pluginKey=="dororong.doro-office")'
   ```
6. Paperclip UI에서 회사 컨텍스트를 연 뒤 사이드바의 `Doro Office` 진입점을 확인합니다.
7. `/office` 페이지에서 에이전트 카드가 최대 7개까지 표시되고, 각 카드에 placeholder 원형 + 이름 + 상태 텍스트가 보이는지 확인합니다.
8. 에이전트 상태를 바꾸거나 heartbeat를 발생시킨 뒤 10초 이내에 카드의 status text가 갱신되는지 확인합니다.

## 현재 포함 범위

- strict mode TypeScript 설정
- Vite 기반 worker / manifest / UI 번들 빌드
- Tailwind 4 prefix(`do:` variant) 설정
- Page + Sidebar slot UI
- Worker의 `/api/companies/{id}/agents` 10초 폴링 + refresh action
- Page에서 최대 7개, Sidebar에서 최대 4개의 에이전트 카드 렌더
- placeholder 원형 + 이름 + 상태 텍스트 + heartbeat를 담은 카드 UI
- 수동 새로고침과 기본 로딩/오류/빈 상태 UI

## 제외 범위

- Character SVG 컴포넌트, 도로롱 스킨, 애니메이션
- 말풍선, 상태 머신 매핑
- 오피스 SVG 배경, 데스크 좌표, overflow roster
- 설정 페이지, 표시 옵션 토글
- dashboard widget
- 타임라인 / 실시간 diff 애니메이션
- Tauri 래핑
- 유료 에셋 구매 기반 스킨

## 상태 표시 규칙

1. worker는 `agents.read`만 사용해 회사 roster를 10초마다 다시 읽습니다.
2. poll 또는 manual refresh 실패 시 worker가 `AgentRosterState.error`를 data 응답에 포함해 UI가 오류 상태를 즉시 표시합니다.
3. 오류 화면의 `다시 시도` 버튼은 worker action을 호출해 즉시 재조회합니다.
4. page와 sidebar는 같은 roster payload를 카드 그리드 형태로 렌더링합니다.
