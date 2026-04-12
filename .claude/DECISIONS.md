# Architecture Decisions

> 주요 아키텍처 결정 이력.

---

## AD-001: OpenClaw → Hermes Agent + Paperclip 전환
- **일시**: 2026-04-08
- **결정**: OpenClaw를 폐기하고 Hermes Agent v0.8.0 + Paperclip으로 전환
- **이유**: Hermes가 프로필/게이트웨이/cron/메모리를 네이티브 지원, Paperclip이 에이전트 오케스트레이션 제공
- **상태**: 완료
- **참조**: ~/.openclaw.pre-migration, ~/.hermes/config.yaml

## AD-002: Jira → Paperclip 이슈 시스템 전환
- **일시**: 2026-04-09
- **결정**: hermes 브랜치에서 Jira를 제거하고 Paperclip 이슈 시스템(DOR-xxx)으로 대체
- **이유**: Paperclip이 에이전트와 네이티브 통합, 이중 관리 제거. Jira는 work 브랜치에서만 유지.
- **상태**: 진행 중
- **참조**: https://paperclip.dororong.dev

## AD-003: Confluence → LLM Wiki (Obsidian + Memvid) 전환
- **일시**: 2026-04-09
- **결정**: Confluence KB를 LLM Wiki 패턴(Karpathy)으로 전환. Obsidian Vault + Memvid MCP 병행.
- **이유**: 로컬 마크다운 기반으로 에이전트가 직접 읽기/쓰기 가능. Memvid로 시맨틱 검색, Obsidian으로 구조화 브라우징.
- **상태**: 계획
- **참조**: ~/.hermes/skills/research/llm-wiki/SKILL.md

## AD-005: CTO 리뷰 레이어 추가 (ChatDev 7-role 차용)
- **일시**: 2026-04-10
- **결정**:
  1. 7번째 프로필 `team-cto` 추가 (role=cto in Paperclip enum)
  2. engineer 구현 완료 시 `in_review` + team-cto 재할당 필수 (team-qa 제외)
  3. CTO 리뷰 체크리스트 10개 항목 (`rules/cto-review-checklist.md`)
  4. 보안 위반은 무조건 BLOCKED + orchestrator 에스컬레이션
  5. HubSpot judge 원칙: 피드백 self-evaluate (구체성/실제 문제/수정 가능성)
  6. 모델: gpt-5.4 + `agent.reasoning_effort: high` (config.yaml에 설정, extraArgs 금지)
- **이유**: 기존 구조에 코드/아키텍처 리뷰어 부재. team-qa는 기능 테스트만 수행. ChatDev 7-role + Paperclip 공식 CTO 워크플로우 + Anthropic specialist dispatch 패턴을 참고하여 CEO(orchestrator)/CTO(team-cto)/Engineer 책임 분리
- **상태**: 완료 (DOR-16 E2E 검증 완료)
- **참조**: `.claude/profiles/cto/`, `.claude/rules/cto-review-checklist.md`, `.claude/rules/paperclip-policy.md` "CTO 리뷰 핸드오프" 섹션, work/hermes-infra.md (2026-04-10 CTO 항목)

