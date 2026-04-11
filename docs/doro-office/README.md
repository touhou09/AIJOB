# DOR-5 gap 재기획 워크룸

> 작업 범위: DOR-17 "DOR-5 설계 재검토 — 사용자 기대 대비 차이 수집"
> 대상 이슈: DOR-5 (Hermes Agent 모니터링 서비스 설계)

## 파일
- [00-current-implementation.md](00-current-implementation.md) — 현재 코드/문서/스킬 기준 구현 요약
- [01-gap-interview.md](01-gap-interview.md) — 사용자 기대치를 끌어낼 질문 리스트 (A~G 섹션)
- [02-alternative-patterns.md](02-alternative-patterns.md) — 비교 가능한 다른 모니터링 시스템 패턴
- [03-doro-office-plan.md](03-doro-office-plan.md) — doro-office MVP 0~3 구현 계획 (Paperclip plugin + SVG + 도로롱)
- [04-decisions-snapshot.md](04-decisions-snapshot.md) — 확정 결정 스냅샷 (DECISIONS.md 승격용)

## 진행 순서

1. **대화 시작 전**: `00`을 사용자와 맞춰본다. "이게 지금 상태야, 맞지?" 확인
2. **Gap 수집**: `01`의 질문을 하나씩 제시. 답변을 파일 내 섹션 아래에 기록
3. **패턴 매핑**: 답변이 `02`의 어느 패턴에 가까운지 판단. 새 카테고리가 필요하면 추가
4. **정리**: 모든 답변을 "수용/변경/기각" 3분류
5. **산출물**:
   - `03-gap-analysis.md` (이 단계에서 새로 생성)
   - 후속 이슈 분해 초안
   - DECISIONS.md AD 항목
   - DOR-17 코멘트 (완료 요약)

## 주의

- 이 디렉토리는 `.claude/tmp/`라 gitignore 대상일 수 있음. 커밋은 DOR-17 완료 후 주요 산출물만 레포로 승격.
- 사용자 인터뷰는 1~2회에 끝날 수도, 여러 세션에 걸쳐야 할 수도 있음. 파일을 누적해서 이어가면 된다.
- orchestrator에게 바로 넘기지 말 것 — 사용자의 직접 피드백이 목적이다.

## 다음 액션

사용자가 "인터뷰 시작하자"라고 하면 `01-gap-interview.md`의 A 섹션부터 순서대로 질문. 질문은 한 번에 2~3개씩 묶어서 던지는 게 페이스 좋음 (너무 많으면 답변 피곤).
