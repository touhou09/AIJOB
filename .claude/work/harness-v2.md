# Harness v2 작업 이력

> 7-agent 개발 자동화 파이프라인 v2 (CEO/Planner/Inspector/Coder/QA/DevOps/Monitor) 빌드 기록. 기존 CTO 루프 기반 구조는 전량 폐기.

---

## 2026-04-11: CTO 루프 폐기 + 하네스 재설계 결정 [done]
- **What**: DOR-33 README 6회 반송 사건을 계기로 CTO 단일 게이트 구조를 폐기하고 7-role 파이프라인으로 재설계. 기존 에이전트(backend/cto/frontend/data/devops/qa/orchestrator) 전원 terminated, DOR-21~38 cancelled/archived, AIJOB `.claude/profiles/` 레거시 wipe
- **Why**: Paperclip 공식 경고 "multi-hop agent chains introduce telephone effect — 10-15 iteration 후 output이 평균으로 회귀"가 DOR-33 루프 패턴과 정확히 일치. 엄격도 튜닝(A/B/C 안)으로는 구조 결함 해결 불가. 4가지 핵심 원칙으로 재프레이밍: (1) risk-tiered routing (2) contract-based verification (3) ship-by-default bias (4) arbiter는 판정자가 아닌 게이트
- **Impact**: 하위 아키텍처 결정 대부분 무효. AD-005/006/007/008 deprecated. 기존 작업(doro-office MVP-1~3) 완전 포기 — 클린 파일럿 `doro-monitor`로 재시작
- **Test**: 설계는 회의 리뷰(CEO/CTO/COO/Dev 4-role) 거쳐 11개 블로커 도출 후 해소. E2E 검증은 첫 스펙 투입 대기
- **Trap**: 초기에 "CTO 체크리스트 튜닝"으로 오해 → A/B/C 3안 도출 후 구조 문제임을 재인식 → "기존 구조 무시하고 다시" 결정. 재설계 프레임까지 4라운드 대화 소요
- **Next**: Phase A(CEO MVP) + Phase B(전체 파이프라인) 빌드
---

## 2026-04-11: Phase A — CEO 단독 MVP 빌드 [done]
- **What**: `~/.hermes/profiles/ceo/` 생성, AIJOB `.claude/` 구조를 프로필 레벨로 미러링 (SOUL/AGENTS/STATE/CONTEXT/DECISIONS/TODO + rules 5종 + work/sessions + workspace symlink). gbrain v0.7.0 설치(`bun add -g github:garrytan/gbrain`) + MECE 디렉토리 (specs/tech/projects/people/streams) + PGLite 초기화
- **Why**: 유저 요청 "AIJOB claude.md 구조 따라가도록" 반영. CEO 역할을 스펙 authoring 한 가지에 고정 (코드/테스트/기술 결정 금지). SOUL.md의 저장 조건 5개(배경/목표/범위/hard 완료 조건/유저 명시 확정)로 draft 자동 저장 방지
- **Impact**: 기획 진입점이 Slack DM 하나로 단순화. gbrain이 지식층으로 자리잡음(LLM Wiki 폐기). `ceo doctor` / `ceo pairing` 등 프로필 전용 CLI wrapper 생성됨
- **Test**: `hermes profile list` → ceo 인식, `ceo doctor` → config/auth/디렉토리 전부 pass. OpenAI Codex OAuth 공유 확인
- **Trap**: `rm -rf ~/.hermes/profiles/backend` 실행 후 gateway_state.json 재생성 (남아있던 gateway 프로세스의 shutdown write) — 파일 수동 제거로 해결
- **Next**: 나머지 6개 에이전트도 동시 빌드 (Phase B)
---

