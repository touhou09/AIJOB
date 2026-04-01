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

## 티켓 생성 필수 질문

IMPORTANT: Jira 티켓 생성 API를 호출하기 전에 반드시 사용자에게 아래 항목을 확인한다. 정보가 충분하면 빠진 것만 질문하되, API 호출 전 반드시 최종 요약을 보여주고 승인을 받는다.

| 질문 | 필수 | 기본값 |
|------|------|--------|
| 제목 | 필수 | - |
| 유형 (Task/Story/Bug) | 필수 | Claude가 판단 후 사용자 확인 |
| 부모 티켓 (Sub-task 여부) | 필수 | 없음 |
| 담당자 | 필수 | 본인 |
| 우선순위 (Highest/High/Medium/Low/Lowest) | 필수 | Medium |
| 마감일 | 필수 | 없으면 "없음"으로 확인 |
| 배경 | 필수 (Sub-task 제외) | - |
| 포함/제외 범위 | 필수 (Sub-task 제외) | - |
| 완료 조건 | 필수 (Sub-task 제외) | - |

**금지**: 사용자 승인 없이 jira_create_issue 또는 jira_create_subtask 호출.

## 시크릿 관리
- Jira API 토큰: Vault 경로만 허용 (`secret/data/jira/api-token`)
- Vault 미설치 개발 환경: `JIRA_API_TOKEN` 환경변수 폴백 허용
- 토큰을 파일/커밋/로그에 절대 기록 금지

## devops 레포 참조 규칙
- devops 레포 내용 복사 금지 (참조만 허용)
- 경로 참조: `devops/.claude/CONTEXT.md` 등