## AD-004: Agent Harness 구조 — AIJOB 템플릿 + sync 배포 + AGENTS.md 단일 엔트리
- **일시**: 2026-04-10
- **결정**:
  1. AIJOB은 단순 템플릿 레포. 런타임은 ~/.hermes/profiles/{p}/ 에서 완결.
  2. `.claude/rules/*.md`로 규정 모듈 분리 + `profiles/_common/AGENTS.md.part` + 프로필별 `AGENTS.md.part` merge → 런타임에 AGENTS.md 하나로 배포.
  3. rules/*.md는 Hermes가 자동 로드 못 하므로 AGENTS.md의 "cat 지시"로 runtime 로드.
  4. STATE.md/CONTEXT.md/DECISIONS.md는 동적 파일이라 AGENTS.md에 merge하지 않고 cat으로 매 run 로드. 런타임 편집 보존.
  5. sync 스크립트는 단방향(AIJOB→~/.hermes), SOUL/AGENTS/rules는 덮어쓰기, STATE/CONTEXT/DECISIONS는 없을 때만 template 복사.
  6. Paperclip adapter promptTemplate은 건드리지 않음 (adapter 업데이트 호환).
- **이유**: 회사 Claude Code의 `CLAUDE.md + rules/ + STATE` 패턴을 codex 기반 Hermes에 이식. 2026년 agent harness 업계 표준(OpenHarness, everything-claude-code, AGENTS.md 오픈 표준)과 일치. Hermes는 cwd의 AGENTS.md 하나만 자동 로드하므로 이 제약에 맞춰 구조화.
- **상태**: 완료 (orchestrator E2E 검증 완료, 나머지 프로필 재검증 필요)
- **참조**: `.claude/hooks/hermes-profile-sync.sh`, `.claude/profiles/`, work/hermes-infra.md (2026-04-10 항목)

## AD-006: 단일 company 유지 + projectId 워크스트림 분리
- **일시**: 2026-04-11
- **결정**: Paperclip company `dororong`은 유지하고, 워크스트림 구분은 company 분리 대신 projectId로 강제한다. 기본 taxonomy는 `AIJOB(aijob)`, `Hermes Infra(hermes-infra)`, `AivaLink(aivalink)` 3개로 시작한다.
- **이유**: issuePrefix/issueCounter가 company 단위로 고정되어 복수 company 분리는 에이전트/토큰/운영 설정 복제를 유발한다. 단일 company 아래 projectId를 필수화하면 기존 DOR 키를 유지하면서도 필터링/집계/리드 관리가 가능하다.
- **상태**: 완료
- **참조**: `.claude/rules/paperclip-policy.md`, `.claude/integrations/paperclip.md`, `DOR-18`, `DOR-19`

## AD-008: in_review orphan 패턴 구조 수정 — `assigneeUserId` 금지 + 5단계 완료 규칙 세분화
- **일시**: 2026-04-11
- **결정**:
  1. `rules/paperclip-policy.md` "5단계 — 완료" 규칙을 A/B/C/D 4경로로 세분화. 에이전트가 CTO 리뷰 대상/생략 대상/reporter agent/reporter user 4가지 케이스를 명시적으로 판단.
  2. **`assigneeUserId` 에이전트 설정 금지**. user 반려 상태는 heartbeat 사이클에서 픽업 불가능한 sink hole이라 구조적 orphan을 만든다.
  3. user에게 질문/판단이 필요하면 `assigneeAgentId`를 유지한 채 코멘트로 질문 + `blocked` 상태 전환. user 코멘트 응답 시 adapter wake로 해제.
  4. `rules/cto-review-checklist.md` "제외 범위"에 preflight/리서치/조사/에셋 수집/ATTRIBUTION 명시 추가. skip-cto-review 경로의 완료 처리 방식을 paperclip-policy와 cross-reference.
- **이유**: 이번 세션(2026-04-11)에 생성한 11개 이슈 중 5개(DOR-22/23/25/30/31)가 user orphan 상태로 종료되어 재현율 45%. 루트 코즈는 기존 "reporter ≠ assignee → assignee를 reporter로 변경" 규칙이 reporter가 user(createdByUserId만 있고 reporterAgentId=null)인 케이스에서 `assigneeUserId=user`로 해석되는 것. 에이전트 의도는 맞지만 Paperclip 데이터 모델상 user는 heartbeat 사이클 참여자가 아니므로 pickup 불가능. 구조 수정 없이 정책/훈련으로 해결 불가.
- **상태**: 완료
- **참조**: `.claude/rules/paperclip-policy.md` (5단계), `.claude/rules/cto-review-checklist.md` (제외 범위), DOR-22/23/25/30/31 (재현 사례), `~/.claude/projects/-Users-yuseungju/memory/feedback_paperclip_in_review_orphan.md`

## AD-009: Harness v2 — 7-agent 파이프라인 재설계 (CTO 루프 폐기)
- **일시**: 2026-04-11
- **결정**:
  1. 기존 7-profile 구조(backend/cto/frontend/data/devops/qa/orchestrator) 전량 폐기
  2. 새 7-role 파이프라인: CEO(스펙) → Planner(분해) → Inspector(양방향 게이트) → Coder(구현) → Inspector(post-gate) → QA(테스트) → auto-merge
  3. Monitor는 관찰 전용 사이드카 (3-layer: 인프라/파이프라인/결과)
  4. DevOps는 배포/롤백 제거, cron + 드림사이클 + Monitor remediation만
  5. Inspector는 단일 프로필 + pre/post 2-skill로 역할 분리
  6. 핵심 원칙: (a) risk-tiered routing (b) contract-based verification (c) ship-by-default bias (d) arbiter는 판정자가 아닌 게이트
  7. 수렴 가드: round 3 한도, 같은 카테고리 지적 2회 반복 시 BLOCKED
- **이유**: DOR-33 README 6회 반송 사건이 Paperclip 공식 경고 "multi-hop agent chains dilute intent, 10-15 iteration 후 평균 회귀"와 정확히 일치. CTO 체크리스트 튜닝(A/B/C) 레벨로는 구조적 결함 해결 불가. CEO/CTO/COO/Dev 4-role 회의 결과 11개 블로커 도출, 모델 조사(Pro $200 rate limit 무관 확인) 후 전면 재설계로 합의
- **상태**: 완료 (빌드), E2E 검증 대기
- **참조**: `.claude/work/harness-v2.md` (2026-04-11), `~/.hermes/profiles/{ceo,planner,inspector,coder,qa,devops,monitor}/SOUL.md`
- **Deprecated**: AD-005 (CTO 리뷰 레이어), AD-006 (project taxonomy 3종 — 전부 archived), AD-007 (DOR-5 doro-office 피벗), AD-008 (orphan 패턴 수정 — 전체 wipe로 무효)

## AD-010: doro-monitor — 파일럿 프로젝트
- **일시**: 2026-04-11
- **결정**: 신규 repo `touhou09/doro-monitor`를 파이프라인 E2E 검증 파일럿으로 사용. 기술 스택(Tauri vs Paperclip plugin)은 CEO 티키타카 결과에 따라 결정 (현 repo는 언어-agnostic scaffold). 기존 `doro-office` 작업은 전량 포기
- **이유**: 파이프라인의 실효성 검증은 "spec → shipped code" 경로가 실제 작동하는지가 유일한 기준. 신규 repo로 시작해야 하네스/파이프라인 결함과 기존 잔재(doro-office 반쪽 상태)를 분리해서 볼 수 있음
- **상태**: 진행 중 (repo + CI + Paperclip project 연결 완료 / 첫 스펙 대기)
- **참조**: `~/workspace/doro-monitor`, Paperclip project 708a8844, `~/gbrain/projects/doro-monitor/README.md` (agent ID 레지스트리)

## AD-014: Harness v2 파이프라인 "자율 종결" 메커니즘 — worktree 격리 + integrator-loop + SLO 게이트
- **일시**: 2026-04-12
- **결정** (4자 회의 2라운드 합의, CEO·CTO·COO·시니어 개발자 전원 승인):
  1. **Worktree 격리** — `~/workspace/doro-monitor.wt/{DOR-NN-slug}/` 표준. `.integrator` detached worktree 1개 추가. Coder/QA/Inspector SOUL에 `pwd | grep -q "doro-monitor.wt/DOR-" || exit 1` 가드. `git stash` / 교차 `git checkout` 금지. 22개 DOR 브랜치를 standard 경로로 일괄 재배치 (기존 `/private/tmp/*` + `~/workspace/doro-monitor-dor61` 6개 stale worktree 정리).
  2. **Inspector pollution 게이트** — post-gate 체크리스트에 `git log origin/main..HEAD` grep 추가. 타 DOR 키 커밋 혼입 또는 Revert 발견 시 CHANGES_REQUESTED + `polluted` 라벨 + Planner recall.
  3. **DevOps `integrator-loop` skill** 물리 분리 — `~/.hermes/profiles/devops/skills/integrator-loop/SKILL.md`. SOUL.md 본문은 참조 1줄만 (SOUL 현재 102줄, 150줄 한도 보호). Skill 책임: (a) skill-level lockfile mutex (`.coo/integrator.lock`, PID+epoch+10min stale 회수) (b) drim-cycle 동시 실행 회피 (`.coo/drim-cycle.lock` 체크) (c) shared-lane/isolated-lane 판정 (`git diff --name-only origin/main...HEAD` 가 `bun.lock|package.json|src/shared/` 교집합) (d) `.integrator` worktree 에서 `package.json` 의미 충돌 선검사 → Planner recall (e) `bun.lock` 재생성은 shared-lane 한정 (GR4) (f) `--auto` 플래그 안 씀, `gh pr checks --watch` polling 방식.
  4. **CEO 완료 보고 포맷 강제** — Slack DM "완료" 보고에 `main HEAD` + `open PR 수` 필수. 빈 필드/UNKNOWN 금지. `gh` 실패 시 보고 보류 + 재시도. 집계 소스 = GitHub 단일 (Paperclip 이중 관리 금지). Phase 2(1주 무사고 후)에 `merged since last` 추가.
  5. **SLO 5개** — Spec→main p50 ≤4h / open PR ≤5 / merge success ≥80% / pollution=0 / idle→보고 ≤15분. 첫 5건 merged까지 baseline_mode, 경보 OFF. DOR-39~68 30건은 lead time 계산 제외. `.coo/slo-state.json` 상태 파일.
  6. **Idle 감지 경로**: Monitor cron 5분 → 조건 충족 시 Paperclip 이슈 생성(assignee=CEO, label=idle-report) → CEO assignment wakeup → Slack 완료 보고. Monitor가 Slack 직송 안 함 (GR2 준수).
  7. **Merge flip 조건**: Inspector pollution 게이트 **1주 무사고** + 유저 명시 승인 후 Phase 2 (실제 `gh pr merge --squash --delete-branch`).
- **이유**: Phase B 자율 검증(DOR-39~68) 결과 "build는 됨, ship은 0건" 패턴 확인. Auto-merge 부재 + cross-branch pollution(DOR-55 `Revert DOR-66` + `stash@{2}: qa-temp-before-DOR-51`) + 21 PR 병렬 충돌 전략 부재 3가지 약점을 4자 회의에서 진단. 첫 라운드 충돌: CEO+CTO "Integrator 8번째 profile 신설" vs 시니어 "기존 DevOps 확장". 2라운드에서 **skill 파일 물리 분리**로 타협 (책임 경계 = 파일 경계, 프로필 수 7 유지). W2는 A(dirty abort) 기각, B(worktree) 직행 (`stash@{2}` 증거 기반). Merge queue mutex는 CEO의 Paperclip status 안 대신 COO의 skill-level lockfile 채택 (Paperclip API 장애 시 파이프 stall 회피). CTO의 W3-B "모든 PR 순차 rebase" 원안은 폐기, 시니어의 shared-lane/isolated-lane 분류 채택 (throughput 보존). Inspector 3-way dry-run은 integrator-loop와 중복이라 기각.
- **상태**: Action Plan 5 step 전부 적용 완료 (2026-04-12). Phase 1 = dry-run only. 다음 스펙 투입으로 실증 대기.
- **참조**: `~/.hermes/profiles/{coder,qa,inspector,devops,ceo,monitor}/SOUL.md`, `~/.hermes/profiles/devops/skills/integrator-loop/SKILL.md`, `~/gbrain/projects/doro-monitor/.coo/{slo-state.json,integrator.lock}`, `~/workspace/doro-monitor.wt/{DOR-*,.integrator}/`, work/harness-v2.md (2026-04-12 2라운드 항목), DOR-39~68

## AD-015: 가드레일 5개 확정 (Harness v2 불변 제약)
- **일시**: 2026-04-12
- **결정**:
  - **GR1**: Hermes `prompt_builder.py` 직접 수정 금지 (`exfil_curl` 필터 포함 전 필터). 우회는 SOUL 쪽에서 alias 변수, 수정은 업스트림 RFC로만.
  - **GR2**: 에이전트↔에이전트 직접 통신 채널 신설 금지. Paperclip 이슈가 유일한 매체. 단 "Monitor/DevOps 가 Paperclip 이슈를 생성(assignee=X)" 는 기존 dispatch 모델 준수라 위반 아님. Slack/webhook/redis/파일큐 channel 신설 금지. CEO launchd Slack gateway는 사람↔시스템 단방향 예외.
  - **GR3**: `main` 브랜치 destructive op 자동화 금지. `git push --force`, `git reset --hard`, `git branch -D`, `git worktree remove --force main` 등을 에이전트가 자동 수행하지 않는다. 필요 시 Paperclip 이슈에 `assignee=ceo` + `escalation:human` 라벨.
  - **GR4**: `bun.lock` 재생성(`rm bun.lock && bun install`)은 `integrator-loop` 의 shared-lane 판정 내부에서만 허용. isolated-lane 절대 금지 (semantic conflict 감지 불가 영역으로 숨김).
  - **GR5**: DevOps `integrator-loop` skill과 드림사이클/retro/Monitor remediation 로직은 **상호 호출 금지**. 교차 필요 시 Paperclip 이슈를 매체로 간접 트리거. 직접 import/source 금지.
- **이유**: CTO 제안(GR1-3) + 2라운드 추가(GR4 `bun.lock` 격리, GR5 skill 상호 호출 금지). 이 5 가드레일은 Harness v2 의 **"Hermes/Paperclip 코어 패치 없이 SOUL/profile 만 수정"** 원칙을 지키는 물리적 제약. 하나라도 깨면 6개월 궤적에서 업스트림 rebase 비용 폭발.
- **상태**: AD-014 Action Plan과 동시 확정
- **참조**: AD-014, `~/.hermes/profiles/*/SOUL.md`, `agent/prompt_builder.py:45` (exfil_curl 필터 원본)

## AD-012: Harness v2 dispatch 모델 확정 — 이벤트 기반 assignment wakeup (주기 heartbeat 폐기)
- **일시**: 2026-04-12
- **결정**:
  1. 7-agent 파이프라인의 핸드오프는 **Paperclip `queueIssueAssignmentWakeup` 경로(이벤트)** 만 사용. `intervalSec=0` 유지, 주기 scheduler 사용 안 함
  2. CEO SOUL에 "스펙 저장 직후 `POST /api/companies/{cid}/issues` (assignee=planner)" 단계 명시. Planner heartbeat 감지 모델은 폐기
  3. 각 에이전트는 wakeup 시 자기 assignee 이슈 조회 + 하위 이슈 생성(assignee=next-role, parentId=원본)으로 다음 단계 트리거. 추가 스케줄러/폴링 금지
  4. 인증은 per-agent API key (Paperclip `POST /agents/:id/keys`) + `adapterConfig.env.PAPERCLIP_API_KEY` 주입. board token 공유 금지 (audit 분리 + 회전 가능)
  5. SOUL/AGENTS의 curl 예시는 반드시 alias 변수 (`PCK="${PAPERCLIP_API_KEY}"`) 경유로 작성. literal `$PAPERCLIP_API_KEY` 를 curl 라인에 쓰면 Hermes `prompt_builder.py` 의 `exfil_curl` 정규식에 걸려 SOUL 전체가 차단됨
- **이유**: Phase B 설계가 "Planner heartbeat"를 가정했으나 (a) `intervalSec=0` 이라 주기 fire 없음 (b) 재구성 후 7 agent `lastHeartbeatAt=null` — 폴링 루프가 실제로 돈 적 없음. 반면 Paperclip 서버의 `issue-assignment-wakeup.js` + `issues.js:1099~1167` 경로는 이슈 assignee 변경/코멘트/체크아웃 시 자동 wakeup 트리거 (구 orchestrator `src=assignment` 성공 기록 존재). 즉시성/자원효율/audit 모두 이벤트 기반이 우위. Planner가 폴링으로 specs 디렉토리를 긁는 것보다 CEO가 이슈 1건 POST 하는 편이 코드/운영 부담 1/10
- **상태**: 완료 (DOR-39 수동 생성 → Planner 자동 wakeup → DOR-40 epic + DOR-41~45 task 5건 자동 생성 + Inspector 자동 기동까지 연쇄 실증. Coder 이후 단계 미검증)
- **참조**: `work/harness-v2.md` (2026-04-12 항목), `~/.hermes/profiles/ceo/SOUL.md` "스펙 저장 후 절차", `~/.hermes/profiles/planner/SOUL.md` "Paperclip 이슈 생성 절차", `~/.hermes/profiles/ceo/STATE.md`, `~/gbrain/projects/doro-monitor/README.md` "파이프라인 흐름 요약", DOR-39/40/41/42/43/44/45
- **Supersedes**: AD-009 의 Planner heartbeat 가정 부분

## AD-013: hermes-paperclip-adapter 0.3.0 버그 로컬 패치 + hermes-agent expanduser 패치 — 기술 부채로 수용
- **일시**: 2026-04-12
- **결정**:
  1. `hermes-paperclip-adapter/dist/server/execute.js:247` 의 `const config = (ctx.agent?.adapterConfig ?? {});` 을 `const config = (ctx.config ?? ctx.agent?.adapterConfig ?? {});` 로 변경. 두 사본(`~/.paperclip/plugins/node_modules/...` + `~/.npm/_npx/43414d9b790239bb/node_modules/...`) 모두 패치
  2. `~/.hermes/hermes-agent/tools/environments/local.py:382` 의 `work_dir = cwd or self.cwd or os.getcwd()` 을 `work_dir = os.path.expanduser(cwd or self.cwd or os.getcwd())` 로 변경
  3. `~/.hermes/hermes-agent/tools/environments/persistent_shell.py:222` 의 `work_dir = cwd or self.cwd` 을 `work_dir = os.path.expanduser(cwd or self.cwd)` 로 변경 + `import os` 추가
  4. 로컬 패치는 업스트림 머지까지 유지. `npm install`/`git pull` 시 원복 가능성을 인지하고 수동 재적용 대비
- **이유**: (1) **adapter 버그**: Paperclip 서버는 `secretsSvc.resolveAdapterConfigForRuntime()`로 `adapterConfig.env`의 `{type:"plain",value:"..."}` 를 unwrap해서 `ctx.config`에 담아 adapter에 넘기는데, adapter는 이를 무시하고 raw `ctx.agent.adapterConfig`를 읽음. 결과적으로 Node `subprocess.spawn` env에 객체가 들어가 `String(obj)` → `"[object Object]"`로 주입되어 per-agent 인증 전면 불능. 이는 단일 1-line 결함이고 의미론이 명백 (ctx.config가 resolved 형태임은 서버 코드에 주석 + `adapter-utils/test.js:114` 주석으로 명시됨). (2) **expanduser 버그**: CEO Slack session 로그에서 `FileNotFoundError: '~/workspace/doro-monitor'` 발견. `subprocess.Popen(cwd='~/...')` 및 `shlex.quote('~/...')` 둘 다 tilde 미확장. workdir 파라미터가 사용자 경로 형태로 넘어오는 모든 케이스에서 재현. 둘 다 우회보다 직접 수정이 훨씬 간단
- **상태**: 완료 (monitor 2차 wakeup + DOR-39 dispatch 체인으로 adapter 패치 검증. expanduser는 python 런타임 테스트 + persistent=True/False 양쪽 통과)
- **참조**: STATE.md "블로커 해소" 항목, work/harness-v2.md (2026-04-12 Trap 필드), 관련 upstream PR 조사 필요(`hermes-paperclip-adapter` PR #31 언급 있음)
- **[DEBT]**: npm 관리 디렉토리 직접 수정 3건. 업스트림 PR 또는 로컬 fork + package.json override 중 장기 해결책 선택 필요

## AD-011: gbrain을 MECE 지식층으로 도입
- **일시**: 2026-04-11
- **결정**: `garrytan/gbrain` v0.7.0 (`bun add -g github:garrytan/gbrain`) + PGLite 백엔드 (`~/.gbrain/brain.pglite`). 디렉토리 구조는 dev 특화 MECE로 커스텀: `specs/`(CEO R/W) / `tech/`(Planner·Coder) / `projects/`(Planner·QA·DevOps·Monitor) / `people/`(CEO) / `streams/`(DevOps). 에이전트별 R/W 권한을 디렉토리 단위로 분리. LLM Wiki(`~/wiki`) 구상 폐기
- **이유**: gbrain은 OpenClaw/Hermes 대상 opinionated brain, markdown 파일 우선 + CLI + MCP 지원. 파일 기반이라 에이전트가 즉시 R/W 가능, PGLite는 스케일 시점에 활성화. LLM Wiki는 Obsidian+Memvid 이중 관리라 복잡도 높음
- **상태**: 완료 (구조 + README + PGLite init, 0 pages — 첫 spec이 1st page)
- **참조**: `~/gbrain/`, [garrytan/gbrain](https://github.com/garrytan/gbrain)
- **Deprecated**: AD-003 (LLM Wiki)

## AD-007: DOR-5 피벗 — 모니터링 UX를 Paperclip 플러그인(doro-office)으로 확장
- **일시**: 2026-04-11
- **결정**:
  1. 기존 `scripts/hermes_monitor.py` + `scripts/hermes_status.py` + Slack Webhook + CLI는 **데이터 레이어로 유지**.
  2. 시각화 레이어를 Paperclip 플러그인 `@dororong/doro-office`로 **추가**. 각 에이전트를 도로롱 캐릭터로 표현, idle/working/error/sleeping/waiting 5상태 CSS keyframes 애니메이션.
  3. 스택: React 19 + TypeScript + Vite + Zustand 5 + Tailwind CSS 4 + SVG + `@paperclipai/plugin-sdk v2026.403.0`. Canvas/Framer Motion/Router 배제.
  4. 캐릭터 IP는 2차 창작 비영리 범위로 사용 (사용자 지침). 기본 스킨=도로롱, 스킨 로더는 MVP-2에서 1급 기능으로 탑재.
  5. 배포 경로: 1순위 Paperclip plugin, 2순위 Tauri 2 래퍼(같은 SPA 재사용). Tauri는 MVP-3에서 필요성 판단 후 결정.
  6. 구현 단계: MVP-0(스켈레톤) → MVP-1(도로롱 + 상태머신) → MVP-2(오피스 + 스킨 로더) → MVP-3(실시간 + 타임라인 + 위젯 + (조건부)Tauri).
  7. 선행 기술 검증 4건 (React/Tailwind 호환, worker FS capability, dev 루프, widget 권한)을 MVP-0 착수 전에 선행 처리.
- **이유**: DOR-5 구현이 기능 요건은 모두 충족했으나 사용자가 기대한 UX(에이전트별 시각 피드백)를 CLI/JSON/Slack 조합으로는 만족시킬 수 없음. Paperclip plugin SDK가 공식 존재하고(v2026.403.0 매칭), 레퍼런스 프로젝트 `pablodelucca/pixel-agents`(MIT) · `WW-AI-Lab/openclaw-office`(MIT, 530 stars)가 거의 동일한 구조를 제공하여 이식 가능.
- **상태**: 진행 중 (EPIC DOR-21 생성, 선행 검증 DOR-22~25, MVP-0 부모 DOR-26 + child 4건 DOR-27~30, 에셋 소싱 DOR-31 분배 완료)
- **참조**: `docs/doro-office/03-doro-office-plan.md`, `docs/doro-office/04-decisions-snapshot.md`, `docs/doro-office/preflight/`, `DOR-21`, `DOR-5`(완료), `DOR-17`(완료)
