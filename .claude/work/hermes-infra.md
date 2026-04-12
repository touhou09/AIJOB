# Hermes 인프라 작업 이력

> Hermes Agent + Paperclip 인프라 관련 작업 기록

---

## 2026-04-11: CTO 리뷰 루프 진단 + 엄격도 조정 설계 [in-progress]
- **What**: DOR-33 README 6회 반송 패턴 진단 + 2026-04 기준 AI code review 업계 리서치 + 3가지 조정안(A 심각도 3-tier / B skip 확대 / C 3단 에스컬레이션) 도출
- **Why**: 현재 CTO는 2단계 판정(PASS/CHANGES_REQUESTED/BLOCKED)에 문서 전용 변경도 풀 10항목 체크리스트를 동일 적용. 단일 README 티켓에 반나절 + `bash -n`/lint/typecheck/test/build/plugin install/metadata 재검증 6회 반복. 2026년 업계 표준은 Anthropic Code Review의 Important/Nit/Pre-existing 3-tier, Qodo의 "security·correctness만 블록", ADK의 수렴 기반 루프 종료
- **Impact**: doro-office EPIC 전체 속도. DOR-34는 DOR-33 통과 대기로 `blocked`. 설계 미반영 시 이후 모든 문서/UI 티켓이 동일 루프 진입
- **Test**: 현재 `plugins/doro-office/README.md`를 `bash -n`으로 검증 — syntax error 0, `${PAPE...EN}` placeholder 0, 하드코딩 `/Users/yuseungju/` 경로 0. 실제로는 PASS 가능 상태. CTO 리뷰 큐는 현재 비어 있고 frontend가 방금 in_review로 재핸드오프
- **Trap**: 초안 "3회 후 user 에스컬레이션" 제안 → user가 "자동개발 중단 문제" 지적 → orchestrator를 중재자로 두고 수렴 체크(같은 지적 2회 반복 시만) + 최대 5라운드 + skip-cto-review 자동 강제 경로로 수정. user 개입은 최후 5% 미만으로 설계
- **Next**: A/B/C 적용 범위 결정 → `cto-review-checklist.md` + `paperclip-policy.md` 개정 → DOR-33 수동 PASS 또는 개정 후 재처리. 가장 가벼운 변경은 B(skip 확대) 한 줄 추가, 가장 구조적 변경은 C(에스컬레이션). 사용자 선택 대기
- **[DEBT]**: DOR-33 여전히 in_review 상태로 다음 라운드 대기 중. 설계 결정 전에 CTO가 자력 PASS 낼 수도 있음 — 결정 전 수동 개입 금지
---

## 2026-04-11: [auto] DOR-34 doro-office MVP-3 실시간 반영과 widget surface 확장 [done]
- **What**: worker/UI 자동 갱신 주기를 5초로 낮추고 `OfficePage`에 status diff 기반 recent event timeline을 추가했으며, `PulseWidget` dashboard widget과 `ui.dashboardWidget.register` slot을 구현했다.
- **Why**: DOR-34 완료 조건은 1초 이내에 가까운 빠른 반영, 최근 이벤트 표시, dashboard widget 노출, 운영 문서 정리를 함께 요구했다. stream bridge에 의존하지 않고 plugin-only surface 안에서 이를 닫는 편이 현재 Paperclip 환경과 가장 잘 맞는다.
- **Impact**: `/office` 페이지는 7석 오피스 레이아웃 + timeline + overflow roster를 함께 보여 주고, dashboard에는 working/error/idle 요약 위젯이 추가된다. stream 미지원 환경에서도 5초 polling fallback으로 상태 가시성이 유지된다.
- **Test**: `npm run lint`; `npm run typecheck`; `npm run test` (28 tests); `npm run build`; `DELETE /api/plugins/dororong.doro-office?purge=true`; `POST /api/plugins/install`; `GET /api/plugins/ui-contributions`; `GET /api/plugins/dororong.doro-office`.
- **Next**: CTO 리뷰 결과에 따라 widget/timeline copy 또는 Tauri 판단 문구만 미세 조정 가능.
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

