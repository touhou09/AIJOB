# 엔드포인트: 사이트 / Cloudflare Tunnel

> 최종 업데이트: 2026-04-15
> 소스: /etc/cloudflared/config.yml (root 소유, launchd system/com.cloudflare.cloudflared)

---

## Cloudflare Tunnel (터널 ID: 6218d28e-bb2e-4993-b1b3-c0e611d33e56)

| 이름 | URL | 로컬 서비스 | 인증 | Vault 경로 / 비고 | 상태 |
|------|-----|-------------|------|-------------------|------|
| mac | mac.dororong.dev | ssh://localhost:22 | SSH key | Cloudflare Access 권장 | active |
| aivalink | aivalink.dororong.dev | http://localhost:5173 | 없음 | Vite dev 서버 | active |
| aivalink-api | aivalink-api.dororong.dev | http://localhost:8000 | API Key | FastAPI | active |
| n8n | n8n.dororong.dev | http://localhost:5678 | Basic Auth | `N8N_BASIC_AUTH_*` 환경변수 | active |
| paperclip | paperclip.dororong.dev | http://localhost:3100 | OAuth/API Key | `PAPERCLIP_API_KEY` 프로필별 주입 | active |
| hermes | hermes.dororong.dev | http://localhost:8787 | — | Hermes gateway | active |
| dashboard | dashboard.dororong.dev | http://localhost:8790 | — | 내부 모니터링 | active |
| doro-office | doro-office.dororong.dev | http://localhost:3102 | — | Next.js 15 prod (`/apps/web`), personal 프로필 subprocess | active |

## 접근 전제조건
- DNS: Cloudflare DNS에 `*.dororong.dev` CNAME 등록됨
- 터널 config 변경은 root 권한 필요 (`sudo vi /etc/cloudflared/config.yml`)
- 변경 후 `sudo launchctl kickstart -k system/com.cloudflare.cloudflared`로 reload

## 관리 메모
- **credentials-file**: `/Users/yuseungju/.cloudflared/6218d28e-....json` (커밋 금지)
- **fallback**: 매칭 안 되는 요청은 `http_status:404` 반환
- 정리 대상 (STATE.md 다음 작업 #3): paperclip, aivalink, n8n — 미사용 시 제거 후보

## 변경 이력
- 2026-04-15: `doro-office.dororong.dev → localhost:3102` 추가 + DNS route 등록 + 서비스 kickstart 재시작 (personal 프로필이 띄운 Next.js prod 서버 외부 노출용)
- 2026-04-13 이전: 7개 호스트 기본 구성 (mac, aivalink, aivalink-api, n8n, paperclip, hermes, dashboard)
