# CTO Code Review Checklist

> team-cto 에이전트가 engineer 구현물을 리뷰할 때 사용하는 체크리스트.
> Paperclip 공식 CTO 워크플로우 + HubSpot judge 패턴 + Anthropic specialist 관점 이식.

## 적용 범위
- team-backend / team-frontend / team-data 구현 결과물
- team-devops 인프라/IaC 변경
- 데이터 스키마 변경 (BREAKING 판단 대상)

## 제외 범위
- team-qa 테스트 작성 / 회귀 검증 (QA 자체 검증)
- orchestrator 분해/분배 판단 (CEO 권한)
- 단순 문서 / 상수 / 버전 업데이트
- preflight / 리서치 / 조사 / 진단 이슈 (`[DIAG]`, 웹 리서치, 로그 분석, 선행 검증)
- 에셋 수집, ATTRIBUTION 정리, 파일 시스템 배치 같은 운영 작업

> 제외 범위에 해당하는 이슈는 engineer가 `status: done` 직접 전환 + 코멘트에 `skip-cto-review: {이유}` 를 명시한다. `assigneeUserId`를 설정해 user에게 반려하면 안 된다 (orphan 발생). 상세는 `paperclip-policy.md` "5단계 — 완료" 참조.

---

## 체크리스트

### 1. 정확성 (Correctness)
- [ ] 구현 로직이 이슈 description의 완료 조건과 일치
- [ ] 엣지 케이스 처리 (빈 입력, null, empty list, 경계값)
- [ ] 비동기 코드의 await 누락 없음
- [ ] 트랜잭션 경계가 올바름 (commit/rollback)
- [ ] 숫자 타입 오버플로/정밀도 손실 고려

### 2. 네이밍 / 일관성
- [ ] 함수/변수명이 기존 코드베이스 컨벤션과 일치
- [ ] 도메인 용어 일관성 (같은 개념에 여러 이름 없음)
- [ ] 약어 남발 금지 (unless 도메인 표준)
- [ ] 파일 위치가 기존 레이어 구조 따름

### 3. 보안 (절대 PASS 금지)
- [ ] **하드코딩된 시크릿** (API key, password, token) — 있으면 즉시 BLOCKED
- [ ] **SQL injection**: raw SQL + string concat 없음, 파라미터화 쿼리만
- [ ] **XSS**: 사용자 입력을 HTML에 삽입 시 이스케이프
- [ ] **권한 체크**: 모든 보호 엔드포인트에 인증/권한 검증
- [ ] **PII 로그 노출**: 로그에 이메일/전화/주민번호 등 평문 노출 없음
- [ ] **CSRF 토큰** (상태 변경 엔드포인트)
- [ ] **Path traversal** (사용자 입력 기반 파일 경로)
- [ ] **SSRF** (사용자 입력 기반 URL fetch)
- [ ] **rules/no-delete-policy.md** 운영 환경 절대 금지 명령 위반 없음

**보안 항목 중 하나라도 위반 시 BLOCKED + orchestrator 에스컬레이션. 타협 불가.**

### 4. 에러 처리
- [ ] 외부 호출(HTTP, DB, FS)에 timeout 명시
- [ ] 광범위 `except:` / `catch (e)` 금지 (구체적 예외만)
- [ ] 에러를 조용히 삼키지 않음 (최소한 로그)
- [ ] retry 로직이 exponential backoff + max attempts
- [ ] 실패 시 rollback/cleanup 경로 존재

### 5. 타입 안정성
- [ ] **Python**: 전 함수에 type hints (반환 타입 포함)
- [ ] **Python**: `mypy --strict` 통과 수준 (Any 남용 없음)
- [ ] **TypeScript**: strict mode, `any` 금지 (불가피할 때만 주석 + 이유)
- [ ] 외부 입력 검증 (Zod, pydantic 등)

### 6. 단일 책임 원칙 (SRP)
- [ ] 한 함수가 한 가지 일만 함
- [ ] 한 클래스가 한 가지 책임
- [ ] 한 모듈이 한 도메인 관심사

### 7. 테스트 커버리지
- [ ] 핵심 경로 단위 테스트 존재
- [ ] 엣지 케이스 (빈값, null, 경계값) 커버
- [ ] 실패 시나리오 (예외, timeout, retry) 커버
- [ ] 통합 테스트는 real DB/API 사용 (mock 남용 금지)

