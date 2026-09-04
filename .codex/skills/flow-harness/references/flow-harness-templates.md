# AIJOB Flow Harness 템플릿

> 정책: `.claude/rules/flow-harness-policy.md`
> 명령 절차: `.claude/commands/flow-harness.md`

---

## 1. Requirement Card

```yaml
requirement_card:
  title: ""
  requester: ""
  background: "왜 필요한가"
  desired_outcome: "원하는 최종 상태"
  scope:
    include: []
    exclude: []
  constraints:
    environment: null
    deadline: null
    destructive_actions_allowed: false
    secrets_allowed: false
  acceptance_criteria: []
  verification_evidence: []
  flow_design:
    steps: []
    dependencies: []
    decision_points: []
  tool_selection:
    ticket: null
    confluence: null
    git_repos: []
    monitoring: []
    scripts: []
  share_targets:
    confluence: null
    ticket: null
    reviewers: []
```

---

## 2. 업무 정의서

````markdown
# 업무 정의서 — {업무명}

> 작성일: YYYY-MM-DD
> 작성자:
> 상태: Draft / Shared / In Progress / Review / Done
> 관련 티켓:
> 공유 위치:

## 1. 한 줄 정의

이번 업무는 **{무엇을 왜 진행하는지}** 를 수행한다.

## 2. 배경

- 요청/피드백:
- 현재 문제:
- 왜 지금 필요한가:

## 3. 목표

- 목표 1:
- 목표 2:
- 목표 3:

## 4. 범위

### 포함

-

### 제외

-

## 5. 업무 Flow

```text
요구사항 정의
→ Flow 설계
→ Tool 선정
→ 정의서 공유
→ 실행
→ 검증
→ 문서화/티켓 이관
```

| 단계 | 작업 | 도구 | 산출물 | 담당 |
|---|---|---|---|---|
| 1 | 요구사항 정의 | 대화/티켓 | requirement card |  |
| 2 | Flow 설계 | 문서 | flow diagram/list |  |
| 3 | Tool 선정 | Ticket/Confluence/Git/Monitoring | tool selection table |  |
| 4 | 실행 | TBD | 변경/조치 |  |
| 5 | 검증 | TBD | evidence |  |
| 6 | 공유/이관 | Confluence/Ticket | 링크/코멘트/멘션 |  |

## 6. Tool / 채널 선정

| 도구/채널 | 사용 목적 | 선정 이유 | 링크/위치 |
|---|---|---|---|
| Ticket | 티켓 상태/리뷰 이관 |  |  |
| Confluence | 팀 공유 문서 |  |  |
| Git | 변경 이력 |  |  |
| Grafana/Prometheus | 지표 검증 |  |  |
| Loki | 로그 근거 |  |  |
| kubectl/API | 런타임 상태 |  |  |

## 7. 역할 / 리뷰

| 역할 | 사람 | 책임 |
|---|---|---|
| Owner |  |  |
| Reviewer |  |  |
| Stakeholder |  |  |

## 8. 완료 조건

- [ ]
- [ ]
- [ ]

## 9. 검증 계획

| 검증 항목 | 방법 | 성공 기준 | 증거 위치 |
|---|---|---|---|
|  |  |  |  |

## 10. 공유 / 보고 계획

- 공유 문서:
- 티켓 코멘트:
- 멘션 대상:
- 보고 주기:

## 11. 리스크 / 롤백 또는 완화

| 리스크 | 영향 | 완화/롤백 |
|---|---|---|
|  |  |  |

## 12. 변경 이력

| 일시 | 변경 | 이유 |
|---|---|---|
| YYYY-MM-DD | 최초 작성 |  |
````

---

## 3. 구현 테스트 기록

```markdown
# 구현 테스트 기록 — {업무명}

> 관련 정의서:
> 관련 티켓:
> 구현 범위:
> 최종 판정: pass / partial / fail

## 1. 구현 요약

- 변경 내용:
- 연결 요구사항:
- 관련 commit/PR:

## 2. 테스트 방식

| 구분 | 내용 |
|---|---|
| 테스트 전략 | unit / integration / e2e / load / manual / observability |
| 테스트 환경 | local / staging / prod / CI |
| 성공 기준 |  |
| 실패 기준 |  |

## 3. 테스트 실행 기록

| # | 시간 | 실행자 | 환경 | 명령/방법 | 결과 | 증거 |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  | pass/fail/partial |  |

## 4. 검증 증거

- CI/Test URL:
- 로그 쿼리:
- Grafana/Prometheus time range:
- 스크린샷/첨부:
- kubectl/API output 요약:

## 5. 테스트 피드백

| 출처 | 피드백 | 판단 | 후속 조치 |
|---|---|---|---|
|  |  | 반영/보류/기각 |  |

## 6. Not-tested

-

## 7. 재테스트 필요 항목

-

## 8. 최종 판정

- 판정: pass / partial / fail
- 이유:
- 남은 리스크:
```

