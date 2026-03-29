---
description: "DB/데이터 임의 삭제 금지 정책"
---

# 데이터 삭제 금지 정책

## 절대 금지 (사전 승인 없이 실행 불가)
- `DROP TABLE`, `DROP DATABASE`
- `DELETE FROM` (WHERE 없이)
- `TRUNCATE TABLE`
- `db.collection.drop()`, `db.dropDatabase()` (MongoDB)
- `redis-cli FLUSHALL`, `FLUSHDB`
- `rm -rf` on data directories
- `kubectl delete pvc`, `kubectl delete pv`
- `terraform destroy` (데이터 리소스 포함 시)

## 조건부 허용 (반드시 사전 확인)
- `DELETE FROM ... WHERE ...` — 영향 범위를 `SELECT COUNT(*)` 로 먼저 확인
- `UPDATE ... SET ... WHERE ...` — 대상 건수 먼저 확인
- 마이그레이션에서 컬럼/테이블 삭제 — 롤백 계획 필수

## 실행 전 필수 절차
1. **영향 범위 확인**: `SELECT COUNT(*)` 또는 dry-run으로 대상 건수 파악
2. **백업 확인**: 최근 백업 존재 여부 확인
3. **사용자 승인**: 삭제 대상과 건수를 사용자에게 보여주고 명시적 승인 받기
4. **트랜잭션**: 가능하면 트랜잭션 내에서 실행, 결과 확인 후 COMMIT

## AI 행동 규칙
- 사용자가 "삭제해줘"라고 해도 위 절차를 먼저 수행
- soft delete(논리 삭제)를 우선 제안
- 복구 불가능한 작업은 반드시 경고 출력