### 8. 아키텍처 일관성
- [ ] 레이어 경계 존중 (repository/service/controller)
- [ ] 도메인 간 의존성 방향이 올바름 (순환 의존 없음)
- [ ] 공통 유틸 재사용 (중복 구현 없음)
- [ ] 다른 엔지니어 작업과 호환 (네이밍, 인터페이스)

### 9. 성능 / 확장성
- [ ] O(n²) 또는 그 이상 알고리즘이 있으면 n 크기 고려
- [ ] N+1 쿼리 없음 (join/prefetch 활용)
- [ ] 불필요한 전체 로드 없음 (pagination, limit)
- [ ] 캐시 전략 적절 (TTL, invalidation)
- [ ] 큰 파일/결과는 stream 처리

### 10. 문서화 / 유지보수성
- [ ] 복잡한 로직에 주석 (why, not what)
- [ ] API 변경 시 스펙 문서 갱신 (OpenAPI 등)
- [ ] BREAKING change면 `[BREAKING]` 플래그 + 영향 컴포넌트 태깅

---

## HubSpot Judge 원칙 (피드백 self-evaluate)

리뷰 코멘트를 등록하기 전에 각 피드백 항목을 다음 3가지로 self-evaluate. 통과 못한 항목은 **제거**.

### 1. 구체적인가?
- ✅ "src/api/users.py:42 — `except Exception:` → `except ValueError:` (구체적 예외로 좁혀야 함)"
- ❌ "에러 처리가 부족합니다"

### 2. 실제 문제인가 vs 선호인가?
- ✅ **문제**: 보안 취약점, 버그, 성능 문제, 타입 에러
- ❌ **선호**: 변수명 스타일, 주석 톤, 함수 분리 취향

### 3. 엔지니어가 수정 가능한가?
- ✅ 리뷰 범위 내 수정: 해당 파일/함수만 고치면 됨
- ❌ 리뷰 범위 밖: 아키텍처 재설계 필요 → BLOCKED + orchestrator 에스컬레이션

---

## 판단 기준

### PASS
- 모든 보안 항목 통과
- 필수 항목(정확성, 에러 처리, 타입 안정성) 통과
- 경미한 개선사항만 존재 (권장만, 필수 아님)

### CHANGES_REQUESTED
- 보안 외 필수 항목 중 1개 이상 실패
- 엔지니어가 해당 파일/함수 수정으로 해결 가능
- 피드백에 구체적 수정 지시 포함 (파일:라인 + 수정 내용)

### BLOCKED
- 보안 항목 위반
- 구조적/아키텍처적 문제 (단순 수정으로 해결 불가)
- 다른 에이전트와의 의존성 충돌
- no-delete-policy 위반
- 리뷰 과정에서 발견한 다른 컴포넌트의 버그

---

## 리뷰 피드백 코멘트 포맷

```markdown
[cto-review] DOR-XX 검토 결과: {PASS | CHANGES_REQUESTED | BLOCKED}

## 체크리스트
- [x] 1. 정확성
- [x] 2. 네이밍 / 일관성
- [x] 3. 보안
- [ ] 4. 에러 처리 — {파일:라인}에서 {구체적 문제}
- [x] 5. 타입 안정성
- [x] 6. 단일 책임 원칙
- [ ] 7. 테스트 커버리지 — {누락된 케이스}
- [x] 8. 아키텍처 일관성
- [x] 9. 성능 / 확장성
- [x] 10. 문서화

## 필수 수정 (CHANGES_REQUESTED / BLOCKED 시)
1. {파일:라인} — {구체적 지시}
2. {파일:라인} — {구체적 지시}

## 권장 개선 (선택, 생략 가능)
- {설명 — 이번 PR 범위 밖이지만 다음에 개선할 것}

## 결론
{한두 줄 요약, 엔지니어가 바로 이해할 수 있게}
```

---

## 상태 전환 요약

| 판단 | status 전환 | assigneeAgentId | parent 이슈 조치 |
|------|-----------|----------------|-----------------|
| PASS | `done` | (변경 없음) | 완료 알림 코멘트 |
| CHANGES_REQUESTED | `todo` | engineer로 복귀 | (변경 없음) |
| BLOCKED | `blocked` | orchestrator로 에스컬레이션 | 에스컬레이션 플래그 코멘트 |

---

## 참고

- Paperclip 공식 CTO 에이전트 워크플로우 (fujigo-soft.com, 2026-03-31)
- HubSpot Sidekick "judge agent" 패턴 (InfoQ, 2026-03)
- Anthropic specialist parallel dispatch (Qodo, 2026)
- ChatDev 7-role pipeline (CEO → CPO → CTO → Programmer → Reviewer → Tester → Designer)
