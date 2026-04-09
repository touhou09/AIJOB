# 현재 프로젝트 상태

> 최종 업데이트: 2026-04-09

## 현재 상태
- AIJOB hermes 브랜치 리팩토링 진행 중
- Hermes v0.8.0 + backend 프로필 활성
- Paperclip authenticated + dororong company
- LLM Wiki 초기화 필요

## 인프라 현황

| 컴포넌트 | 상태 | 비고 |
|---------|------|------|
| Hermes Agent v0.8.0 | 실행 중 | backend 프로필 활성 |
| Hermes Gateway | 실행 중 | launchd ai.hermes.gateway-backend |
| Paperclip 2026.403.0 | 실행 중 | https://paperclip.dororong.dev |
| Memvid MCP | 연결됨 | Hermes config에서 관리 |
| LLM Wiki | 미초기화 | ~/wiki 경로 예정 |
| OpenClaw | 아카이브 | ~/.openclaw.pre-migration |

## Cron Jobs

| Job | 스케줄 | Slack 채널 |
|-----|--------|-----------|
| hermes-updates | 매일 9AM KST | C0AQVFM1K1Q |
| noon-ib-wsj | 매일 12PM KST | C0AQVFM1K1Q |

## 다음 작업
- 리팩토링 완료 후 커밋
- LLM Wiki 초기화
- 나머지 프로필 5개 생성 + Paperclip 등록