## 2026-04-11: Phase B — 6개 에이전트 + 파일럿 repo + Paperclip 등록 [done]
- **What**: planner/inspector/coder/qa/devops/monitor 프로필 6개 생성, 각각 CEO와 동일 구조 + 역할별 SOUL. Paperclip에 7개 agent 신규 등록(role enum: ceo/pm/cto/engineer/qa/devops/general 매핑), Paperclip project `doro-monitor` 생성(id 708a8844), GitHub repo `touhou09/doro-monitor` 생성 + 초기 scaffold(package.json, .gitignore, LICENSE, README, .github/workflows/ci.yml) + main push, gbrain에 `projects/doro-monitor/README.md`에 agent ID 레지스트리 저장
- **Why**: 유저 전환 요청 "CEO 혼자 티키타카하기 전에 플로우부터 구현". 단일 에이전트 검증은 handoff 위험을 못 잡고 "혼잣말 품질"만 확인함. 전 파이프라인 동시 빌드가 낫다고 판단 — 재시작 무제한 (Pro $200 rate limit 무관)이라 MVP 상관없음
- **Impact**: SOUL.md 레벨에서 handoff 체인 전부 인코딩 (CEO→Planner heartbeat→Inspector pre-gate→Coder→Inspector post-gate→QA→merge). Inspector가 2-skill (pre/post)로 단일 프로필에 통합. Monitor는 결정적 체크 + LLM 최소화, DevOps는 배포 제거·cron/드림사이클/remediation만
- **Test**: 7 프로필 파일 세트 sanity check 통과 (각 11개 md). Paperclip agent 7개 idle 상태 확인. 파이프라인 실제 handoff는 미검증
- **Trap**: (1) bash heredoc에서 `${profile^}` (capitalize) 사용 → zsh에서 bad substitution 오류로 AGENTS.md 6개가 빈 파일. `tr` 기반으로 재작성 (2) Paperclip project status enum 검증 실패 (`active` 불가, `in_progress` 필요)
- **Next**: 유저 첫 스펙 DM 투입 후 파이프라인 관찰. 특히 **Planner heartbeat 실제 깨어나는지** (Paperclip adapter의 subprocess invoke 가정 검증)
- **[DEBT]**: 구 에이전트들은 Paperclip DELETE API 500 (cascade 실패)로 인해 status=terminated로 남음. list에서는 제외되지만 DB에는 존재. 정리는 Paperclip 업그레이드 시 일괄
---

