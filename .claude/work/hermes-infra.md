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
---

## 2026-04-10: Hermes Agent 모니터링 초안 설계 [done]
- **What**: Hermes/Paperclip/Slack/cron 상태를 한 번에 수집하는 `scripts/hermes_monitor.py`와 설계 문서, `/hermes-status` 연계 흐름을 추가
- **Why**: heartbeat 지연, gateway 다운, Slack 충돌을 개별 명령으로만 확인하면 장애 탐지 속도가 느려 일관된 스냅샷이 필요함
- **Impact**: 운영자가 `#sprint-planning` 알림과 `/hermes-status`를 같은 데이터 소스로 확인 가능
- **Test**: `python3 scripts/hermes_monitor.py --write-snapshot .claude/tmp/hermes-monitor/latest.json`; 결과에서 6개 gateway, Paperclip health, stale heartbeat, Slack conflict 로그 감지 확인
- **Next**: launchd plist와 Slack webhook 시크릿 주입을 운영 환경에 연결해야 주기 알림이 자동화됨
---

## 2026-04-10: Paperclip 외부 접속 복구 + 5개 게이트웨이 복원 [done]
- **What**: cloudflared 중복 커넥터 정리(root/user 2개 → root 1개), 5개 프로필에서 Slack 토큰 제거하여 게이트웨이 startup 충돌 해소
- **Why**: paperclip.dororong.dev 외부 접속이 404. 원인 추적: (a) 3/28부터 재시작 안 된 root cloudflared 커넥터가 오래된 라우팅 유지 (b) 5개 게이트웨이가 동일 Slack 토큰 공유로 Socket Mode 충돌 → startup non-retryable exit → heartbeat 주체인 게이트웨이 부재
- **Impact**: 외부 접속 복구, 5개 프로필 heartbeat 재개. backend만 Slack 담당, 나머지 5개는 Slack 없이 cron+heartbeat만 실행
- **Test**: `curl https://paperclip.dororong.dev/api/health` 200 확인. 6개 게이트웨이 PID 전부 active. DOR-5 픽업→완료 흐름 검증
- **Trap**: Paperclip heartbeat 에러 로그(ECONNREFUSED:54329)가 오래된 기록이라 현재 문제 착각 → 최신 heartbeat-runs API로 확인 후 교차 검증 / Mac Mini 내부 curl은 200인데 외부 브라우저는 404 → Cloudflare 엣지 라우팅이 두 커넥터 중 다른 쪽으로 분산된 것. root 커넥터 재시작으로 해결
---

## 2026-04-10: Agent Harness 구조 구축 (AGENTS.md + rules/ + STATE sync) [done]
- **What**: AIJOB을 Hermes 프로필 템플릿 레포로 재구성. `.claude/profiles/{_common,orchestrator,backend,frontend,qa,devops,data}/` 구조로 SOUL + AGENTS.md.part + STATE/CONTEXT/DECISIONS 템플릿 정립. `hooks/hermes-profile-sync.sh`로 `AIJOB → ~/.hermes/profiles/{p}/` 단방향 배포. 각 프로필에 `rules/*.md` 9종 복제. `{profile}` placeholder 치환으로 프로필별 경로 자동 삽입. 6개 Paperclip 에이전트에 `adapterConfig.cwd` 추가
- **Why**: 회사 Claude Code의 `CLAUDE.md + rules/ + STATE/CONTEXT/DECISIONS` 컨텍스트 로딩 패턴을 codex 기반 Hermes 에이전트에 이식. 2026년 agent harness 업계 표준(OpenHarness, everything-claude-code, AGENTS.md 오픈 표준)과 일치. Hermes는 cwd의 AGENTS.md 하나만 자동 로드하므로 rules/*.md는 AGENTS.md의 "cat 지시"로 runtime 로드. STATE.md는 동적 파일이라 merge 대신 cat 방식 선택
- **Impact**: 6개 에이전트가 SOUL(정체성) + AGENTS(공통 규정 + 프로필 특화) + STATE/CONTEXT/DECISIONS(동적 상태)를 매 heartbeat run마다 로드. 규정 수정은 AIJOB rules/만 편집 후 sync. STATE는 에이전트 자율 갱신 + 런타임 편집 보존
- **Test**: orchestrator E2E(DOR-6) — 복합 이슈 1개 → 3개 하위 이슈(DOR-8/9/10) 자동 분해 + 도메인별 정확한 에이전트 배정 + parentId 연결 + 분배 보고 코멘트 + 의존성 인식(DOR-10 backlog 유지). orchestrator "본인 구현 금지" 원칙 준수
- **Trap**: 초기 오해 — Codex CLI의 AGENTS.md 규약과 Hermes 네이티브 AGENTS.md를 혼동. Hermes는 openai-codex provider를 쓰지만 Codex CLI subprocess가 아니라 `https://chatgpt.com/backend-api/codex` HTTP API 직접 호출. AGENTS.md는 Hermes 자체 `build_context_files_prompt()` 기능. 웹 서치로 정정 후 설계 재조정 / adapter promptTemplate 커스터마이징 제안 → 업데이트 호환성 논의 끝에 SOUL/AGENTS.md 파일 기반 전환(adapter 무관)
- **[DEBT]**: Paperclip 서버가 `adapterConfig.cwd`를 확인 않고 자체 fallback workspace 결정 → adapter는 config.cwd 우선이지만 Paperclip warning 로그 혼란. Hermes subprocess 실제 cwd 검증 필요. DOR-8 등 진행 중 이슈 완료 후 pwd 결과로 확정 가능
