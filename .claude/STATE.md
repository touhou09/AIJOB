# 현재 프로젝트 상태

> 최종 업데이트: 2026-04-15

## 현재 단계
- **단일 파이프라인 + 자율 비서 구조 완성**: DM `@ame` = personal 비서 (자율 실행, 승인 불필요), Paperclip = 직렬 파이프라인 (Planner→Inspector→Coder→QA→merge→다음 task)
- **v2 full-cycle 실증 완료**: DOR-69~77 9건 done, main 8 commits (2332줄 src + 42 tests + build 13.95KB)
- **단일 파이프라인**: 병렬→직렬 전환. conflict 구조적 0%. QA pass → 즉시 squash merge → Planner 재wakeup
- **수렴 가드 3중**: Coder delegate_task(3회차) + Inspector PASS_WITH_NITS(round 3) + CEO 2차 강제ship
- **지식층**: ~/llm-wiki/ + Memvid MCP (gbrain PGLite 폐기)
- **에러/경고**: 0건 (gho 토큰 + allowlist + memvid dummy key)
- **[DEBT]**: ~~adapter/hermes-agent 로컬 패치 3건~~ (v0.9.0 업데이트로 청산), README Hard#2 미충족, main tsc 경고 잔존

## 인프라 현황

| 컴포넌트 | 상태 | 비고 |
|---------|------|------|
| Hermes Agent v0.9.0 | 실행 중 | 최신, 2026.4.13 빌드 |
| Paperclip 2026.403.0 | 실행 중 | https://paperclip.dororong.dev |
| gbrain v0.7.0 | 초기화 완료 | PGLite 백엔드 `~/.gbrain/brain.pglite`, 0 pages |
| ChatGPT Pro $200 | active | rate limit 실질 무제한, spark 접근 가능 (5/31까지) |
| CEO gateway (Slack @ame) | running | PID 68752, Socket Mode connected |
| Cloudflare Tunnel | 실행 중 | *.dororong.dev (8 hosts, `endpoints/sites.md`) |
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
1. 기획안 투입 → Dispatcher→Planner→task 분해 → 에이전트 자동 배정 E2E 실증
2. Paperclip 관련 rules 정리 (paperclip-policy.md → jira-policy.md 전환)
3. Cloudflare tunnel 미사용 route 정리 (paperclip, aivalink, n8n)
4. Dispatcher ADF description 파싱 개선
5. 에이전트 캐릭터 이미지 추가 (dashboard)

## Last Session (2026-04-15)
Cloudflare Tunnel에 `doro-office.dororong.dev → localhost:3102` 추가. `/etc/cloudflared/config.yml` ingress 등록 + `launchctl kickstart -k`로 reload, 엣지/로컬 ETag 일치로 라우팅 검증 완료. 로컬 Next.js 15 prod (personal 프로필 subprocess)가 `/` HEAD에 500 반환하는 건 앱 레벨 이슈로 별도 처리. `endpoints/sites.md` 신규 작성 (8개 터널 라우트 전체).

## Prev Session (2026-04-14)
Hermes v0.9.0 업데이트 + SOUL Jira 전환 + LLM Wiki 2-wiki 구조. 주요 작업:
1. Hermes v0.8.0→v0.9.0 업데이트 (573 commits). 로컬 패치 3건 전부 불필요로 DEBT 청산
2. SOUL.md 7개 Paperclip curl→Jira MCP 전환 + Tier 컨텍스트 로딩 추가
3. 고아 alias 5개 삭제 + .env 글로벌 심링크 (8프로필→~/.hermes/.env) + GITHUB_TOKEN 추가
4. LLM Wiki 리서치(Karpathy/v2/Beyond the Wiki/nvk) + 4자 회의 → 공용+개별 2-wiki 확정
5. SOUL.md 9개: "LLM Wiki 지식층" 보일러플레이트 삭제 → "위키 시스템"(공용/개별) 교체
6. 개별 위키 9개 프로필 wiki/ 초기화 + ~/llm-wiki/ Obsidian vault 설정
