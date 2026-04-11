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
for base in ('http://localhost:3100', 'http://localhost:3101', 'https://paperclip.dororong.dev'):
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
   curl -s -X DELETE "http://localhost:3100/api/plugins/dororong.doro-office?purge=true" \
     -H "Authorization: Bearer ${PAPERCLIP_TOKEN}"

   curl -s -X POST "http://localhost:3100/api/plugins/install" \
     -H "Authorization: Bearer ${PAPERCLIP_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"packageName":"/Users/yuseungju/AIJOB/plugins/doro-office","isLocalPath":true}'
   ```
5. 설치 결과 확인
   ```sh
   curl -s -H "Authorization: Bearer ${PAPERCLIP_TOKEN}" "http://localhost:3100/api/plugins" \
     | jq '.[] | select(.pluginKey=="dororong.doro-office")'
   ```
6. Paperclip UI에서 회사 컨텍스트를 연 뒤 사이드바의 `Doro Office` 진입점을 확인합니다.
7. `/office` 페이지에서 최대 7개의 카드가 placeholder 원형 + 이름 + status text + heartbeat로 렌더링되는지 확인합니다.
8. 에이전트 상태를 바꾸거나 heartbeat를 발생시킨 뒤 10초 이내에 카드 상태가 갱신되는지 확인합니다.

## 현재 포함 범위

- strict mode TypeScript 설정
- Vite 기반 worker / manifest / UI 번들 빌드
- Tailwind 4 prefix(`do:` variant) 설정
- Page + Sidebar slot UI
- Worker의 `/api/companies/{id}/agents` 10초 폴링 + refresh action
- placeholder 원형 + 이름 + status text + heartbeat age 카드 7개
- 수동 새로고침과 기본 로딩/오류/빈 상태 UI

## 제외 범위

- dashboard widget
- 타임라인 / 실시간 diff 애니메이션
- Tauri 래핑
- 유료 에셋 구매 기반 스킨
- 오피스 SVG 배경과 좌석 좌표 배치
- 표시 옵션 / 말풍선 / 오류 강조 설정
