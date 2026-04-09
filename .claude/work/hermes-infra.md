# Hermes 인프라 작업 이력

> Hermes Agent + Paperclip 인프라 관련 작업 기록

---

## 2026-04-07~09: OpenClaw → Hermes+Paperclip 전환 [done]
- **What**: 에이전트 런타임을 OpenClaw에서 Hermes Agent v0.8.0 + Paperclip으로 전면 전환
- **Why**: Hermes가 프로필/게이트웨이/cron/메모리를 네이티브 지원, Paperclip이 이슈 기반 핸드오프로 에이전트 간 조율. OpenClaw는 에이전트 간 통신 제약 + 학습 루프 부재
- **Impact**: 전체 멀티에이전트 파이프라인. 6개 에이전트 등록, gpt-5.4(openai-codex)
- **Test**: Backend→QA 핸드오프 E2E 성공 (DOR-3→DOR-4). Cron 즉시 실행 테스트 통과. Hermes 미설치 환경 hook 가드 미검증
- **Trap**: Paperclip CLI에 `company create` 없음→API 직접 호출 / cloudflared plist에 `tunnel run` 인자 누락→수동 추가 / 이슈 `body` vs `description` 필드 혼동→backlog에서 픽업 안 됨
---

## 2026-04-09: AIJOB hermes 브랜치 리팩토링 [done]
- **What**: Jira/Confluence 제거, Paperclip/LLM Wiki/Hermes 정책 추가, commands→skills 마이그레이션
- **Why**: hermes 브랜치를 새 스택(Hermes+Paperclip+Obsidian)에 맞는 독립 템플릿으로 전환. work 브랜치와 분리하여 Jira 유지
- **Impact**: hermes 브랜치에서 Jira 의존성 완전 제거. 6개 Agent Skills 표준 적용
- **Test**: 파일 구조 검증 완료. skills frontmatter 유효. Jira 회귀 테스트는 work 브랜치에서 별도 필요
