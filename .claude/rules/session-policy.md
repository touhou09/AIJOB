---
description: "AI 세션 시작/종료 운영 정책"
---

# 세션 정책

## 세션 시작 절차 (Hot Tier 전부 로드)
1. `CLAUDE.md` 자동 로드 (Claude Code 기본 동작)
2. `.claude/STATE.md` 읽고 현재 상태 파악
3. `.claude/CONTEXT.md` 읽고 프로젝트 컨텍스트 파악
4. `.claude/DECISIONS.md` 읽고 결정 이력 파악
5. `.claude/TODO.md` 읽고 오늘의 작업 확인 (Jira Ready와 항상 일치)
6. 사용자 요청에 해당하는 `.claude/work/{category}.md` 로드

## 업무 Flow Harness Gate

M+ 업무나 외부 팀/운영 영향이 있는 업무는 실행 전에 `.claude/rules/flow-harness-policy.md`를 적용한다.

1. Requirement card로 요청 배경, 범위, 완료 조건, 검증 증거를 정의한다.
2. Work definition draft에 flow, tool/채널, 역할, 리스크/롤백을 기록한다.
3. 구현/운영 조치 후 implementation test record에 실제 테스트 방식과 결과를 남긴다.
4. 완료 시 final result report를 작성하고 티켓 코멘트로 링크/결론/후속을 공유한다.
5. 방향성 변경, 피벗, 개선사항 발견은 티켓 코멘트 trace에 남긴다.

단순 S 작업은 전체 산출물을 생략할 수 있지만, 완료 조건과 검증 근거는 응답에 남긴다.

## 문서 자동 갱신

### 원칙: 작업 단위로 즉시 갱신한다. 세션 종료까지 미루지 않는다.

### 갱신 단위

**reporting moment** — Claude가 사용자에게 작업 결과를 보고하는 시점.
"~했습니다"라고 말하는 그 시점에, 해당 작업의 문서 갱신을 함께 수행한다.

### 크기 필터 (S/M 판단)

모든 reporting moment에 풀 템플릿을 쓰면 노이즈가 된다. 변경 크기에 따라 기록 수준을 구분한다.

| 크기 | 판단 기준 | 기록 수준 |
|------|----------|----------|
| **S** | 단일 파일 · 단일 시스템 내 변경 | What + Why 2줄 |
| **M+** | 복수 파일 또는 시스템 간 연동 | 풀 템플릿 (What/Why/Impact/Test/Trap/Next) |

- "반나절" 같은 시간 기준은 AI가 측정 불가. **변경 파일 수 + 시스템 경계 횡단** 으로 판단.
- work-log-policy 문서화 대상이 아닌 작업(단순 버그 픽스, 스타일 변경)은 S/M 관계없이 기록 안 함.

### 갱신 트리거

Claude는 아래 시점을 감지하면 **사용자에게 묻지 않고** 해당 문서를 갱신한다.

| 트리거 | 갱신 대상 | 기록 방식 |
|--------|----------|----------|
| 작업 결과 보고 | work/{category}.md | S/M 크기 필터 적용 |
| 트러블슈팅 해결 | work/troubleshooting.md | **해결 시 1회만** (시도별 기록 안 함). 증상→원인→해결 3단 구조 |
| 인프라 변경 (배포, 설정 변경, 스케일링) | STATE.md | 기록 후 사용자에게 한 줄 확인 |
| 장애 복구 | work/troubleshooting.md | 인프라 변경이 아닌 troubleshooting으로 분류 |
| 아키텍처/설계 결정 | DECISIONS.md | AD 번호 부여 |
| 커밋 + push | STATE.md (Last Session) | 커밋 해시, 변경 요약 |
| 새 작업 계열 발생 | work/ 새 파일 + CLAUDE.md 인덱스 | 기존 카테고리에 안 맞을 때 |
| API/MQTT/Kafka/Redis/ClickHouse 인터페이스 변경 | endpoints/ 해당 파일 | 아래 "크로스팀" 섹션 참조 |

### 롤백 기록

롤백은 독립 항목으로 남기지 않는다. 최종 해결의 **Trap 필드에 흡수**: "X 시도 → 실패(사유) → Y로 전환 (복구 버전)". 롤백만 하고 해결 못한 채 세션 종료 시, work/에 미완료 항목으로 What+Why 2줄만.

### work/ 파일 분류 기준

AI는 **원인 기준**으로 분류한다.

| 원인 | 대상 파일 |
|------|----------|
| 예기치 않은 장애, 버그 | work/troubleshooting.md |
| 특정 시스템 기능 개발/개선 | work/{해당 시스템}.md (예: stream-platform.md) |
| 서버/클러스터 인프라 세팅 | work/infra-{환경}.md (예: infra-200.92.md) |

