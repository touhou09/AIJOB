# Paperclip 이슈 운영 규칙

## 핵심 원칙
- Paperclip 이슈가 유일한 작업 관리 도구 (hermes 브랜치)
- 이중 관리 금지
- description 없는 이슈 생성 금지

## 이슈 상태 흐름
```
backlog → todo → in_progress → done
```
- backlog: heartbeat가 픽업하지 않음
- todo: heartbeat 대기 — 에이전트가 자동 픽업
- in_progress: 에이전트 실행 중
- done: 완료

## 이슈 생성 규칙
1. title: 명확하고 구체적
2. description: 배경 + 범위 + 완료 조건 필수
3. assignee-agent-id: 담당 에이전트 지정
4. status: `todo`로 생성 (즉시 실행 원할 때)

## 에이전트 등록
- role은 enum: ceo, cto, engineer, designer, pm, qa, devops, researcher, general
- adapterType: hermes_local
- adapterConfig.hermesCommand: 프로필 wrapper 이름

## 제약
- Paperclip 서버는 Mac Mini 전용
- 에이전트 등록/삭제는 사용자 승인 필수
