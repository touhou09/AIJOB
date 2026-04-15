# doro-office 릴리즈 기록

> 이 문서는 `v0.0.1` 태그와 배포/검증 근거를 묶는 운영 기록이다.

## v0.0.1

- **태그**: `v0.0.1`
- **태그 대상 커밋**: `8db308c802e2e3c905522f9b693b7f8fc781c0a6` (`feat(SCRUM-46): normalize openclaw roster adapter`)
- **태그 메시지**: `v0.0.1 release`
- **검증 근거**
  - `plugins/doro-office/README.md`의 로컬 설치 절차로 빌드/재설치/노출 여부를 확인한다.
  - `plugins/doro-office/package.json` 및 `manifest.json` 현재 버전은 `0.1.4`이지만, 이번 태그는 배포 기준점 고정용으로 별도 생성한다.
- **배포 기록**
  - 로컬 경로 설치를 통한 Paperclip 플러그인 재설치 절차를 기준으로 운영한다.
  - 대시보드 widget / page / sidebar 노출은 `plugins/doro-office/README.md`의 확인 절차를 따른다.
- **증거 명령**
  - `git tag -a v0.0.1 -m "v0.0.1 release"`
  - `git show --stat --decorate v0.0.1`

## SCRUM-71 QA

- **날짜**: 2026-04-15
- **결과**: PASS
- **브랜치/커밋**: `scrum-46-openclaw` / `fcc6f08`
- **검증 명령**
  - `bun run test`
  - `bun run lint`
  - `bun run typecheck`
  - `bun run build`
- **요약**: 오피스 레이아웃, overflow roster, 설정 토글, 1초 폴링, worker bridge, OpenClaw roster normalization 경로가 모두 테스트와 빌드에서 통과했다.

## SCRUM-91 Root checkout fix

- **날짜**: 2026-04-15
- **결과**: PASS
- **기준점**: `~/workspace/doro-office-scrum-46` checkout을 실제 실행 기준으로 고정
- **반영 파일**
  - `docs/doro-office/03-doro-office-plan.md`
  - `docs/doro-office/README.md`
  - `docs/doro-office/04-decisions-snapshot.md`
- **검증 명령**
  - `git diff -- docs/doro-office/03-doro-office-plan.md docs/doro-office/README.md docs/doro-office/04-decisions-snapshot.md docs/doro-office/05-release-log.md`
  - `search_files(pattern="~/AIJOB/plugins/doro-office", target="content", path="/Users/yuseungju/workspace/doro-office-scrum-46")`
- **요약**: 문서 기준 경로를 `~/workspace/doro-office-scrum-46/plugins/doro-office`로 정정해 root checkout의 실제 main 실행 기준을 현재 workspace checkout에 고정했다.