## 2026-04-10: Hermes 모니터 launchd 배포 경로 고정 [done]
- **What**: `ai.hermes.monitor.plist.example`를 추가하고 수집 스냅샷에 Slack 알림 배달 결과를 함께 저장하도록 `scripts/hermes_monitor.py`와 운영 런북/아키텍처 문서를 정리
- **Why**: 기존 초안은 주기 실행용 launchd 정의가 저장소에 없고 `--notify --write-snapshot` 조합에서 마지막 Slack 배달 상태가 스냅샷에 남지 않아 운영 검증이 어려웠음
- **Impact**: Mac launchd 기준 5분 주기 수집/알림 배포 경로가 IaC로 고정되고 `/hermes-status` 또는 운영자가 JSON 하나로 수집 결과와 배달 상태를 함께 확인 가능
- **Test**: `python3 -m py_compile scripts/hermes_monitor.py`; `python3 scripts/hermes_monitor.py --notify --write-snapshot .claude/tmp/hermes-monitor/latest.json` 실행 후 `notification.message=skipped`와 alert 목록 persisted 확인
---

## 2026-04-10: Paperclip 외부 접속 복구 + 5개 게이트웨이 복원 [done]
- **What**: cloudflared 중복 커넥터 정리(root/user 2개 → root 1개), 5개 프로필에서 Slack 토큰 제거하여 게이트웨이 startup 충돌 해소
- **Why**: paperclip.dororong.dev 외부 접속이 404. 원인 추적: (a) 3/28부터 재시작 안 된 root cloudflared 커넥터가 오래된 라우팅 유지 (b) 5개 게이트웨이가 동일 Slack 토큰 공유로 Socket Mode 충돌 → startup non-retryable exit → heartbeat 주체인 게이트웨이 부재
- **Impact**: 외부 접속 복구, 5개 프로필 heartbeat 재개. backend만 Slack 담당, 나머지 5개는 Slack 없이 cron+heartbeat만 실행
- **Test**: `curl https://paperclip.dororong.dev/api/health` 200 확인. 6개 게이트웨이 PID 전부 active. DOR-5 픽업→완료 흐름 검증
- **Trap**: Paperclip heartbeat 에러 로그(ECONNREFUSED:54329)가 오래된 기록이라 현재 문제 착각 → 최신 heartbeat-runs API로 확인 후 교차 검증 / Mac Mini 내부 curl은 200인데 외부 브라우저는 404 → Cloudflare 엣지 라우팅이 두 커넥터 중 다른 쪽으로 분산된 것. root 커넥터 재시작으로 해결
---

## 2026-04-10: AGENTS.md 자동 로드 버그 수정 — workspace symlink [done]
- **What**: `hermes-profile-sync.sh`에 `workspace/AGENTS.md -> ../AGENTS.md` symlink 생성 단계 추가. DOR-5 롤백 E2E 성공 (orchestrator가 본인 구현 없이 3개 하위 이슈로 분해: devops/backend/qa)
- **Why**: Hermes `_load_agents_md()`가 cwd 자체에만 있는 AGENTS.md를 로드(parent walk 안 함, 문서와 구현 다름). cwd가 `workspace/`인데 AGENTS.md는 한 단계 위에 있어서 자동 로드 실패. 결과적으로 orchestrator가 SOUL/AGENTS 원칙 무시하고 이전 세션 맥락(session resume)으로 이미 완료된 작업을 다시 done 처리
- **Impact**: 6개 프로필 전부 AGENTS.md 자동 로드 정상화. orchestrator 자율 분해/분배 워크플로우 검증 완료 (DOR-5 → DOR-13/14/15)
- **Test**: DOR-12 진단 이슈로 cwd 확인 + AGENTS.md 로드 여부 확인 → "no agents.md block in system prompt" 확인. symlink 추가 후 DOR-5 rollback → orchestrator가 3개 하위 이슈 생성 + 분배 코멘트 남김 + in_progress 유지 (코디네이터 상태)
- **Trap**: (1) cwd가 올바르지만 AGENTS.md가 cwd/ 하위가 아니라 cwd/.. 에 있어서 Hermes `_load_agents_md`(`top-level only, no recursive walk`)가 못 찾음. Hermes 문서에는 "parent walk up to 5 levels"라고 적혀있지만 구현과 다름. (2) `persistSession=true` 상태라 session resume으로 이전 완료 맥락 유지, 롤백 지시 코멘트를 "이미 해결된 것"으로 해석. `persistSession=false` 전환으로 해결. 운영 적용 시 재검토 필요

---