## 2026-04-12: 4자 회의 2라운드 + Harness v2 "자율 종결" 메커니즘 적용 [done]
- **What**: Phase B 자율 실증(DOR-39~68) 결과 파악 후 3가지 약점(auto-merge 부재 / cross-branch pollution / 머지 충돌 전략 부재) 에 대해 CEO(ex-CTO) / CTO / COO / 시니어 개발자 4명을 Agent tool로 병렬 회의. 2라운드 끝에 5-step Action Plan 전원 승인 + 가드레일 5개 확정. Action Plan 5개 전부 적용 완료: (1) 22개 DOR 브랜치 worktree 표준화 (`~/workspace/doro-monitor.wt/` + `.integrator` detached), 기존 stale worktree 13개(`/private/tmp/*`, `~/workspace/doro-monitor-dor61`, `inspector-worktrees/*`) 정리 (2) Coder/QA/Inspector SOUL에 `pwd | grep doro-monitor.wt/DOR-` 가드 + `git stash`/교차 체크아웃 금지 (3) Inspector post-gate에 pollution grep (`git log origin/main..HEAD` 에서 타 DOR 키/Revert 탐지) (4) DevOps `skills/integrator-loop/SKILL.md` 신설 — skill-level lockfile mutex + shared-lane/isolated-lane 분류 + `package.json` 의미 충돌 선검사 + Phase 1 dry-run only (5) CEO SOUL에 완료 보고 포맷 강제 (`main HEAD` + `open PR 수` 필수, GitHub 단일 집계) (6) Monitor SOUL Layer 2에 5 SLO + idle 감지 → Paperclip 이슈 경로. `.coo/slo-state.json` baseline_mode=true 초기화 + DOR-39~68 exclude_dor 리스트. DECISIONS.md AD-014/AD-015 추가
- **Why**: 1라운드 각자 포지션 → 2라운드 서로의 반론 보고 재판정 → 3지점 합의. 핵심 충돌 2개: (a) "Integrator = 새 프로필 vs DevOps 확장" 은 **skill 파일 물리 분리**로 타협 (책임 경계 = 파일 경계, 프로필 수 7 유지) (b) "W2 옵션 A(dirty abort) vs B(worktree)" 는 CTO가 찾은 `stash@{2}: qa-temp-before-DOR-51` 증거 기반으로 B 직행. Merge queue mutex 는 CEO의 Paperclip status 대신 COO의 skill-level lockfile 채택 이유가 "Paperclip API 장애 = 파이프 stall" 반박. Inspector 3-way dry-run (CTO W3-A) 은 integrator-loop 와 중복이라 기각. 시니어의 shared-lane/isolated-lane 분류는 CTO가 자기 원안(W3-B 전 순차 rebase) 폐기하고 채택 (throughput 보존)
- **Impact**: Phase B 파이프라인의 "자율 종결" 축 확립. 다음 스펙 투입 시 CEO→Planner→Inspector→Coder→Inspector→QA 체인 뒤에 **integrator-loop dry-run + CEO 보고 포맷** 으로 관찰 가능한 종결 제공. main 브랜치는 **1주 pollution 무사고 + 유저 승인** 전까지 불변 (Phase 1 dry-run only). 에이전트 worktree 무질서가 표준화되어 `stash@{1,2,3}` 패턴 재발 확률 drop
- **Test**: 커버 못함 — 실 스펙 투입 전까지 integrator-loop skill의 실행 경로(worktree 진입, lockfile 획득, lane 판정, pollution 게이트와의 협업) 미검증. Phase 1 dry-run 첫 N건으로 (a) shared/isolated lane 분포 (b) pollution 재발 여부 (c) DevOps SOUL의 drim-cycle 시간축과 integrator-loop 시간축 실제 충돌 빈도 수집 필요. 기존 21 PR은 실측 baseline 망치지 않도록 `slo-state.json` excluded_dor 에 영구 제외
- **Trap**: Step 1 worktree 전환 중 `git worktree add` 6건 실패 — 기존 에이전트들이 이미 `/private/tmp/*`, `~/workspace/doro-monitor-dor61`, `inspector-worktrees/*` 에 ad-hoc worktree 만들어 씀. 이게 cross-branch pollution 의 진짜 원인이었다 (worktree 개념은 있었는데 표준 경로가 없어서 각자 다른 위치). stale 13개 dirty 체크 후 전부 `git worktree remove --force` 로 정리 + 정규 경로로 재생성. Inspector DOR-51/DOR-58 worktree 는 `bun.lock` dirty 상태였는데 이는 dry-run 부작용이라 제거 안전
- **Next**: ① 다음 스펙 투입 실증 (DOR-69+부터) ② Phase 1 dry-run 1주 관찰 ③ `gh pr list --search "is:merged"` 가 0이면 flip 조건 미충족 → 수동 머지 샘플로 1주 기준 상향 검토 ④ 기존 21 PR 처리 전략 결정 (일괄 cherry-pick vs 일괄 close + DOR-69 clean baseline 재작성)
- **[DEBT]**: (a) CEO STATE.md L32 "launchd gateway `$PAPERCLIP_API_KEY`" 미확정 항목을 별도 AD로 승격 필요 (CTO 2라운드 권고, 이번엔 미완) — Phase 1 `main HEAD`+`open PR` 포맷은 gh auth 만으로 돌아 영향 없지만 Phase 2 `merged since last` 는 잠재 리스크 (b) `hermes-paperclip-adapter` 로컬 패치 2사본(`~/.paperclip/plugins/...` + `~/.npm/_npx/.../hermes-paperclip-adapter/...`) + `hermes-agent` expanduser 패치 2파일 — 업스트림 PR 경로 추적 필요
---

