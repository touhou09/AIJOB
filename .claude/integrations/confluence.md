# Confluence 연동 가이드

## 접속 정보
| 항목 | 값 |
|------|---|
| Base URL | `https://ingkle.atlassian.net/wiki` |
| 인증 | Jira와 동일 (Atlassian 통합 토큰) |
| 토큰 파일 | `~/.claude/.atlassian-token` |

## API 패턴

### 페이지 조회
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/wiki/rest/api/content/{PAGE_ID}?expand=body.storage"
```
응답의 `.body.storage.value`에 HTML 본문이 포함됨.

### 페이지 검색 (CQL)
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/wiki/rest/api/content/search?cql=space=product+AND+type=page+AND+title~'검색어'&limit=10"
```

### Space 내 페이지 목록
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/wiki/rest/api/content?spaceKey=product&type=page&limit=25&expand=title"
```

## 자동화 스크립트
| 스크립트 | 역할 |
|---------|------|
| `hooks/confluence-lib.sh` | 공통 함수 (페이지 조회, 검색, HTML→텍스트 변환) |

### Claude에서 직접 사용
```bash
# 페이지 읽기
source .claude/hooks/confluence-lib.sh
confluence_fetch_page 901939485

# 검색
confluence_search "space=product AND title~'AIJOB'"
```

## 주요 페이지
| 페이지 | ID | Space | 설명 |
|--------|-----|-------|------|
| Infra: AIJOB 세팅 | 901939485 | product | AIJOB Confluence 문서 |

> 새로운 주요 페이지 발견 시 이 테이블에 추가.

## HTML → 텍스트 변환
`confluence_fetch_page`는 자동으로 HTML 태그를 제거하고 텍스트를 반환한다.
Python3 사용 (`html` + `re` 모듈). Python 없으면 sed 폴백.