---

## 4. 결과 보고서

```markdown
# 결과 보고서 — {업무명}

> 작성일: YYYY-MM-DD
> 관련 정의서:
> 관련 테스트 기록:
> 관련 티켓:
> 최종 결론: 완료 / 부분 완료 / 보류 / 실패 / 피벗 필요

## 1. 한 줄 결론

이번 작업은 **{무엇에 대해 어떤 결론이 났는지}** 로 정리된다.

## 2. 작업 배경 / 목표

- 배경:
- 목표:
- 최초 요청/피드백:

## 3. 수행 내용

| 구분 | 수행 내용 | 산출물/링크 |
|---|---|---|
|  |  |  |

## 4. 요구사항 대비 결과

| 요구사항 | 결과 | 근거 |
|---|---|---|
|  | 충족 / 부분 충족 / 미충족 / 변경됨 |  |

## 5. 검증 / 테스트 결과

| 테스트 | 환경 | 결과 | 증거 |
|---|---|---|---|
|  |  | pass / fail / partial |  |

### Tested

-

### Not-tested

-

## 6. 피드백 반영 결과

| 피드백 | 출처 | 처리 | 이유/후속 |
|---|---|---|---|
|  |  | 반영 / 보류 / 기각 |  |

## 7. 최종 결론

- 결론 분류: 완료 / 부분 완료 / 보류 / 실패 / 피벗 필요
- 판단 이유:
- 의사결정에 필요한 핵심 근거:

## 8. 남은 리스크 / 후속 작업

| 후속 작업 | 이유 | 담당 | 티켓/링크 |
|---|---|---|---|
|  |  |  |  |

## 9. 공유 내역

- Confluence:
- Ticket comment:
- 멘션 대상:
- 기타 공유 채널:

## 10. 변경 이력

| 일시 | 변경 | 이유 |
|---|---|---|
| YYYY-MM-DD | 최초 작성 |  |
```

---

## 5. 티켓 코멘트 Trace

### 착수 코멘트

```html
<p><strong>[착수]</strong> {업무명} 진행 시작합니다.</p>
<ul>
  <li><p>요구사항: {요약}</p></li>
  <li><p>진행 Flow: {요약 또는 정의서 링크}</p></li>
  <li><p>완료 조건: {acceptance criteria}</p></li>
  <li><p>공유 문서: {링크}</p></li>
  <li><p>다음 단계: {다음 액션}</p></li>
</ul>
```

### 진행 코멘트

```html
<p><strong>[진행]</strong> {단계 요약}</p>
<ul>
  <li><p>현재 상태: {상태}</p></li>
  <li><p>수행 내용: {수행}</p></li>
  <li><p>근거/증거: {링크/로그/메트릭}</p></li>
  <li><p>다음 단계: {다음 액션}</p></li>
</ul>
```

### 방향 변경 코멘트

```html
<p><strong>[방향 변경]</strong> {기존 방향} → {새 방향}</p>
<ul>
  <li><p>변경 이유: {근거/피드백/제약}</p></li>
  <li><p>영향 범위: {범위/검증 영향}</p></li>
  <li><p>새 진행 Flow: {새 단계}</p></li>
  <li><p>다음 단계: {다음 액션}</p></li>
</ul>
```

### 테스트/검증 코멘트

```html
<p><strong>[검증]</strong> {구현/조치 검증 결과}</p>
<ul>
  <li><p>테스트 방식: {unit/e2e/load/manual/observability}</p></li>
  <li><p>결과: {pass/fail/partial}</p></li>
  <li><p>증거: {링크/로그/메트릭}</p></li>
  <li><p>Not-tested: {남은 영역}</p></li>
</ul>
```

### 결과/검토 이관 코멘트

```html
<p>{멘션} <strong>[결과 보고]</strong> {최종 결론}</p>
<ul>
  <li><p>결과 보고서: {링크}</p></li>
  <li><p>요구사항 대비 결과: {요약}</p></li>
  <li><p>남은 후속: {후속}</p></li>
  <li><p>리뷰 요청: {리뷰 포인트}</p></li>
</ul>
```
