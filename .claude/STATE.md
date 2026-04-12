# 현재 프로젝트 상태

> 최종 업데이트: 2026-04-12

## 현재 단계
- **Harness v2 "자율 종결" 메커니즘 적용 완료** (AD-014, AD-015): worktree 격리 + integrator-loop skill + pollution 게이트 + CEO 보고 포맷 + SLO. Phase 1 = dry-run only
- **Phase B 자율 검증 완료** (DOR-39~68 30건 5시간 자율 실행, 22 feature 브랜치 + 21 PR 생성. merge는 0건)
- **Dispatch 모델**: 이벤트 기반 (`queueIssueAssignmentWakeup`). 주기 heartbeat 폐기 (AD-012)
- **Adapter 버그 2건 로컬 패치**: hermes-paperclip-adapter env resolve + hermes-agent expanduser (AD-013, [DEBT] 누적)
- 다음 검증 단계: 새 스펙 1건 투입 → worktree 표준 준수 / pollution 게이트 동작 / integrator-loop dry-run 실행 / CEO 보고 포맷 적용 동시 관찰
- Merge flip 조건: Inspector pollution 게이트 **1주 무사고** + 유저 명시 승인 (AD-014)
- 기존 CTO 루프 구조 + DOR-21~38 doro-office 작업은 전량 폐기 (AD-009 참조)
- CEO 만 Slack `@ame` 직결, 나머지 6개는 Paperclip adapter 경로 (이벤트 wakeup)

## 인프라 현황

| 컴포넌트 | 상태 | 비고 |
|---------|------|------|
| Hermes Agent v0.8.0 | 실행 중 | 352 commits behind, 업데이트 유보 |
| Paperclip 2026.403.0 | 실행 중 | https://paperclip.dororong.dev |
| gbrain v0.7.0 | 초기화 완료 | PGLite 백엔드 `~/.gbrain/brain.pglite`, 0 pages |
| ChatGPT Pro $200 | active | rate limit 실질 무제한, spark 접근 가능 (5/31까지) |
| CEO gateway (Slack @ame) | running | PID 68752, Socket Mode connected |
| Cloudflare Tunnel | 실행 중 | *.dororong.dev |
| Memvid MCP | 연결됨 | 전 버전 잔재, gbrain 대체 예정 |
| OpenClaw | **archived + cron 제거** | `~/.openclaw.pre-migration`, 좀비 keepalive cron 제거 완료 |

## 7-Agent 구성

| 프로필 | role | 모델 | reasoning | Paperclip ID (prefix) | Dispatch |
|--------|------|------|-----------|----------------------|----------|
| ceo | ceo | gpt-5.4 | high | `3a02c7bc` | **Slack launchd gateway** + Paperclip adapter |
| planner | pm | gpt-5.4 | high | `56162566` | Paperclip adapter (assignment wakeup) ✅ |
| inspector | cto | gpt-5.4 | high | `6cfb8803` | Paperclip adapter (assignment + comment wakeup) ✅ |
| coder | engineer | gpt-5.4 | medium | `6f441561` | Paperclip adapter (미검증) |
| qa | qa | gpt-5.4-mini | medium | `d0ac5a06` | Paperclip adapter (미검증) |
| devops | devops | gpt-5.4-mini | medium | `ed20cab8` | Paperclip adapter + cron (미검증) |
| monitor | general | gpt-5.4-mini | low | `359d1d62` | Paperclip adapter (on-demand wakeup) ✅ |

7 agent 모두 per-agent API key 발급 + `adapterConfig.env.PAPERCLIP_API_KEY` 주입 완료 (2026-04-12).

**Paperclip company**: `dororong` (`abac28ea-9edd-4ddb-b40a-0baf52505357`)

## 활성 프로젝트

| 프로젝트 | Paperclip ID | Git | 상태 |
|----------|-------------|-----|------|
| doro-monitor | `708a8844-78ed-4e27-a40b-d10aee065a41` | `github.com/touhou09/doro-monitor` | in_progress — 첫 스펙 대기 |

**기존 archived**: AIJOB, Hermes Infra, AivaLink (전부 archivedAt 설정)

## 활성 이슈
- **DOR-39** `[spec]` 통합 에이전트 모니터 플러그인 분해 — assignee=planner, status=todo, running (처리 중)
- **DOR-40** `[epic]` 공통 플러그인 아키텍처/도메인 계약 설계 — assignee=inspector, status=todo, parent=DOR-39
- **DOR-41~45** `[task]` Paperclip 셸/Hermes 셸/운영 조작/타임라인/README — assignee=inspector, status=backlog, parent=DOR-39
- Planner(pid 11765) + Inspector(pid 13358) 프로세스 동시 기동 상태 (세션 시작 시점 기준)

