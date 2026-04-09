# Jira 운영 규칙

## 핵심 원칙
- **Jira가 유일한 원본**: TODO.md, weekly.md, roadmap.md는 Jira의 뷰(view)일 뿐. 이중 관리 금지.
- **문서 먼저, 작업은 이후**: TODO.md에 계획이 확정된 후 착수.
- **TODO에 Jira 티켓 없으면 경고**: Jira에 없는 작업은 먼저 티켓 생성 요청.

## Jira 상태 흐름
```
Inbox → Ready → To Do(In Progress) → Review ←→ Ready (핑퐁) → Done
```
- Inbox: 기한 짧은 순 + 심각도 높은 순으로 Ready 선별
- Ready ↔ TODO.md: 항상 일치 (TODO에 있으면 Ready, 빠지면 Inbox 복귀)
- Review → Ready: 피드백 받으면 담당자 본인 복귀 + 재작업
- Review → Done: 리뷰 통과 시

## 문서 흐름
```
TODO.md (일일) → work/ (주간) → docs/ (장기)
                              → DECISIONS.md (결정 사항)
```
- 하루 끝: TODO 완료 항목 → work/{category}.md로 이동
- Done 후: 문서화 가치 있는 항목 → docs/로 이동
- 역방향 흐름 금지 (TODO에서 직접 roadmap 수정 불가)

## 상태 자동 전환
Claude는 다음 6개 시점에서 Jira 상태를 자동 전환한다:

| # | 시점 | Jira 동작 |
|---|------|----------|
| 1 | 아침 TODO 생성 (/jira sync) | → Ready |
| 2 | 사용자가 업무 질문/요청 | → In Progress |
| 3 | 작업 완료 (/done) | → Done (본인 생성) / → Review (외부 할당) |
| 4 | 리뷰 요청 | 담당자 → 리뷰어 |
| 5 | 리뷰 완료 | 담당자 복귀 + → Done |
| 6 | 블로커 발생 | → Blocked (있을 경우) |

- 상태 전환은 Claude 자동, 담당자 변경은 사용자 요청 시에만
- **외부 할당 업무 완료 규칙**: reporter ≠ assignee인 티켓은 Done이 아닌 Review로 전환 + 담당자를 reporter(요청자)로 변경. 요청자가 확인 후 Done 처리.

## 캐리오버 규칙
- TODO 항목의 `캐리오버` 카운트를 일일 동기화 시 +1
- **3회 연속 이월 시**: Claude가 재검토 질문 ("이 작업을 계속 유지할까요? 분해/위임/취소 중 선택해주세요.")
- 재검토 결과에 따라: 분해 → 새 서브티켓, 위임 → 담당자 변경, 취소 → Jira에서 Won't Do

## 티켓 생성

### 원칙: Claude가 초안을 작성하고, 사용자는 검토만 한다

Claude는 대화 맥락, 코드, 관련 티켓, work/ 이력에서 정보를 수집하여 **description을 직접 작성**한다. 사용자에게 빈칸을 하나씩 물어보지 않는다.

### 생성 흐름

**1단계: 맥락 수집** — 아래 소스를 순서대로 확인하여 배경/범위/완료조건에 쓸 재료를 모은다.

| 순서 | 소스 | 확인 내용 | 언제 |
|------|------|----------|------|
| ① | 대화 맥락 | 사용자가 방금 말한 것, 논의한 결정 | 항상 |
| ② | STATE.md | 현재 배포/인프라 상태, 남은 이슈 | 항상 |
| ③ | work/{category}.md | 관련 카테고리의 과거 작업, trap, debt | 관련 카테고리 있을 때 |
| ④ | 관련 Jira 티켓 조회 | 선행/부모 티켓 내용, 상태, 완료 조건 | 부모/선행 티켓 존재 시 |
| ⑤ | 코드/git log | 관련 파일 경로, 최근 커밋, 현재 구현 상태 | 코드 변경이 수반되는 작업 |
| ⑥ | DECISIONS.md | 관련 AD 번호, 기존 결정 사항 | 아키텍처/설계 관련 시 |
| ⑦ | Confluence | 관련 KB 문서, 선행 Study/ADR | doc:* 라벨이 skip이 아닌 경우 |

