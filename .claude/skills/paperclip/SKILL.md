---
name: paperclip
description: Paperclip 이슈를 CLI로 관리한다. 이슈 생성, 조회, 상태 변경, 코멘트, 에이전트 목록을 지원한다.
disable-model-invocation: true
---

# Paperclip 이슈 관리

Paperclip 이슈를 CLI로 관리한다.

## 사용법

### 이슈 목록
```bash
npx paperclipai issue list
```

### 이슈 생성
```bash
npx paperclipai issue create \
  --company-id abac28ea-9edd-4ddb-b40a-0baf52505357 \
  --title "[제목]" \
  --description "[설명]" \
  --assignee-agent-id [에이전트ID] \
  --status todo
```

### 이슈 조회
```bash
npx paperclipai issue get DOR-N
```

### 이슈 상태 변경
```bash
npx paperclipai issue update [이슈ID] --status [backlog|todo|in_progress|done]
```

### 이슈에 코멘트
```bash
npx paperclipai issue comment [이슈ID] --text "[코멘트]"
```

### 에이전트 목록
```bash
npx paperclipai agent list
```

## 상태 흐름
backlog → todo → in_progress → done
- todo로 설정하면 heartbeat가 에이전트를 자동 실행

사용법: `/paperclip`
