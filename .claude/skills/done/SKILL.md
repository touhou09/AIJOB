---
name: done
description: 기능 단위 작업 완료 문서화. 코드 변경 분석 → work/ 기록 → STATE.md 갱신을 일괄 수행한다.
disable-model-invocation: true
---

# 기능 단위 작업 완료 문서화

작업이 완료되면 이 스킬을 실행하여 자동으로 문서화한다.

## 절차

### Step 1: 작업 분석
1. `git diff` 및 `git log`에서 현재 세션의 변경사항 분석
2. 테스트 실행 결과 확인 (있으면)
3. 작업의 복잡도 판단 (S/M/L)
   - S (단순 버그 픽스, 스타일 변경): "커밋 메시지로 충분합니다. 문서화를 건너뜁니다." 출력 후 종료
   - M 이상: 계속 진행

### Step 2: 카테고리 결정
1. CLAUDE.md의 작업 카테고리 인덱스 확인
2. 적합한 카테고리가 있으면 해당 `work/{category}.md`에 기록
3. 없으면 새 카테고리 파일 생성 + CLAUDE.md 인덱스 갱신

### Step 3: 템플릿 채우기
`.claude/rules/work-log-policy.md`의 템플릿에 따라 항목 생성:

```markdown
## YYYY-MM-DD: 작업 제목 [done|in-progress|blocked]
- **What**: 한 줄 변경 요약
- **Why**: 결정 이유 (대안이 있었다면: X 대신 Y, 이유)
- **Impact**: 영향 범위 (누가, 어떤 시나리오)
- **Test**: 통과/실패 요약 + 커버 못하는 영역
- **Trap**: 시도→실패→해결 (30분 이상 삽질한 것만, 없으면 생략)
- **Next**: 다음 단계 또는 블로커 (done이면 생략 가능)
- **[DEBT]**: 수용한 기술 부채 (있을 때만)
---
```

사용자에게 초안을 보여주고 확인 후 저장한다.

### Step 4: 정리 및 갱신
1. 해당 work/ 파일의 줄 수 확인
2. 150줄 초과 시 `/cleanup` 실행 제안
3. `[DEBT]` 태그 항목이 있으면 DECISIONS.md 이동 여부 확인
4. `.claude/STATE.md` 갱신 (현재 상태 + 다음 작업)

### Step 5: Hermes 상태 동기화 (해당 시)
1. 작업이 Hermes 인프라(프로필/게이트웨이/cron)와 관련된 경우:
   - STATE.md의 인프라 상태 테이블 갱신
   - integrations/hermes.md 갱신 필요 여부 확인
2. Paperclip 이슈가 관련된 경우:
   - 이슈 상태를 done으로 업데이트

### Step 6: 컨텍스트 문서 동기화
1. `.claude/CONTEXT.md` — 새 모듈/디렉토리가 추가되었으면 디렉토리 구조 갱신
2. `.claude/DECISIONS.md` — [DEBT] 항목이 있으면 AD 번호 부여하여 이동

### Step 7: 결과 출력
기록 완료 후 요약 출력:
- 기록 위치: `work/{category}.md`
- 현재 줄 수 / 200줄 한도
- STATE.md 갱신 여부
- CONTEXT.md / DECISIONS.md 갱신 여부

사용법: `/done`
