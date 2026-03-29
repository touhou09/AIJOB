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
