from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .world import RoomManager

manager = RoomManager()


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    manager.cleanup()


app = FastAPI(title="NETCHACAMELEON", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/rooms")
async def create_room(body: dict[str, Any]) -> dict[str, Any]:
    try:
        room, player = await manager.create(body.get("name"))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "roomCode": room.code,
        "playerId": player.player_id,
        "token": player.token,
        "room": room.snapshot(player.player_id),
    }


@app.post("/api/rooms/{code}/join")
async def join_room(code: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        room, player = await manager.join(code, body.get("name"))
    except ValueError as error:
        raise HTTPException(status_code=404 if "찾을" in str(error) else 409, detail=str(error)) from error
    return {
        "roomCode": room.code,
        "playerId": player.player_id,
        "token": player.token,
        "room": room.snapshot(player.player_id),
    }


@app.get("/api/rooms/{code}/session")
async def restore_session(code: str, player_id: str, token: str) -> dict[str, Any]:
    session = manager.authenticate(code, player_id, token)
    if not session:
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다.")
    room, player = session
    return {"room": room.snapshot(player.player_id)}


@app.websocket("/ws/{code}/{player_id}")
async def room_socket(websocket: WebSocket, code: str, player_id: str, token: str) -> None:
    authenticated = manager.authenticate(code, player_id, token)
    if not authenticated:
        await websocket.close(code=4401, reason="유효하지 않은 게임 세션입니다.")
        return
    room, player = authenticated
    await websocket.accept()
    connected = await room.connect(player_id, token, websocket)
    if not connected:
        await websocket.close(code=4401, reason="다시 입장해 주세요.")
        return
    try:
        while True:
            raw = await websocket.receive_text()
            if len(raw) > 12_000:
                await websocket.close(code=4400, reason="메시지가 너무 큽니다.")
                break
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(message, dict):
                continue
            async with room.lock:
                await room.handle(player, message)
                await room._broadcast()
    except WebSocketDisconnect:
        pass
    finally:
        await room.disconnect(player_id, websocket)
