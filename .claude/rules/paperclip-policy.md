# Paperclip 이슈 운영 규칙

## 핵심 원칙
- Paperclip 이슈가 유일한 작업 관리 도구 (hermes 브랜치)
- 이중 관리 금지
- description 없는 이슈 생성 금지
- 상태/담당자 전환은 에이전트 자율 판단. 단 규칙 내에서.

## 이슈 상태 흐름 (Kanban + CTO 리뷰 게이트)
```
todo ─→ in_progress ─→ in_review ─→ done
  ↑          │            │
  │          │            ├─→ todo (CHANGES_REQUESTED, engineer 복귀)
  │          │            └─→ blocked (BLOCKED, orchestrator 에스컬레이션)
  │          ↓
  └── blocked
```
- **todo**: 대기 — 에이전트가 heartbeat로 자동 픽업
- **in_progress**: 에이전트 실행 중
- **in_review**: **CTO 리뷰 대기** (engineer 완료 시 자동 전환 + CTO로 재할당)
- **done**: 완료 (리뷰 통과 또는 reporter == assignee)
- **blocked**: 블로커/보안 이슈 — orchestrator로 에스컬레이션
- **backlog 사용 금지** — Paperclip 기본값이 backlog이므로 생성 시 반드시 `"status": "todo"` 명시

## CTO 리뷰 핸드오프 (engineer → CTO)

다음 엔지니어 프로필은 **구현 이슈 완료 시 반드시 CTO 리뷰를 거친다**:
- team-backend
- team-frontend
- team-data
- team-devops (인프라/IaC 변경 시)

### engineer 측 완료 절차
구현 완료 시 다음 순서로 수행:

1. **self-check 수행**
   - 린터/타입 체커/테스트 실행 결과 확인
   - 하드코딩 시크릿 / raw SQL / 누락된 에러 처리 스스로 점검

2. **코멘트 남기기**
   ```markdown
   [impl-done] DOR-XX 구현 완료

   ## 변경 파일
   - path/to/file1.py (+N/-M 줄) — {한 줄 설명}
   - path/to/file2.py (+K/-L 줄) — {한 줄 설명}

   ## 주요 변경 요약
   {2~3줄로 무엇을 어떻게 구현했는지}

   ## self-check
   - [x] ruff/eslint 통과
   - [x] mypy/tsc 통과
   - [x] 단위 테스트 통과 (N개 추가, 모두 pass)
   - [x] 보안 self-review (시크릿/SQL injection/XSS 확인)
   ```

3. **상태 전환 + 재할당**
   - `status: in_review`
   - `assigneeAgentId`: team-cto

### 리뷰 생략 조건
- 단순 문서/상수/버전 업데이트
- team-qa가 직접 수행한 테스트 코드 (QA 자체 검증)
- orchestrator가 reporter인 진단 이슈 (DIAG 등)

생략 시 engineer가 바로 `done` 처리 가능. 단 코멘트에 "skip-cto-review: {이유}" 명시.

### CTO 측 리뷰 절차
`rules/cto-review-checklist.md` 참조. 10개 체크리스트 항목 + HubSpot judge 원칙 + 판단(PASS/CHANGES_REQUESTED/BLOCKED).

## 이슈 생성 규칙

### 필수 필드
| 필드 | 값 |
|------|---|
| title | 동사로 시작, 60자 이내 ("XXX 구현", "YYY 버그 수정") |
| description | 아래 템플릿 필수 |
| status | `"todo"` (backlog 금지) |
| assigneeAgentId | 역할에 맞는 에이전트 (모르면 orchestrator) |
| priority | `low` / `medium` / `high` (기본 medium) |
| parentId | 하위 이슈인 경우 부모 ID |

### description 템플릿
```markdown
## 배경
{왜 이 작업이 필요한지 한두 줄}

## 범위
- 포함: {이 티켓에서 다루는 것}
- 제외: {이 티켓에서 다루지 않는 것}

## 완료 조건
- {조건1 — 구체적, 검증 가능}
- {조건2}

## 참고
- {관련 이슈: DOR-X}
- {파일/링크/문서}
```

> description 없는 이슈는 자동 reject. 에이전트는 description 없으면 작업 시작 금지 + 생성자에게 코멘트로 요청.

