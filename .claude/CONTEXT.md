# AIJOB Context

> 최종 업데이트: 2026-04-11

---

## 1. 프로젝트 목적
AI 협업 구조(.claude) 관리 레포. Hermes Agent + Paperclip 기반 멀티에이전트 환경을 관리한다.

## 2. 기술 스택

| Layer | 컴포넌트 |
|-------|---------|
| AI Agent | Hermes Agent v0.8.0 (프로필 기반, Python 3.11) |
| Orchestration | Paperclip 2026.403.0 (https://paperclip.dororong.dev) |
| Gateway | launchd (ai.hermes.gateway-ceo — CEO만 Slack 연결) |
| Knowledge | gbrain v0.7.0 (PGLite, garrytan/gbrain) — LLM Wiki 대체 |
| Messaging | Slack (Ame 앱, Socket Mode, CEO DM 전용) |
| LLM | ChatGPT Pro $200 OAuth (openai-codex provider, rate limit 무관) |
| Runtime | Mac Mini M4 32GB, macOS |

## 3. 에이전트 프로필 (Harness v2, 2026-04-11~)

| 프로필 | role | 모델 | Paperclip Agent ID (prefix) |
|--------|------|------|----------------------------|
| ceo | ceo | gpt-5.4 | `3a02c7bc` |
| planner | pm | gpt-5.4 | `56162566` |
| inspector | cto | gpt-5.4 | `6cfb8803` |
| coder | engineer | gpt-5.4 | `6f441561` |
| qa | qa | gpt-5.4-mini | `d0ac5a06` |
| devops | devops | gpt-5.4-mini | `ed20cab8` |
| monitor | general | gpt-5.4-mini | `359d1d62` |

구 프로필(backend/cto/frontend/data/devops/qa/orchestrator)은 전부 terminated. AD-009 참조.

## 4. 브랜치 전략

| 브랜치 | 역할 |
|--------|------|
| master | Claude Code 공통 템플릿 (에이전트 무관) |
| hermes | Hermes+Paperclip 통합 관리 |
| personal | 개인 환경 커스텀 |
| work | 회사(ingkle) 업무 전용 (Jira 유지) |

## 5. 알려진 제약

- Hermes 에이전트 간 직접 통신 불가 — Paperclip이 이슈 기반 핸드오프로 중재
- hermes-paperclip-adapter 0.3.0에 버그 다수 (PR #31 미머지)
- Slack 채널별 에이전트 분리는 멀티 게이트웨이 인스턴스 필요
