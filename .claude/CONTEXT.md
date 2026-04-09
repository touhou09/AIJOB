# AIJOB Context

> 최종 업데이트: 2026-04-09

---

## 1. 프로젝트 목적
AI 협업 구조(.claude) 관리 레포. Hermes Agent + Paperclip 기반 멀티에이전트 환경을 관리한다.

## 2. 기술 스택

| Layer | 컴포넌트 |
|-------|---------|
| AI Agent | Hermes Agent v0.8.0 (프로필 기반, Python 3.11) |
| Orchestration | Paperclip 2026.403.0 (https://paperclip.dororong.dev) |
| Gateway | launchd (ai.hermes.gateway-{profile}) |
| Knowledge | LLM Wiki (Obsidian Vault) + Memvid MCP |
| Messaging | Slack (Ame 앱, Socket Mode) |
| Runtime | Mac Mini M4 32GB, macOS |

## 3. 에이전트 프로필

| 프로필 | 역할 | Paperclip Agent ID | 상태 |
|--------|------|--------------------|------|
| backend | 백엔드 엔지니어 | f841861a-b7ed-4c5b-96d2-3642f3f5722a | active |

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