## 에이전트 자율 판단 워크플로우

이슈를 받으면 **아래 순서로 판단**:

### 1단계 — 역할 확인
- 이 이슈가 내 전문 영역인가?
- **아니면**: `assigneeAgentId`를 적합 에이전트로 변경 + 코멘트 남김
  ```
  [auto] 이 이슈는 {영역}이라 {대상 에이전트}가 더 적합. 재할당.
  ```

### 2단계 — 분해 판단
- 완료 조건이 3개 이상 또는 크로스 도메인인가?
- **예**: 하위 이슈로 분해 (parentId 설정) + 본 이슈는 코디네이터 역할만 수행
- **아니오**: 직접 실행

### 3단계 — 실행
- 상태를 `in_progress`로 변경
- 작업 수행
- 중간 진행은 코멘트로 남기지 않음 (노이즈). 완료 시 1회만.

### 4단계 — 블로커 대응
- 막히면 `blocked` 상태 + 코멘트로 이유 + 블로커 해결 가능한 에이전트로 재할당
  ```
  [auto] 블로커: {구체적 이유}. {대상 에이전트}에게 이관.
  ```

### 5단계 — 완료
- **reporter == assignee**: `done` 상태 + 완료 요약 코멘트
- **reporter ≠ assignee**: `in_review` 상태 + assignee를 reporter로 변경 + 완료 요약 코멘트
- **parentId 존재**: 부모 이슈에 완료 알림 코멘트
  ```
  [auto] {agentName}이 DOR-X를 완료. 요약: {한줄}
  ```

## 코멘트 트리거 대응

adapter가 이슈 코멘트를 감지하면 해당 에이전트를 wake한다. wake 시:
1. 코멘트 내용 확인
2. 질문이면 답변 코멘트 작성
3. 작업 재개 요청이면 상태 복귀 후 계속
4. 블로커 해제 알림이면 `blocked` → `in_progress`

## 하위 이슈 분해 기준

| 상황 | 분해 여부 |
|------|----------|
| 단일 파일 · 단일 시스템 변경 | ❌ 직접 수행 |
| 2일 이상 예상 | ✅ 분해 |
| 크로스 도메인 (frontend + backend) | ✅ 분해 |
| 테스트 작성 + 구현 동시 필요 | ✅ 분해 (QA로 핸드오프) |
| 설계 + 구현 동시 필요 | ✅ 설계 먼저, 구현 후속 |

## 에이전트 역할 매핑

재할당 판단 시 참고:

| 에이전트 | 역할 | 담당 영역 |
|---------|------|----------|
| orchestrator | CEO | 분해/분배/종합, 우선순위 판단 |
| team-backend | Backend | API, DB, 서버 로직, Python/FastAPI |
| team-frontend | Frontend | React/Next.js, UI, UX, 접근성 |
| team-qa | QA | 테스트 전략, 자동화, 버그 리포트, 회귀 |
| team-devops | DevOps | Docker/K8s, CI/CD, 인프라, 모니터링, 보안 |
| team-data | Data | 파이프라인, Polars/Delta, 분석 인프라, ML |

## 에이전트 등록
- role은 enum: ceo, cto, engineer, designer, pm, qa, devops, researcher, general
- adapterType: hermes_local
- adapterConfig.hermesCommand: 프로필 wrapper 이름

## 제약
- Paperclip 서버는 Mac Mini 전용
- 에이전트 등록/삭제는 사용자 승인 필수
- adapter가 heartbeat wake 시 자동으로 Paperclip API 예시를 프롬프트에 주입하므로 별도 스킬 불필요

## API 참고

| 동작 | 엔드포인트 | 메소드 |
|------|-----------|--------|
| 이슈 조회 | `/api/issues/{id}` | GET |
| 이슈 업데이트 | `/api/issues/{id}` | PATCH |
| 이슈 생성 | `/api/companies/{companyId}/issues` | POST |
| 코멘트 조회 | `/api/issues/{id}/comments` | GET |
| 코멘트 작성 | `/api/issues/{id}/comments` | POST |
| 내 이슈 목록 | `/api/companies/{companyId}/issues?assigneeAgentId={id}` | GET |

> adapter가 기본 프롬프트에 위 예시를 주입한다. 에이전트는 그대로 사용하면 됨.