트러블슈팅 중 발견된 시스템 개선 사항 → 해결 후 해당 시스템 파일로 이동.

### [auto] 태그

AI가 자동 생성한 문서에는 `[auto]` 접두어를 붙인다.
- work/, Jira 코멘트, endpoints/ 갱신 모두 해당
- 사람이 검증/수정 시 `[auto→manual]`로 전환
- `[auto]` 태그 문서는 누구나 수정/삭제 가능 (별도 승인 불필요)

### 갱신하지 않는 경우
- 단순 Q&A (파일 변경 없음 + 3턴 이하)
- 코드를 읽으면 알 수 있는 내용
- git log/blame으로 확인 가능한 내용
- work-log-policy 문서화 대상이 아닌 작업 (단순 버그 픽스, 스타일 변경)

### 갱신 방식
- **말없이 실행**: "문서를 갱신하겠습니다" 같은 안내 불필요. 작업 흐름에 자연스럽게 끼워 넣는다.
- **작업 응답 끝에 붙이기**: 작업 결과를 사용자에게 보고하는 응답에서, 문서 갱신을 함께 수행한다.
- **정리 트리거**: 120줄 초과 시 경고 + 정리 시작, 150줄 초과 시 강제 정리 (완료+유추가능 삭제, 결정→DECISIONS.md 이동)

## Jira 코멘트 자동 갱신

### 원칙: reporting moment당 1건 append

작업 결과를 사용자에게 보고하는 시점에, 해당 Jira 티켓에 코멘트 1건을 자동 append한다.

- 중간 단계는 코멘트 안 남김. 보고 시점까지의 진행을 하나로 병합.
- description은 수정 금지 (코멘트는 append-only라 안전).
- 코멘트에 `[auto]` 접두어 포함.

### Confluence KB 연동

자동 publish 안 함. doc:reference 라벨 티켓 완료 시 **Confluence 페이지 링크를 Jira 코멘트에 첨부**하는 수준만.

## 크로스팀 변경 감지

### [BREAKING] 판단 기준

한 줄 원칙: **기존 consumer/client가 코드 수정 없이 깨지면 BREAKING**.

| Breaking (코드 수정 필요) | Not Breaking (기존 코드 정상) |
|--------------------------|------------------------------|
| 토픽/키/컬럼/필드 **삭제·rename** | 토픽/키/컬럼/필드 **추가** (기존 유지) |
| 필드 **타입 변경** | payload 신규 필드 추가 |
| 인증 방식 변경 (SASL 등) | |
| Delta Lake 파티셔닝 변경 | |
| API 응답 필드 삭제·의미 변경 | API 응답 필드 추가 |

### 감지 시 동작

1. **endpoints/ 해당 파일 갱신** (messaging.md, storage.md, apis.md 등)
2. **Jira 코멘트에 `[BREAKING]` 플래그** + 영향받는 컴포넌트/페이지 태깅
3. 영향 범위 분석은 **참고용 목록 제공, 최종 판단은 사람** (정적 grep 수준, 런타임 동적 호출 한계)

### endpoints/ 구조

```
endpoints/
├── repos.md        # 저장소
├── apis.md         # REST API
├── messaging.md    # MQTT 토픽 + Kafka 토픽 (메시징 통합)
├── storage.md      # Redis 키 구조 + ClickHouse 스키마 (데이터 저장소)
└── sites.md        # 사이트/서비스 URL
```

## 적용 범위

| 항목 | 대상 |
|------|------|
| 문서화 포맷, 자동 갱신, [auto] 태그 | AI(Claude Code) 사용자만 |
| [BREAKING] 알림, endpoints/ 갱신 | 전 엔지니어 공통 |

## 세션 종료

사용자가 "끝", "완료", "오늘은 여기까지" 등 종료 시그널을 보내면:
1. 미갱신 항목 확인 → 남은 것만 갱신
2. STATE.md Last Session 정리
3. TODO.md 완료 항목 정리

세션 중간에 이미 갱신되었으므로, 종료 시에는 보충만 한다.

## 주간 정리 체크리스트

사용자가 "주간 정리", "weekly 정리", "이번주 정리", "세션 마무리" 등을 요청하면 아래 6개 항목을 전부 수행:

1. `weekly/{YYYY-Www}.md` 생성 (목표/진행현황/성과/커밋/다음주 프리뷰)
2. `TODO.md` 완료 항목 정리 + 캐리오버 카운트 +1
3. `STATE.md` 갱신 (현재 상태/블로커/완료)
4. `work/{category}.md` append (120줄 초과 시 정리 시작)
5. `DECISIONS.md` 새 결정 있으면 AD 번호 부여 추가
6. TODO 캐리오버 3회 항목 재검토 질문 ("분해/위임/취소 중 선택")
