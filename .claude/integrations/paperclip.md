# Paperclip 연동

> 최종 업데이트: 2026-04-09

---

## 접속 정보
- URL: https://paperclip.dororong.dev
- API: https://paperclip.dororong.dev/api
- Health: https://paperclip.dororong.dev/api/health
- 운영: Mac Mini 전용 (다른 머신에서는 클라이언트 접속만)

## 인증
- 모드: authenticated (Better Auth)
- CLI 인증: `npx paperclipai auth login`
- 토큰 파일: `~/.paperclip/auth.json`
- Agent JWT: `PAPERCLIP_AGENT_JWT_SECRET` 환경변수

## Company
- ID: `abac28ea-9edd-4ddb-b40a-0baf52505357`
- Name: dororong (prefix: DOR)

## Projects
- `AIJOB` (`urlKey=aijob`) — 템플릿, agent harness, 운영 규정, Paperclip 체계 자체 변경
- `Hermes Infra` (`urlKey=hermes-infra`) — Hermes gateway, Paperclip 운영, 모니터링, `/hermes-status`
- `AivaLink` (`urlKey=aivalink`) — 제품 기능/API/UI/E2E 워크스트림
- 신규 이슈는 생성 전에 project를 조회하고 `projectId`를 반드시 지정한다.

## 에이전트 관리
```bash
npx paperclipai agent list
npx paperclipai issue create --company-id <id> --title "..." --description "..." --assignee-agent-id <id> --status todo
npx paperclipai issue list
npx paperclipai issue get DOR-N
npx paperclipai issue update <id> --status done
npx paperclipai api get /companies/<id>/projects
```

## Adapter
- hermes_local: Paperclip 서버에 빌트인
- 에이전트 등록 시 `adapterType: "hermes_local"`, `adapterConfig.hermesCommand: "<profile>"`

## 이슈 상태 흐름
```
backlog → todo → in_progress → done
```
- `backlog`에서는 heartbeat가 픽업하지 않음 — `todo`로 설정 필요
- `description` 필드에 작업 내용 작성 (body 아님)
