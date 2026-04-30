# AIJOB 업무 Flow Harness

AIJOB 업무 Flow Harness는 대화로 들어오는 업무를 **요구사항 정의 → flow/tool 설계 → 공유 문서 → 실행 → 검증 → 결과 보고 → 티켓 trace**로 정규화하는 운영 규칙이다.

## 왜 추가했나

Arroyo/streamPlatform, multi_datacycle 문서화/티켓화 과정에서 다음 문제가 반복됐다.

- 요구사항 해석이 늦어 단일 장애 RCA와 전체 작업 흐름 정리를 혼동했다.
- 모니터링/검증 기준이 명확하지 않아 로그 단편에 매몰됐다.
- 완료 후 문서/티켓/멘션/검토 이관은 가능했지만 매번 대화로 재정렬해야 했다.
- 티켓 생성 시 담당자/본문 외에 라벨·모듈·에픽 같은 알림/정렬 메타데이터를 놓치기 쉬웠다.

## 핵심 원칙

1. 바로 실행하지 말고 요구사항과 완료 조건을 먼저 정의한다.
2. M+ 업무는 업무 정의서를 만들고 공유한다.
3. 구현/운영 조치는 테스트 방식과 실제 검증 기록 없이는 완료 처리하지 않는다.
4. 최종 결과는 결과 보고서로 남긴다.
5. 티켓은 진행 audit log로 사용하고, 방향 변경/피벗/검증/결론을 코멘트로 남긴다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `.claude/rules/flow-harness-policy.md` | 세션 중 적용할 정책 |
| `.claude/commands/flow-harness.md` | 실행 절차 |
| `.claude/runbooks/flow-harness-templates.md` | 요구사항 카드, 정의서, 테스트 기록, 결과 보고서, 티켓 코멘트 템플릿 |
| `docs/flow-harness-raw-feedback.md` | 2026-04-30 사용자 피드백 원문 정리 |

## 적용 순서

```text
업무 입력
  → Requirement card
  → Work definition
  → Tool/channel selection
  → Ticket kickoff comment
  → Implementation / operation
  → Implementation test record
  → Final result report
  → Ticket result/review comment
```