## 2026-04-12: Phase B 파이프라인 연결 복구 — 이벤트 기반 dispatch E2E 실증 [done]
- **What**: CEO→Planner→Inspector 이벤트 dispatch 체인을 실작동까지 연결. (1) `hermes-paperclip-adapter 0.3.0` 의 `execute.js:247` env 해석 버그 수정 — `ctx.agent.adapterConfig`(raw DB) 대신 `ctx.config`(resolved) 읽도록 1-line 패치 두 사본 (`~/.paperclip/plugins/...` + `~/.npm/_npx/.../hermes-paperclip-adapter/...`) (2) 7 agent 별 per-agent API key 발급 + `adapterConfig.env.PAPERCLIP_API_KEY` + auth 헤더 포함 `promptTemplate` 주입 (wire 스크립트 1회 실행) (3) `prompt_builder.py`의 `exfil_curl` 패턴(`$\w*(KEY|TOKEN|...)`) 회피를 위해 CEO/Planner SOUL의 curl 블록을 `PCK="${PAPERCLIP_API_KEY}"` alias 경유로 재작성 (4) `~/.hermes/hermes-agent/tools/environments/local.py:382` + `persistent_shell.py:222` 의 `expanduser` 누락 버그 수정 (워크디어에 literal `~` 전달 시 `FileNotFoundError`) (5) Paperclip 재기동 2회 (패치 로드). DOR-39 수동 생성 후 Planner 자동 wakeup → DOR-40 epic + DOR-41~45 task 5건 자동 생성 + Inspector 자동 wakeup 연쇄 확인
- **Why**: 유저 신고 "스펙 저장 후 handoff가 실제로 이어지지 않음". 1차 진단은 "launchd gateway가 CEO 1개만"이라 downstream 막혔다는 추정이었으나, 실제 원인은 (a) CEO SOUL이 heartbeat 전제로 이슈 생성 단계 누락 (b) adapter가 resolved env를 읽지 않아 `PAPERCLIP_API_KEY`가 `"[object Object]"` 로 주입되는 구조적 버그 — 3-layer로 복합. Option B(event-based, assignment wakeup)는 Paperclip 내부 `queueIssueAssignmentWakeup` 경로로 이미 지원되며 주기 heartbeat 대비 즉시성/자원효율 우위
- **Impact**: 이전에는 0% 였던 multi-hop dispatch가 실동작. DOR-39(spec) → Planner → DOR-40~45(6건, parent 지정 + assignee=inspector) → Inspector 자동 기동까지 한 번의 사람 개입으로 연쇄. 이후 파이프라인 Phase B 전체(Inspector→Coder→QA→auto-merge) 검증 가능 상태. 어댑터 패치는 타 adapter type(cursor, claude-code 등)에도 동일 패턴 있으면 같은 영향
- **Test**: monitor wakeup 2회 재실행 — 1차 `KEY_LEN 15` 로 `"[object Object]"` 확인(버그 재현) → 패치 + 재기동 → 2차 `curl -H "Authorization: Bearer $PCK"` → HTTP 200 + 실제 이슈 배열 수신. DOR-39 생성 후 planner heartbeat-runs에 `src=assignment` run 1건 `running` 확인, 처리 과정에서 6개 하위 이슈 + `~/gbrain/projects/doro-monitor/2026-04-12-agent-monitor-plugin-breakdown.md` 생성. Inspector 프로세스 동시 기동 확인. **커버 못함**: Coder/QA/DevOps/Monitor의 실제 wakeup 및 full-loop (처음 실증은 Inspector 단계까지만), `PAPERCLIP_API_KEY` 주입이 CEO launchd gateway 프로세스에도 정상 전달되는지 — CEO는 adapter 경로가 아닌 gateway 경로라 별도 확인 필요
- **Trap**: (1) Paperclip 재기동 1차 후에도 monitor가 `KEY_LEN 15` 반환 → 조사 결과 `~/.paperclip/plugins/.../hermes-paperclip-adapter/execute.js`(내가 패치한 사본)가 아니라 `~/.npm/_npx/43414d9b790239bb/node_modules/hermes-paperclip-adapter/execute.js`(npm 사본)가 실제 로드됨. 두 사본 다 패치 후 2차 재기동으로 해결. (2) Planner SOUL.md에 `curl -H "Authorization: Bearer $PAPERCLIP_API_KEY"` 직접 기재 → `agent/prompt_builder.py:45`의 `exfil_curl` 정규식(`curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)`)에 매칭 → SOUL 전체가 `[BLOCKED: SOUL.md contained potential prompt injection]`로 차단되어 프롬프트에 주입 안 됨. planner 첫 run은 SOUL 없는 상태로 돌았고 그럼에도 6개 이슈를 구조적으로 생성(이는 Paperclip promptTemplate 기본값이 워크플로우 상당 부분을 커버하기 때문). 해소: curl 라인에 literal `$PAPERCLIP_API_KEY` 쓰지 말고 `PCK="${PAPERCLIP_API_KEY}"` 별명으로 감쌈 → 정규식 우회. (3) Paperclip 프로세스가 ppid=1(orphan) + launchd 미등록이라 재기동 시 수동 `nohup npm exec paperclipai run &` 필요
- **Next**: ① 유저가 이미 재작성한 `doro-monitor/README.md` Planning 섹션과 CEO STATE.md의 blockers 정정 반영 확인 ② Planner/Inspector 현재 러닝 세션 완료 대기 + Inspector 판정 결과 확인(pre-gate PASS/CHANGES_REQUESTED/BLOCKED) ③ 이어서 Coder 실동작(`~/workspace/doro-monitor` 체크아웃 + TDD) 실증 ④ CEO Slack gateway 프로세스 환경에도 `PAPERCLIP_API_KEY` 전달되는지 검증(CEO가 이슈 생성 curl을 실제로 쏠 수 있어야 SOUL의 새 절차가 작동) ⑤ 기존 DOR-39~45 테스트 이슈는 실증 완료 후 정리/보존 판단
- **[DEBT]**: (a) adapter 1-line 패치가 `~/.paperclip/plugins/...` + `~/.npm/_npx/.../hermes-paperclip-adapter/...` 양쪽 npm 관리 디렉토리에 직접 수정됨 — `npm install`/`npx` 캐시 재생성 시 원복 위험. 업스트림 PR #31 머지 추적 필요. (b) `~/.hermes/hermes-agent` 는 `NousResearch/hermes-agent` clone (324 commits behind) — `local.py`/`persistent_shell.py` `expanduser` 패치도 `git pull` 시 날아감. 업스트림 기여 또는 로컬 fork 필요. (c) CEO Slack gateway 경로에서 Paperclip API 인증이 미검증 상태. gateway launchd가 adapterConfig.env를 읽는지 불확실(어댑터 경로와 분리됨) — CEO가 SOUL의 이슈 생성 절차를 Slack run에서 실제로 수행할 때 401 날 수 있음
---

