---
name: status
description: 현재 프로젝트 상태 확인. STATE.md, work/ 미완료 항목, DECISIONS.md 요약, Hermes/Paperclip 상태를 표시한다.
---

# 현재 프로젝트 상태 확인

1. `.claude/STATE.md`를 읽고 현재 상태를 표시한다
2. `.claude/work/` 내 모든 파일에서 "미완료:" 항목을 추출한다
3. `.claude/DECISIONS.md`에서 최근 결정 사항을 요약한다
4. 각 work/ 파일의 줄 수를 확인하고 150줄 초과 시 경고한다
5. Hermes 설치 여부 확인 → 설치 시 게이트웨이/cron 상태 표시
6. Paperclip 접속 상태 표시 (해당 시)

결과를 간결한 테이블로 출력한다.

사용법: `/status`
