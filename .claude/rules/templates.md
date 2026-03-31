---
description: "CLAUDE.md, settings.json, work 카테고리 생성 템플릿"
---

# 템플릿

## CLAUDE.md 템플릿
새 프로젝트에 CLAUDE.md를 생성할 때 이 템플릿을 기반으로 작성.
프로젝트명, 카테고리 인덱스, 핵심 명령어, 보안 규칙을 프로젝트에 맞게 수정할 것.

## work/ 카테고리 템플릿
```markdown
# {카테고리명} 작업 이력

> {이 카테고리가 다루는 범위 한 줄 설명}

---

## {날짜} | {작업 제목}
- 변경: {파일 경로 및 변경 내용}
- 패턴: {사용한 명령어/방법}
- 미완료: {남은 작업과 이유}
- 이슈: {발견한 문제}
```

## TODO.md 템플릿
```markdown
# 오늘의 작업

> 최종 업데이트: {date}
> 소스: Jira (자동 동기화)

---

| # | Jira Key | 제목 | 우선순위 | 상태 | 캐리오버 |
|---|----------|------|---------|------|---------|
| 1 | {KEY-000} | {제목} | {P1/P2/P3} | Ready | 0 |

## 완료
- (완료 시 여기로 이동, 세션 종료 시 삭제)
```

## weekly/{YYYY-Www}.md 템플릿
```markdown
# {YYYY-Www} 주간 작업

> 주차: {YYYY-Www} ({MM/DD} ~ {MM/DD})
> 소스: roadmap/{YYYY-Qn}.md → 주간 분해

---

## 이번 주 목표
- [ ] {roadmap 항목에서 분해된 주간 태스크}

## 진행 현황
| 요일 | 완료 항목 | 블로커 |
|------|----------|--------|

## 다음 주 프리뷰
- {다음 주 예상 작업}
```

## roadmap/{YYYY-Qn}.md 템플릿
```markdown
# {YYYY-Qn} 로드맵

> 분기: {YYYY-Qn}
> 소스: Jira Epic/Initiative
> 최종 동기화: {date}

---

| # | Jira Epic | 목표 | 상태 | 주차 |
|---|-----------|------|------|------|
| 1 | {EPIC-000} | {분기 목표} | 미착수 | {W1-W13} |
```

## endpoints/ 템플릿
```markdown
# 엔드포인트: {카테고리}

> 최종 업데이트: {date}

---

| 이름 | URL/경로 | 인증 | Vault 경로 / 비고 | 상태 |
|------|---------|------|-------------------|------|
| {name} | {url} | SSH / Token / OAuth | {vault 경로 또는 접근 조건} | active |

## 변경 이력
- {date}: {변경 내용} (사유)
```

## settings.json 스택별 예시

### Python
```json
{"permissions":{"allow":["Bash(git *)","Bash(python *)","Bash(pip *)","Bash(pytest *)","Bash(ruff *)","Bash(curl *)"],"deny":["Bash(rm -rf *)"]}}
```

### Node.js
```json
{"permissions":{"allow":["Bash(git *)","Bash(npm *)","Bash(npx *)","Bash(node *)","Bash(curl *)"],"deny":["Bash(rm -rf *)"]}}
```

### DevOps / IaC
```json
{"permissions":{"allow":["Bash(git *)","Bash(kubectl *)","Bash(helm *)","Bash(terraform *)","Bash(ansible *)","Bash(argocd *)","Bash(jq *)","Bash(yq *)","Bash(curl *)","Bash(ssh *)"],"deny":["Bash(rm -rf *)","Bash(terraform destroy *)","Bash(kubectl delete namespace *)"]}}
```