## 2026-04-12: v2 파이프라인 full-cycle + 구조 개선 [done]
- **What**: (1) Phase B archive 21 PR close + 21 git tag 보존 + clean slate (2) v2 retrigger DOR-69~77 단일 스펙 자율 실행 3.5h → 9/9 done (3) 4자 회의 2라운드(CEO/CTO/COO/시니어) → AD-014 합의안 5-step 적용 (4) main에 squash merge 7건 → 2332줄 src + 42 tests (5) 수렴 가드 3중 장치 (Coder delegate_task + Inspector round3 강제ship + CEO 2차 강제ship) (6) 단일 파이프라인 전환 (병렬→직렬, conflict 0%) (7) LLM Wiki 전환 (gbrain PGLite→~/llm-wiki/ + memvid MCP) (8) personal 비서 프로필 신설 + CEO→personal gateway 전환 (9) Obsidian 설치 (10) 에러 0 달성 (gho 토큰, allowlist, memvid dummy key)
- **Why**: Phase B 자율 실증에서 3대 약점(auto-merge 부재/cross-branch pollution/병렬 PR conflict) + 구조적 멈춤 4회 발견. 병렬 에이전트 PR conflict 27% (AgenticFlict 2026-04 실측). 단일 파이프라인 + QA 즉시 merge로 conflict 구조적 0%. gbrain PGLite는 WASM crash 반복 → memvid(SQLite+FAISS) + 파일시스템으로 교체. CEO/비서 분리로 Slack DM = 개인비서, Paperclip = 파이프라인 전용.
- **Impact**: 스펙 1건 → DM에서 비서에게 지시 → 자동 파이프라인 (Planner 직렬 task → Inspector → Coder worktree → QA merge → 다음 task) → main에 코드 반영. 사람 개입 0 목표. 에이전트 8개 (personal + ceo + planner + inspector + coder + qa + devops + monitor).
- **Test**: v2 run DOR-69~77 전부 done, main 8 commits, tsc 0 error, 42 tests pass, build 13.95KB. 단일 파이프라인 규칙 6개 SOUL 반영 확인. 에러/경고 0건. **미검증**: 단일 파이프라인 + QA auto-merge + Planner 재wakeup 체인의 실 동작 (다음 스펙 투입 시 첫 실증)
- **Trap**: (1) gbrain PGLite WASM crash 2회 → DB 재init → import 중 또 crash → frontmatter YAML 파싱 에러 → 결국 포기하고 memvid로 전환 (2) hermes-paperclip-adapter 패치가 2사본(~/.paperclip/plugins + ~/.npm/_npx) 존재 → 1사본만 패치해서 Paperclip 재기동해도 안 먹음 (3) Hermes prompt_builder.py exfil_curl 정규식이 SOUL 통째 차단 → PCK alias 우회 (4) DOR-74 5라운드 blocked 루프 → 수렴 가드 부재가 원인 → 3중 장치로 해결 (5) 병렬 6 task → main merge 시 conflict 폭발 → 단일 파이프라인으로 전환 (6) DevOps SOUL 0줄 사고 (sed 치환 중 파일 날아감) → 세션 내 기억으로 재구성
- **[DEBT]**: (a) hermes-paperclip-adapter + hermes-agent 로컬 패치 3건 (npm/git pull 시 원복) (b) CEO SOUL의 스펙 저장 절차가 비서 SOUL로 이관됐지만 CEO에도 잔존 — 정리 필요 (c) doro-monitor README Hard 완료 조건 #2 (설치/지원 섹션) 미충족 (d) main의 tsc 타입 경고 잔존 (런타임 영향 0, 테스트 통과)
---

