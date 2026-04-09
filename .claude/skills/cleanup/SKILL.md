---
name: cleanup
description: work/ 파일 정리. 150줄 초과 파일에서 완료 항목 삭제, 결정 사항을 DECISIONS.md로 이동한다.
disable-model-invocation: true
---

# work/ 파일 정리

1. `.claude/work/` 내 모든 파일의 줄 수를 확인한다
2. 150줄 초과 파일에 대해 정리를 실행한다:
   - 완료 + 코드/git에서 유추 가능 -> 삭제
   - 결정 사항 -> DECISIONS.md로 이동 후 삭제
   - 미완료/진행 중 -> 유지
3. 정리 결과를 보고한다 (정리 전/후 줄 수)
4. STATE.md를 갱신한다

사용법: `/cleanup`
