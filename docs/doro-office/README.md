# DOR-5 gap 재기획 워크룸

> 작업 범위: DOR-17 "DOR-5 설계 재검토 — 사용자 기대 대비 차이 수집"
> 대상 이슈: DOR-5 (Hermes Agent 모니터링 서비스 설계)

## 상태 수렴 스냅샷 (2026-04-12)
- 현재 구현 기준점은 `~/AIJOB/plugins/doro-office` v0.1.4이다.
- 실제 플러그인 표면은 Page + Sidebar + Dashboard widget, 1초 polling fallback, 최근 이벤트 timeline, overflow roster, 표시 옵션 UI까지 포함한다.
- 이 폴더는 착수 전 재기획 워크룸 기록이므로 `03-doro-office-plan.md`와 `04-decisions-snapshot.md`는 역사 문맥 문서다. 최신 구현 범위는 플러그인 README와 각 문서 상단의 최신 메모를 우선 참조한다.
- 이슈 수렴 기준:
  - `DOR-21`은 최초 epic이며 현재는 cancelled 상태다.
  - `DOR-26`, `DOR-32`, `DOR-33`, `DOR-34`는 실제 구현 lineage로 done 상태다.
  - `DOR-35`, `DOR-36`, `DOR-37`은 구현 후속 회귀 수정으로 done 상태다.
  - `DOR-27`, `DOR-28`, `DOR-29`는 상위 작업 통합으로 cancelled 상태다.
  - `DOR-87`은 구현 재개/정리 triage 부모이고, `DOR-88`은 문서/이슈 상태 수렴 정리다.

## 파일
- [00-current-implementation.md](00-current-implementation.md) — doro-office 이전 DOR-5 데이터 레이어(기존 cron/CLI/Slack) 스냅샷
- [01-gap-interview.md](01-gap-interview.md) — 사용자 기대치를 끌어낼 질문 리스트 (초기 인터뷰 기록용)
- [02-alternative-patterns.md](02-alternative-patterns.md) — 비교 가능한 다른 모니터링 시스템 패턴
- [03-doro-office-plan.md](03-doro-office-plan.md) — doro-office MVP 0~3 착수 전 계획 원본
- [04-decisions-snapshot.md](04-decisions-snapshot.md) — 확정 결정 스냅샷 + 2026-04-12 기준 수렴 메모

## 현재 기준 읽는 순서
1. `~/AIJOB/plugins/doro-office/README.md` — 실제 설치/기능 범위
2. `04-decisions-snapshot.md` — 원래 결정과 현재 수렴 상태 비교
3. `03-doro-office-plan.md` — 어떤 기능이 계획됐고 무엇이 defer 되었는지 확인
4. 필요 시 `00`~`02` — 초기 재기획 배경 참고

## 역사적 진행 순서
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
- 이 디렉토리는 doro-office의 "재기획 워크룸 기록"과 "사후 수렴 메모"를 함께 담는다. 구현 사실 자체는 플러그인 소스/README가 원본이다.
- 사용자 인터뷰는 1~2회에 끝날 수도, 여러 세션에 걸쳐야 할 수도 있음. 파일을 누적해서 이어가면 된다.
- orchestrator에게 바로 넘기지 말 것 — 초기 목적은 사용자의 직접 피드백 수집이었다.

## 남은 후속 구현
- 커스텀 스킨 로더(`~/.hermes/skins/*`)와 스킨 선택 persistence는 별도 backlog에서 추적한다.
- Tauri 래퍼는 현재 플러그인 surface로 충분하다고 판단되어 defer 상태다.