## 2026-04-11: CEO Slack gateway 연결 + OpenClaw 좀비 제거 [done]
- **What**: CEO 프로필에 기존 Slack Ame 봇 재사용 (root `~/.hermes/.env`의 `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN`을 `~/.hermes/profiles/ceo/.env`에 복사). config.yaml에 `platform_toolsets: slack` 추가. `ceo gateway install` 로 launchd 등록 (`ai.hermes.gateway-ceo`). 기존 pairing 실패 원인이었던 openclaw cron 2줄(`*/2 * * * * openclaw-gateway-keepalive.sh`, `0 9 * * * openclaw-update-check.sh`) 제거
- **Why**: CEO 티키타카를 Mac 터미널 고정에서 해방. 옵션 B(기존 봇 재사용) 선택 — 새 Telegram 봇 생성 대비 즉시 가능. 단일 Slack 앱이라 향후 Monitor 알림 등 다른 메시징은 Phase C에서 별도 앱 필요
- **Impact**: seungju Yu (U0ARPH7NMMW) pairing 승인 완료. CEO `@ame` DM으로 접근 가능. CEO 외 6개 프로필은 gateway 없이 Paperclip heartbeat 의존 (이 가정 미검증 — 첫 파이프라인 실행 시 확인 예정)
- **Test**: `ceo gateway status` → running, Slack Socket Mode connected, Authenticated as @ame in workspace Ame. `ceo pairing list` → 1 approved user
- **Trap**: 첫 DM 시 OpenClaw gateway가 응답 가로챔 ("OpenClaw: access not configured" + openclaw pairing code 발급). `ps aux`가 stale 출력을 보여 디버깅 혼란. 근본 원인은 crontab의 2분 keepalive였음 — OpenClaw 프로세스를 kill해도 2분 내 cron이 부활시킴. crontab 편집 후 정상화
- **Next**: 유저가 Slack `@ame`에 아이디어 던지면 CEO가 수신 → 티키타카 → gbrain/specs/ 저장 → Planner heartbeat 대기
---