수집한 정보에서 description의 **배경**(왜), **범위**(뭘), **완료 조건**(어떻게 확인), **참고**(어디서)를 도출한다.

**2단계: 초안 작성** — 아래 description 품질 기준에 맞게 전체 티켓을 작성한다

**3단계: 최종 확인** — 제목, 메타(유형/에픽/라벨/담당자/우선순위/마감일), description 초안을 사용자에게 보여주고 승인을 받는다

**4단계: 생성** — 승인 후 API 호출

사용자에게 질문하는 경우: 맥락에서 판단할 수 없는 항목만 (예: 담당자가 본인이 아닌 경우, 마감일이 명시되지 않은 경우).

### 메타 필드

| 필드 | 판단 주체 | 기본값 |
|------|----------|--------|
| 제목 | Claude 작성 → 사용자 확인 | — |
| 유형 | Claude 판단 | Task |
| 에픽 | Claude 6축 판단 (`integrations/jira.md`) | — |
| doc:* 라벨 | Claude 판단 (`integrations/jira.md`) | — |
| 부모 티켓 | Claude 판단 (관련 상위 티켓 존재 시) | 없음 |
| 담당자 | 본인 (다른 사람이면 사용자에게 확인) | 본인 |
| 우선순위 | Claude 판단 | Medium |
| 마감일 | 대화에서 언급된 경우만 | 없음 |

### description 품질 기준

**배경** — "왜 이 작업이 필요한가"
- 현재 상태 (지금 어떻게 되어 있는지)
- 문제/필요성 (뭐가 부족하거나 잘못되어 있는지)
- 목적 (누가, 어떤 상황에서 이걸 필요로 하는지)

**범위** — 구체 항목 나열
- 포함: 파일, 시스템, API, 설정 단위로 열거 (예: "Arroyo edge_ingest.sql 수정", "Redis TTL 정책 변경")
- 제외: 혼동될 수 있는 인접 작업 명시

**완료 조건** — 검증 가능한 기준
- 나쁜 예: "문서 작성 완료", "테스트 가능한 상태"
- 좋은 예: "Pod Running + NodePort 30300 접속 200 OK", "E2E 6건 pass", "Confluence 페이지 생성 + 팀 리뷰 코멘트 1건 이상"

**참고** (해당 시)
- 선행/관련 티켓 (IW-XXX)
- 관련 PR, 커밋 해시
- Confluence 페이지, 코드 경로
- 참조한 외부 문서/레포

### Sub-task도 description 필수

`jira_create_subtask`로 생성하더라도 최소 배경 2~3줄 + 완료 조건을 포함한다. description 없는 티켓을 만들지 않는다.

### 금지

- 사용자 승인 없이 API 호출
- description 없는 티켓 생성
- "~가 필요함", "~완료" 같은 동어반복 완료 조건

## Git 연동 규칙

GitHub ↔ Jira 연동이 활성화되어 있으므로, 브랜치/커밋/PR에 Jira 키를 포함하면 자동으로 티켓 Development 패널에 연결된다.

- **브랜치명**: `{JIRA_KEY}-설명` 형식 (예: `IW-172-vm-setup`)
- **커밋 메시지**: 첫 줄에 `{JIRA_KEY}: 내용` 포함 (예: `IW-172: streamPlatform 초기 세팅`)
- **PR 제목**: `{JIRA_KEY}: 내용` 포함

Claude가 커밋/브랜치/PR 생성 시, 현재 작업 중인 Jira 티켓 키를 자동으로 포함한다. TODO.md에서 현재 작업의 Jira Key를 참조한다.

## 시크릿 관리
- Jira API 토큰: Vault 경로만 허용 (`secret/data/jira/api-token`)
- Vault 미설치 개발 환경: `JIRA_API_TOKEN` 환경변수 폴백 허용
- 토큰을 파일/커밋/로그에 절대 기록 금지

## devops 레포 참조 규칙
- devops 레포 내용 복사 금지 (참조만 허용)
- 경로 참조: `devops/.claude/CONTEXT.md` 등
