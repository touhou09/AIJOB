---
name: hermes-status
description: Hermes Agent, Paperclip, LLM Wiki의 통합 상태를 확인한다.
---

# Hermes/Paperclip/Wiki 상태 확인

Hermes Agent, Paperclip, LLM Wiki의 통합 상태를 확인한다.

## 절차

1. **Hermes Agent**
   - `hermes --version`
   - 활성 프로필: `hermes profile list`
   - 게이트웨이 상태: `launchctl list | grep hermes`
   - Cron 활성 수: `hermes cron list`

2. **Paperclip**
   - Health: `curl -s --max-time 3 https://paperclip.dororong.dev/api/health`
   - 에이전트 목록: `npx paperclipai agent list`
   - 최근 이슈: `npx paperclipai issue list`

3. **LLM Wiki**
   - Wiki 경로 존재 여부: `ls ~/wiki/`
   - 총 페이지 수: `find ~/wiki -name "*.md" -not -path "*/raw/*" | wc -l`
   - 마지막 log 엔트리: `tail -3 ~/wiki/log.md`

4. 결과를 테이블로 출력

사용법: `/hermes-status`
