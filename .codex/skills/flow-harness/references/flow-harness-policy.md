---
description: "업무 입력을 요구사항→flow→tool→검증→보고→티켓 trace로 정규화하는 AIJOB Flow Harness"
---

# AIJOB 업무 Flow Harness 정책

## 목적

대화로 들어오는 피드백/업무 지시를 바로 실행하지 않고, AIJOB 운영 흐름에 맞춰 **요구사항 정의 → 업무 flow 설계 → tool/채널 선정 → 실행 → 검증 → 결과 보고 → 티켓/문서 공유 → 리뷰 이관**까지 일관되게 처리한다.

## 적용 대상

| 크기 | 적용 수준 |
|---|---|
| S | 요구사항/완료 조건만 짧게 확인하고 실행 |
| M+ | Requirement card + 업무 정의서 + 검증 기록 + 결과 보고 + 티켓 trace 적용 |
| 외부 팀/운영 영향 | M+ 여부와 무관하게 공유 문서와 티켓 trace 필수 |

## 1. Requirement-to-Flow Gate

새 업무가 들어오면 `Classify` 전에 요구사항을 먼저 정규화한다.

```text
업무 입력
  → 요구사항 정의
  → 완료 조건/검증 기준 정의
  → 업무 flow 설계
  → 필요한 tool/문서/티켓/관측 수단 선정
  → 실행 계획 문서화
  → 팀 공유
  → 실행/검증
```

### 요구사항 카드 필수 항목

- 요청자 / 배경 / 원하는 최종 상태
- 포함 범위와 제외 범위
- 제약: 환경, 마감, destructive action 허용 여부, secret 취급 여부
- 완료 조건과 검증 증거
- flow 단계, 의존성, 분기점
- 사용할 tool: Ticket(Jira/Plane), Confluence, Git, Grafana, Loki, Prometheus, kubectl/API, script
- 공유 대상: 문서 위치, 티켓, 리뷰어

## 2. Work Definition Document Gate

M+ 업무는 실행 전 업무 정의서 draft가 있어야 한다. 외부 리뷰어/운영자에게 영향을 주면 Confluence 또는 티켓 링크로 공유한다.

필수 섹션:

1. 배경 — 왜 이 일을 하는가
2. 목표 — 무엇이 되면 성공인가
3. 범위 — 포함/제외
4. 업무 Flow — 단계, 의존성, 분기점
5. Tool/채널 — Ticket, Confluence, Git, Monitoring 등
6. 역할/리뷰 — owner, reviewer, stakeholder
7. 완료 조건 — 검증 가능한 acceptance criteria
8. 검증/관측 — metric/log/test/evidence
9. 공유/보고 — 링크, 보고 주기
10. 리스크/롤백 — 실패 시 완화/복구

완료 조건과 검증 방식이 비어 있으면 정의서 미완성으로 본다.

## 3. Implementation Test Record Gate

구현 업무는 테스트 방식과 실제 테스트 기록이 없으면 완료 처리하지 않는다.

기록해야 할 것:

- 구현 대상과 연결 요구사항
- 테스트 전략: unit / integration / e2e / load / manual / observability
- 테스트 환경: local / CI / staging / prod 등
- 성공 기준과 실패 기준
- 실제 실행 시간, 명령/방법, 결과, 증거
- 사용자/리뷰어/운영자/로그/메트릭 기반 피드백
- Not-tested와 재테스트 필요 항목
- 최종 판정: pass / partial / fail

완료 보고에는 항상 `Tested`와 `Not-tested`를 모두 포함한다.

## 4. Final Result Report Gate

M+ 업무는 결과 보고서 없이는 완료 처리하지 않는다.

결과 보고서에는 다음이 있어야 한다.

- 한 줄 결론
- 작업 배경/목표
- 수행 내용
- 요구사항 대비 결과
- 검증/테스트 결과와 증거 링크
- 피드백 반영/보류/기각 내역
- 최종 결론: 완료 / 부분 완료 / 보류 / 실패 / 피벗 필요
- 남은 리스크와 후속 작업
- 공유 위치: Confluence, Ticket comment, PR, dashboard 등

## 5. Ticket Comment Trace Gate

Ticket은 최종 상태만 담는 곳이 아니라 업무 진행 audit log다. M+ 업무는 주요 단계마다 코멘트 trace를 남긴다.

코멘트가 필요한 시점:

| 시점 | 남길 내용 |
|---|---|
| 착수 | 요구사항 요약, 정의서 링크, 진행 flow |
| 요구사항 확정 | include/exclude, 완료 조건 |
| flow/tool 선정 | 선택한 tool, 이유, 공유 문서 링크 |
| 주요 조치 전 | 현재 상태, 조치 목적, 리스크/롤백 |
| 주요 조치 후 | 적용 내용, 검증 결과, 다음 단계 |
| 방향 변경/피벗 | 기존 방향, 새 방향, 이유, 영향 |
| 개선사항 발견 | 개선 내용, 우선순위, 후속 티켓/담당 |
| 테스트 완료 | 테스트 방식, 결과, 증거 |
| 결과 보고 | 최종 결론, 보고서 링크, 후속 작업 |
| 검토 이관 | 리뷰 포인트, 멘션 대상, 링크 |

코멘트에는 반드시 “왜”와 “근거”가 있어야 한다. 단순히 “수정함”만 남기지 않는다.

## 6. 완료 전 체크리스트

- [ ] Requirement card 작성/갱신
- [ ] Work definition 공유 여부 확인
- [ ] Tool/채널 선정 이유 기록
- [ ] 실행/구현 결과 기록
- [ ] 테스트 방식과 실제 결과 기록
- [ ] Tested / Not-tested 명시
- [ ] 결과 보고서 작성
- [ ] 티켓 코멘트 trace 남김
- [ ] 리뷰어/요청자 멘션 또는 담당자 이관
- [ ] 남은 리스크와 후속 티켓 분리

## 템플릿 위치

- `.claude/runbooks/flow-harness-templates.md`
- 명령 절차: `.claude/commands/flow-harness.md`