## 2026-04-10: /hermes-status 통합 조회 인터페이스 추가 [done]
- **What**: `scripts/hermes_status.py`를 추가해 모니터 스냅샷 캐시를 우선 재사용하고 stale 시 live refresh 후 agent/profile별 상태를 한 화면에 요약하도록 구성. `/hermes-status` skill, 아키텍처 문서, 운영 런북도 새 인터페이스 기준으로 갱신
- **Why**: 기존 스킬 초안은 수집 명령 나열에 가까워 운영자가 heartbeat/open issue/slack/cron 상태를 직접 조합해야 했다. 동일 데이터 소스를 재사용하는 조회 전용 인터페이스가 있어야 대응 속도가 빨라짐
- **Impact**: 운영자가 `python3 scripts/hermes_status.py` 또는 `/hermes-status`로 gateway 상태, stale heartbeat, agent별 issue 현황, profile별 slack/cron 상태를 즉시 확인 가능
- **Test**: `python3 scripts/hermes_status.py --refresh`; `python3 scripts/hermes_status.py`; `python3 -m unittest tests.test_hermes_status -v`; `python3 -m py_compile scripts/hermes_status.py scripts/hermes_monitor.py tests/test_hermes_status.py`
---

## 2026-04-10: CTO 리뷰 레이어 구축 + E2E 검증 [done]
- **What**: 7번째 프로필 `team-cto` 추가. 구현 엔지니어(backend/frontend/data/devops) 완료 시 `[impl-done]` 코멘트 + `in_review` 전환 + team-cto 재할당. CTO는 10개 체크리스트 + HubSpot judge 원칙으로 리뷰 → PASS/CHANGES_REQUESTED/BLOCKED 판정. `rules/cto-review-checklist.md` 신규 (Paperclip 공식 CTO 워크플로우 + ChatDev 7-role 차용)
- **Why**: 현재 구조에는 코드/아키텍처 리뷰어 부재. team-qa는 기능 테스트만, 코드 품질/보안/아키텍처 일관성을 판단하는 레이어 없음. 2026 업계 표준(ChatDev, Paperclip 공식 워크플로우, Anthropic specialist dispatch)에서는 CTO가 기술 게이트키퍼 역할. orchestrator(CEO)는 분해/분배, CTO는 리뷰/기술 판단으로 책임 분리
- **Impact**: 5개 engineer 프로필의 완료 경로가 `in_review → CTO` 게이트 통과 필수. 보안 이슈(SQL injection/XSS/하드코딩 시크릿/no-delete 위반)는 무조건 BLOCKED + orchestrator 에스컬레이션. 피드백은 HubSpot judge 원칙으로 signal-to-noise 최적화
- **Test**: DOR-16 E2E — backend가 `get_user_by_email` 구현 → `[impl-done]` 코멘트 포맷 준수 → `in_review` + team-cto 재할당 → CTO가 comment-wake 픽업 → 10개 체크리스트 전수 + 파일:라인 구체 인용(`user_lookup.py:26-42`) + pytest/mypy/ruff 실제 재검증 → PASS → done
- **Trap**: (1) `extraArgs: ["--reasoning-effort", "high"]`를 Paperclip adapterConfig에 넣었더니 Hermes chat CLI가 인식 못 함 (`unrecognized arguments`). 해결: `~/.hermes/profiles/cto/config.yaml`의 `agent.reasoning_effort: high` 설정으로 변경, extraArgs는 빈 배열. (2) failed run 이후 CTO가 자동 재시도 안 함. `in_review` 상태는 heartbeat `{{#noTask}}` 픽업 대상(todo/backlog/in_progress)에서 제외됨. 해결: comment-wake로 트리거 (`{{#commentId}}` 모드). assignee 변경 이벤트는 초회만 즉시 wake하고 이후엔 재실행 안 함

---

