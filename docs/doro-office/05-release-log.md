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