## 문서 구조

```
AIJOB/.claude/
├── STATE.md (이 파일)
├── CONTEXT.md
├── DECISIONS.md (AD-001~011)
├── TODO.md
├── rules/ (9개)
└── work/
    ├── hermes-infra.md (구 인프라 이력, 정리 대상)
    └── harness-v2.md (v2 빌드 이력, 최신)

~/.hermes/profiles/{ceo,planner,inspector,coder,qa,devops,monitor}/
└── SOUL + AGENTS + STATE + CONTEXT + DECISIONS + TODO + rules + work + workspace

~/gbrain/
└── README + {specs,tech,projects,people,streams}/README
    └── projects/doro-monitor/README.md (agent ID 레지스트리)
```

## 검증 상태 (E2E)
| 단계 | 상태 | 비고 |
|---|---|---|
| 1. 유저 Slack DM → CEO 티키타카 → gbrain/specs/ 저장 | 부분 | 2026-04-11 `agent-monitor-plugin.md` 저장 기록, handoff는 구 SOUL 상태라 미실행 |
| 2. CEO → Paperclip 이슈 생성 (assignee=planner) | **미검증** | 수동 생성으로 우회하여 3 검증. CEO Slack run에서 `$PAPERCLIP_API_KEY` 접근 가능한지 별도 확인 필요 |
| 3. Planner 자동 wakeup + 하위 이슈 분해 | ✅ | DOR-40 epic + DOR-41~45 task 5건 자동 생성, parent/assignee 규칙 준수 |
| 4. Inspector 자동 wakeup (pre-gate) | ✅ (기동) | 판정 결과(PASS/CHANGES_REQUESTED/BLOCKED) 미확인 |
| 5. Coder TDD + PR | 미검증 | `~/workspace/doro-monitor` 존재 여부도 별도 확인 |
| 6. Inspector post-gate + QA | 미검증 | |
| 7. Monitor drift 감지 (cron) | 미검증 | cron 미등록 |
| 8. DevOps 드림사이클 | 미검증 | cron 미등록 |

## 알려진 미검증 가정
- CEO Slack gateway(launchd) 프로세스에 `PAPERCLIP_API_KEY`가 전달되는지 — adapterConfig.env는 Paperclip adapter 경로에만 주입됨. CEO는 Slack 경로와 adapter 경로가 분리되어 있어 이슈 생성 curl이 실제로 성공할지 불확실
- Coder SOUL이 가정하는 `~/workspace/doro-monitor` feature 브랜치 흐름 (존재/권한)
- Planner 첫 run은 SOUL 차단 상태(exfil_curl)로 돌아서 promptTemplate만으로 분해 수행. 다음 run부터 패치된 SOUL 로딩될 예정이지만 결과 quality 비교 필요

## 다음 작업 (순서대로)
1. Planner/Inspector 현재 러닝 세션 완료 대기 → Inspector 판정 결과 + 코멘트 확인
2. DOR-41 첫 task로 Coder 실동작 실증 (assignee 재할당 시점)
3. CEO Slack 경로에서 `PAPERCLIP_API_KEY` 접근 가능한지 확인. 불가 시 CEO gateway plist에 env 추가 (`~/Library/LaunchAgents/ai.hermes.gateway-ceo.plist`)
4. Planner SOUL이 이번에는 제대로 로딩되는지 다음 wakeup에서 확인 (`~/.hermes/profiles/planner/logs/agent.log` 에 `exfil_curl` 경고 안 뜨면 OK)
5. `~/workspace/doro-monitor` 상태 점검 (Coder 실구현 전제)
6. E2E 1회 완주 시 → DOR-39~45 정리 + 새 스펙으로 2회차 실증
7. 업스트림 PR 추적: hermes-paperclip-adapter #31 머지 여부, `NousResearch/hermes-agent` expanduser 관련 이슈 있는지 스캔

## Last Session (2026-04-12)
- 파이프라인 연결 복구: adapter env resolve 버그 패치 + per-agent API key 발급 + SOUL/STATE/README 개정 + 이벤트 dispatch 체인 E2E 실증 (DOR-39~45)
- 코드 변경: `hermes-paperclip-adapter/dist/server/execute.js` (2 사본), `hermes-agent/tools/environments/{local,persistent_shell}.py`, `~/.hermes/profiles/{ceo,planner}/SOUL.md`, `~/.hermes/profiles/ceo/STATE.md`, `~/gbrain/projects/doro-monitor/README.md`
- 파이프라인 생성 이슈: DOR-39 (CEO→Planner 핸드오프 실증용), DOR-40~45 (Planner 자동 분해 결과)
- 문서: work/harness-v2.md append, DECISIONS.md (AD-012, AD-013), STATE.md (이 파일)
