# Codex 환경 작업 이력

> Codex 전용 AGENTS.md, .codex 스킬, Claude 호환 레이어, 설치 스크립트 변경 이력.

---

## 2026-04-18: Codex branch compatibility layer [done]
- **What**: AIJOB `codex` 브랜치에서 Codex용 `AGENTS.md`와 `.codex/skills/claude-structure` 호환 레이어를 관리하도록 추가.
- **Why**: 로컬 `~/.claude` 구조를 그대로 복사하지 않고, Codex가 안전하게 참조/변환해서 쓰는 브랜치가 필요함.
- **Impact**: `init-mac.sh`/`init-linux.sh`에서 `codex` 브랜치를 설치하면 Claude 문서와 Codex 스킬을 함께 배포 가능.
- **Test**: `bash -n init-mac.sh`, `bash -n init-linux.sh` 통과. 실제 원격 clone 설치는 네트워크/원격 브랜치 push 전이라 미실행.
---
