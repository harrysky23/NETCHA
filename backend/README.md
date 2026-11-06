# FastAPI 게임 서버

프로젝트 루트 [README](../README.md)의 실행 순서에 따라 가상환경을 만들고 `requirements.txt`를 설치한 다음 `python run.py`를 실행합니다. 서버 기본 주소는 `http://localhost:8001`입니다.

- `GET /health`, `GET /api/health`: 서버 상태
- `POST /api/rooms`: 새 방 생성
- `POST /api/rooms/{code}/join`: 초대 코드로 참가
- `GET /api/rooms/{code}/session`: 새로고침 후 로컬 세션 복구
- `WS /ws/{code}/{player_id}?token=...`: 방 상태와 게임 메시지

방·플레이어·채팅은 `app/world.py`의 인메모리 상태입니다. 프로세스를 재시작하면 초기화됩니다. 프로덕션 배포 시 방 권한, 요청 빈도 제한, 서버 운영 보안, 영속 저장, 네트워크 지연 보정이 추가로 필요합니다.