## 2026-04-10: Agent Harness 구조 구축 (AGENTS.md + rules/ + STATE sync) [done]
- **What**: AIJOB을 Hermes 프로필 템플릿 레포로 재구성. `.claude/profiles/{_common,orchestrator,backend,frontend,qa,devops,data}/` 구조로 SOUL + AGENTS.md.part + STATE/CONTEXT/DECISIONS 템플릿 정립. `hooks/hermes-profile-sync.sh`로 `AIJOB → ~/.hermes/profiles/{p}/` 단방향 배포. 각 프로필에 `rules/*.md` 9종 복제. `{profile}` placeholder 치환으로 프로필별 경로 자동 삽입. 6개 Paperclip 에이전트에 `adapterConfig.cwd` 추가
- **Why**: 회사 Claude Code의 `CLAUDE.md + rules/ + STATE/CONTEXT/DECISIONS` 컨텍스트 로딩 패턴을 codex 기반 Hermes 에이전트에 이식. 2026년 agent harness 업계 표준(OpenHarness, everything-claude-code, AGENTS.md 오픈 표준)과 일치. Hermes는 cwd의 AGENTS.md 하나만 자동 로드하므로 rules/*.md는 AGENTS.md의 "cat 지시"로 runtime 로드. STATE.md는 동적 파일이라 merge 대신 cat 방식 선택
- **Impact**: 6개 에이전트가 SOUL(정체성) + AGENTS(공통 규정 + 프로필 특화) + STATE/CONTEXT/DECISIONS(동적 상태)를 매 heartbeat run마다 로드. 규정 수정은 AIJOB rules/만 편집 후 sync. STATE는 에이전트 자율 갱신 + 런타임 편집 보존
- **Test**: orchestrator E2E(DOR-6) — 복합 이슈 1개 → 3개 하위 이슈(DOR-8/9/10) 자동 분해 + 도메인별 정확한 에이전트 배정 + parentId 연결 + 분배 보고 코멘트 + 의존성 인식(DOR-10 backlog 유지). orchestrator "본인 구현 금지" 원칙 준수
- **Trap**: 초기 오해 — Codex CLI의 AGENTS.md 규약과 Hermes 네이티브 AGENTS.md를 혼동. Hermes는 openai-codex provider를 쓰지만 Codex CLI subprocess가 아니라 `https://chatgpt.com/backend-api/codex` HTTP API 직접 호출. AGENTS.md는 Hermes 자체 `build_context_files_prompt()` 기능. 웹 서치로 정정 후 설계 재조정 / adapter promptTemplate 커스터마이징 제안 → 업데이트 호환성 논의 끝에 SOUL/AGENTS.md 파일 기반 전환(adapter 무관)
- **[DEBT]**: Paperclip 서버가 `adapterConfig.cwd`를 확인 않고 자체 fallback workspace 결정 → adapter는 config.cwd 우선이지만 Paperclip warning 로그 혼란. Hermes subprocess 실제 cwd 검증 필요. DOR-8 등 진행 중 이슈 완료 후 pwd 결과로 확정 가능

---

## 2026-04-11: Paperclip project 워크스트림 초기화와 issue backfill [done]
- **What**: Paperclip에 `AIJOB`, `Hermes Infra`, `AivaLink` project를 생성하고 기존 DOR 이슈들의 `projectId`를 워크스트림 기준으로 backfill했다. 동시에 이슈 생성 규칙/공통 AGENTS/paperclip integration 문서에 `projectId 필수` 규칙을 반영하고 런타임 프로필로 sync했다.
- **Why**: 단일 company 아래 모든 이슈가 섞이면 워크스트림별 필터/집계/lead ownership이 불가능하다. company 분리를 피하면서도 운영 구분을 강제하려면 projectId를 source of truth로 만들어야 했다.
- **Impact**: DOR-5/13/14/15는 `Hermes Infra`, DOR-18/19는 `AIJOB`, DOR-6/8/9/10은 `AivaLink`로 즉시 구분된다. 이후 신규 이슈도 project 없는 생성이 규정 위반으로 간주된다.
- **Test**: `POST /api/companies/{companyId}/projects` 3회 201 확인; `PATCH /api/issues/{id}`로 DOR-1~20(취소 제외) projectId 반영; `GET /api/companies/{companyId}/issues` 재조회로 DOR-5/13/14/15/18/19/20 및 AivaLink 이슈군 projectId 확인; `bash ~/.claude/hooks/hermes-profile-sync.sh` 성공
---

## 2026-04-11: /hermes-status project 집계/필터 지원 [done]
- **What**: `scripts/hermes_monitor.py`가 Paperclip project 목록과 issue의 `projectId`를 함께 수집해 project별 open/done/blocked/recent KPI를 스냅샷에 저장하고, `scripts/hermes_status.py`에 `projects:` 섹션과 `--project <id|name|urlKey|unassigned>` 필터를 추가했다.
- **Why**: DOR-18의 project 그룹핑이 적용된 뒤에도 운영자는 전체 합계만 볼 수 있었고 project별 open/done 현황을 다시 API로 따로 조회해야 했다. `/hermes-status`에서 같은 스냅샷으로 project 단위 가시성을 바로 제공해야 운영 흐름이 닫힌다.
- **Impact**: `python3 scripts/hermes_status.py --refresh`만으로 AIJOB/AivaLink/Hermes Infra별 backlog와 최근 처리량을 즉시 확인할 수 있고, 특정 워크스트림만 보고 싶을 때 `--project aijob`처럼 필터링 가능하다.
- **Test**: `python3 -m py_compile scripts/hermes_monitor.py scripts/hermes_status.py tests/test_hermes_monitor.py tests.test_hermes_status.py`; `python3 -m unittest tests.test_hermes_monitor tests.test_hermes_status -v`; `python3 scripts/hermes_status.py --refresh`; `python3 scripts/hermes_status.py --refresh --project aijob --json`
---

## 2026-04-11: DOR-22 Paperclip plugin React/Tailwind preflight 검증 [done]
- **What**: 설치된 `@paperclipai/server`/`@paperclipai/plugin-sdk` 패키지와 UI 번들을 직접 확인해 host React 19.2.4, host Tailwind 4.1.18, SDK peer React `>=18` 조건을 교차 검증하고 결과를 `docs/doro-office/preflight/01-react-tailwind.md`에 정리했다.
- **Why**: doro-office를 React 19 + Tailwind 4로 시작하려면 host가 plugin UI에 주입하는 React/ReactDOM bridge와 CSS 레이어가 실제로 같은 major인지 먼저 확인해야 hooks dispatcher mismatch와 utility 충돌 리스크를 피할 수 있다.
- **Impact**: MVP-0 스캐폴딩은 `react@19`, `react-dom@19`, `tailwindcss@4`를 유지해도 되고, same-document mount 구조 기준 CSS 충돌 방어는 Shadow DOM 대신 Tailwind prefix(`do-`)를 1차 대응으로 채택할 수 있다.
- **Test**: `npm view @paperclipai/plugin-sdk@2026.403.0 peerDependencies dependencies version dist.tarball --json`; `python3`로 `@paperclipai/server/ui-dist/assets/index-Br2N7xYL.js`에서 `Tn.version="19.2.4"` 및 plugin bridge rewrite 확인; `python3`로 `index-CYurTMty.css`에서 `tailwindcss v4.1.18` 배너 확인
---

## 2026-04-11: DOR-23 plugin worker filesystem capability 검증 [done]
- **What**: plugin capability 상수/SDK 타입/worker manager 구현을 직접 확인하고, `definePlugin()` + test harness 기반 더미 worker에서 `node:fs/promises.readFile()`로 `~/AIJOB/.claude/STATE.md`와 `~/.hermes/profiles/devops/STATE.md`를 읽는 실험을 수행해 결과를 `docs/doro-office/preflight/02-worker-fs.md`로 정리했다.
- **Why**: MVP-2 스킨 로더가 `~/.hermes/skins/`를 직접 읽을 수 있는지, 혹은 capability/샌드박스 제약 때문에 업로드/번들 내장 대안으로 우회해야 하는지 선행 판단이 필요했다.
- **Impact**: doro-office worker는 전용 filesystem capability 없이도 Node fs 직접 접근이 가능하며, 기술 블로커는 해소됐다. 대신 host 차원 경로 제한이 없으므로 plugin config 기반 base dir + `realpath` allowlist 검증을 자체 구현해야 한다.
- **Test**: `read_file`로 `@paperclipai/shared/dist/constants.js`, `plugin-sdk/dist/types.d.ts`, `server/dist/services/plugin-worker-manager.js`, `plugin-sdk/dist/worker-rpc-host.d.ts` 확인; `node --input-type=module` 더미 worker 실험으로 project 밖 `~/.hermes/...` 경로 read 성공 확인
---

## 2026-04-11: [auto] DOR-27 doro-office 플러그인 스켈레톤 초기화 [done]
- **What**: `plugins/doro-office/`에 Paperclip plugin 패키지 골격을 추가하고 manifest/page/sidebar placeholder, worker 엔트리, Vite 다중 번들(worker/manifest/ui), Tailwind prefix, 패키지 단위 ESLint/TypeScript 설정, 로컬 설치 README를 한 번에 묶었다.
- **Why**: MVP-0의 다음 단계가 worker bridge와 카드 그리드 구현이므로, 먼저 Paperclip host가 기대하는 manifest/entrypoint 규약과 strict frontend toolchain을 고정해야 후속 UI 작업이 설치 실패나 번들 구조 변경 없이 누적된다.
- **Impact**: `paperclipai`가 인식 가능한 `@dororong/doro-office` 패키지 뼈대가 저장소에 생겨 DOR-28/29가 동일 경로 위에서 구현을 이어갈 수 있다.
- **Test**: `npm install`; `npm run lint`; `npm run typecheck`; `npm run build`; `paperclipai plugin list --api-base http://localhost:3100`; `paperclipai plugin install --local /Users/yuseungju/AIJOB/plugins/doro-office --api-base http://localhost:3100` (이미 설치됨 응답으로 로컬 플러그인 등록 상태 재확인)
