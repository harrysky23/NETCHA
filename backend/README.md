# Backend — Phase 2 예정

Phase 1에는 백엔드가 없습니다. Python, FastAPI, WebSocket 서버나 DB를 실행할 필요가 없습니다.

다음 단계에서 검토할 연결 경계:

- 캐릭터 DTO: `frontend/src/types/character.ts`의 `PixelCharacter`.
- 입력 DTO: `frontend/src/game/movement.ts`의 `MovementInput`.
- 맵·충돌 기준: `frontend/src/game/map.ts`의 타일, 가구, 생성 위치와 `GameScene.ts`의 몸체 크기.
- 서버에서도 색상 인덱스, 배열 길이, 실루엣·팔레트 버전을 검증.
- 이동·충돌의 최종 권한은 서버에 두고 클라이언트 Scene에는 검증된 상태를 전달하는 방안 검토.
- WebSocket 프로토콜, 방 관리, 재접속, 상태 보간은 Phase 2에서 설계.

현재 디렉터리는 인수인계 문서만 포함합니다. 전체 실행 방법과 코드 설명은 루트 [README](../README.md)를 참고하세요.
