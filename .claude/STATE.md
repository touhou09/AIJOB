# 현재 프로젝트 상태

> 최종 업데이트: 2026-04-12

## 현재 단계
- **단일 파이프라인 + 자율 비서 구조 완성**: DM `@ame` = personal 비서 (자율 실행, 승인 불필요), Paperclip = 직렬 파이프라인 (Planner→Inspector→Coder→QA→merge→다음 task)
- **v2 full-cycle 실증 완료**: DOR-69~77 9건 done, main 8 commits (2332줄 src + 42 tests + build 13.95KB)
- **단일 파이프라인**: 병렬→직렬 전환. conflict 구조적 0%. QA pass → 즉시 squash merge → Planner 재wakeup
- **수렴 가드 3중**: Coder delegate_task(3회차) + Inspector PASS_WITH_NITS(round 3) + CEO 2차 강제ship
- **지식층**: ~/llm-wiki/ + Memvid MCP (gbrain PGLite 폐기)
- **에러/경고**: 0건 (gho 토큰 + allowlist + memvid dummy key)
- **[DEBT]**: adapter/hermes-agent 로컬 패치 3건, README Hard#2 미충족, main tsc 경고 잔존

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

## 미검증
- 단일 파이프라인 + QA auto-merge + Planner 재wakeup 체인의 실 E2E (다음 스펙 투입 시 첫 실증)
- personal 비서의 자율 스펙 생성 → Paperclip 핸드오프 실 동작
- README Hard 완료 조건 #2 (설치/지원 섹션) — v2 run에서 미충족 상태로 종료

## 다음 작업
1. personal 비서 DM 실증 — "이거 만들어" → 자율 스펙 → 파이프라인 시작 확인
2. 단일 파이프라인 E2E 관찰 — task 1개씩 직렬 실행 + QA merge + Planner 재wakeup
3. main tsc 타입 경고 정리 (런타임 영향 0이지만 clean build 목표)
4. 업스트림 PR 추적: hermes-paperclip-adapter #31, NousResearch/hermes-agent expanduser

## Last Session (2026-04-12)
대규모 세션. 주요 작업:
1. adapter env resolve 버그 + hermes expanduser 패치 → per-agent API key 7개 발급 → 이벤트 dispatch E2E 실증
2. Phase B archive (21 tag + phase-b-archive.md) → 21 PR close + 브랜치 삭제 → clean slate
3. v2 retrigger DOR-69~77 → 9/9 done → main squash merge 7건 (2332줄 src)
4. 4자 회의 2라운드 → AD-014/015 합의 (worktree + pollution + integrator + SLO)
5. 수렴 가드 3중 장치 (Coder delegate + Inspector round3 + CEO 2차)
6. 병렬→단일 파이프라인 전환 (AgenticFlict 리서치 기반, conflict 0%)
7. gbrain PGLite → ~/llm-wiki/ + Memvid MCP 전환
8. personal 비서 프로필 신설 → CEO→personal gateway 전환 → 자율 실행 (approvals: off)
9. Obsidian 설치 + #ceo 채널 생성 + 유저 초대
10. 에러 0 달성 (gho 토큰 + allowlist + memvid dummy key) + SOUL 7개 정비 (150줄, stale 경로, exfil clean)
