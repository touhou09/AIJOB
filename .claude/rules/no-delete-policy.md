---
description: "DB/데이터 임의 삭제 금지 정책 — 운영 환경 최우선"
---

# 데이터 삭제 금지 정책

IMPORTANT: 운영(production) 환경에서의 데이터 삭제는 가장 위험한 작업이다. 어떤 상황에서도 이 정책을 우회하지 않는다.

## 운영 환경 — 절대 금지

아래 명령어는 운영 환경에서 **어떤 이유로든 직접 실행 금지**. 사용자가 요청해도 거부하고 대안을 제시한다.

- `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`
- `DELETE FROM` (WHERE 절 없이)
- `TRUNCATE TABLE`
- `db.collection.drop()`, `db.dropDatabase()` (MongoDB)
- `redis-cli FLUSHALL`, `FLUSHDB`
- `rm -rf` on data directories, volumes, backups
- `kubectl delete pvc`, `kubectl delete pv`, `kubectl delete namespace`
- `terraform destroy` (stateful 리소스 포함 시)

## 운영 환경 — 조건부 허용

반드시 **아래 5단계를 모두 수행한 후**에만 실행 가능:

1. **환경 확인**: 현재 접속 환경이 운영인지 재확인 (`SELECT current_database()`, hostname, context 등)
2. **영향 범위**: `SELECT COUNT(*)` 또는 dry-run으로 대상 건수 파악 후 사용자에게 보고
3. **백업 확인**: 최근 백업 존재 여부 + 복원 가능 여부 확인
4. **사용자 명시적 승인**: 환경명 + 대상 건수를 보여주고 "운영 환경에서 N건 삭제합니다. 진행하시겠습니까?" 확인
5. **트랜잭션**: BEGIN 내에서 실행, 결과 확인 후 사용자 재승인 받고 COMMIT

해당 명령어:
- `DELETE FROM ... WHERE ...`
- `UPDATE ... SET ... WHERE ...` (데이터 변조)
- 마이그레이션 내 컬럼/테이블 삭제
- 배치 삭제 스크립트

## 개발/스테이징 환경

- 위 절대 금지 목록은 동일하게 적용 (습관화)
- 조건부 허용 항목은 영향 범위 확인(Step 2) + 사용자 승인(Step 4)만으로 축소 가능

## AI 행동 규칙

- 사용자가 "삭제해줘"라고 해도 **환경 확인부터** 시작
- 운영 환경이면 **soft delete(논리 삭제)를 먼저 제안**
- 복구 불가능한 작업은 **"이 작업은 되돌릴 수 없습니다"** 경고 필수
- 환경이 불분명하면 **운영으로 간주**하고 최대 보호 적용
