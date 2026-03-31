# 엔드포인트 관리 규칙

## 상태 값
| 상태 | 의미 |
|------|------|
| `active` | 현재 사용 중 |
| `deprecated` | 사용 중단 예정 (마이그레이션 필요) |
| `archived` | 보관 완료 (읽기 전용) |

## 변경 트리거
아래 이벤트 발생 시 `endpoints/` 파일을 즉시 업데이트:
- 레포 추가/삭제
- 사이트 추가/삭제
- 엔드포인트(URL, 포트, 인증 방식) 변경
- 상태 전환 (active → deprecated 등)

## 포맷 규칙
- 각 endpoints/ 파일은 테이블 형식 필수
- `상태` 컬럼 필수 (active/deprecated/archived)
- `인증` 컬럼 필수 (SSH, HTTPS, Token, OAuth, API Key 등 방식만 기록)
- 토큰 원문 기록 금지 — Vault 경로 또는 환경변수명만 허용
- 접근 전제조건 명시 (VPN 필요, IP 화이트리스트 등)
- 변경 이력은 파일 하단에 append-only로 기록
- 날짜 + 변경 내용 + 사유 포함

## 파일 구조
```
.claude/endpoints/
├── repos.md        # 저장소 목록 + 로컬 경로 + 인증
├── sites.md        # 사이트/서비스 URL + 인증 (필요 시 생성)
└── apis.md         # API 엔드포인트 + 인증 (필요 시 생성)
```
- 프로젝트에 맞게 파일 추가. repos.md는 기본 제공.

## 인증 정보 기록 규칙
| 기록하는 것 | 기록하지 않는 것 |
|------------|----------------|
| 인증 방식 (SSH, API Key, OAuth) | 실제 토큰/패스워드 값 |
| Vault 경로 (`secret/data/...`) | .env 파일 내용 |
| 환경변수명 (`JIRA_API_TOKEN`) | 시크릿 원문 |
| 접근 전제조건 (VPN, IP 제한) | 인증서 파일 내용 |
