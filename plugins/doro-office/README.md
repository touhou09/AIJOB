# Doro Office

Paperclip 안에서 Hermes 에이전트 상태를 시각화하기 위한 `doro-office` 플러그인 스켈레톤입니다.

## 개발 요구사항

- Node.js 20+
- npm 10+
- 실행 중인 Paperclip 인스턴스

## 로컬 설치 절차

1. 의존성 설치
   - `npm install`
2. 플러그인 빌드
   - `npm run build`
3. Paperclip에 로컬 설치
   - `paperclipai plugin install --local ./plugins/doro-office`
4. Paperclip UI에서 회사 컨텍스트를 연 뒤 사이드바의 `Doro Office` 진입점을 확인합니다.
5. `/office` 페이지를 열어 실제 회사 에이전트 7명이 카드 그리드로 보이는지 확인합니다.
6. 에이전트 상태를 바꾸거나 heartbeat를 발생시킨 뒤 10초 이내에 status 텍스트가 갱신되는지 확인합니다.

## 현재 포함 범위

- strict mode TypeScript 설정
- Vite 기반 worker / manifest / UI 번들 빌드
- Tailwind 4 prefix(`do:` variant) 설정
- Page + Sidebar slot 에이전트 카드 UI
- Worker의 `/api/companies/{id}/agents` 10초 폴링
- 변경 감지 시 SSE stream으로 UI에 상태 push
- 새로고침 버튼과 기본 오류/빈 상태 UI
