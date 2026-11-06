from __future__ import annotations

import asyncio
import json
import math
import random
import re
import secrets
import string
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MAP = json.loads((ROOT / "shared" / "map.json").read_text())
CHARACTER = json.loads((ROOT / "shared" / "character.json").read_text())
PAINT_MASK = tuple(pixel == "1" for row in CHARACTER["mask"] for pixel in row)
DEFAULT_PALETTE = CHARACTER["palette"]
MAP_WIDTH = int(MAP["columns"] * MAP["tileSize"])
MAP_HEIGHT = int(MAP["rows"] * MAP["tileSize"])
VIEW_WIDTH = 800
VIEW_HEIGHT = 600
PLAYER_SPEED = 100.0
PLAYER_HALF_WIDTH = 6.0
PLAYER_HALF_HEIGHT = 7.0
PAINTABLE_PHASES = {"hiding", "hunting"}
RATE_BUCKETS = ((32.0, 30.0), (64.0, 10.0), (128.0, 3.0), (math.inf, 1.0))

FURNITURE: tuple[dict[str, Any], ...] = tuple(item for item in MAP["furniture"] if item["solid"])
WALLS = tuple(MAP["walls"])
OBSTACLES = WALLS + FURNITURE
SPAWNS = tuple(MAP["spawns"])


def _overlap(a: dict[str, float], b: dict[str, Any]) -> bool:
    return (
        a["x"] - PLAYER_HALF_WIDTH < b["x"] + b["width"]
        and a["x"] + PLAYER_HALF_WIDTH > b["x"]
        and a["y"] - PLAYER_HALF_HEIGHT < b["y"] + b["height"]
        and a["y"] + PLAYER_HALF_HEIGHT > b["y"]
    )


def _view_rect(x: float, y: float, width: float = VIEW_WIDTH, height: float = VIEW_HEIGHT) -> tuple[float, float, float, float]:
    left = min(max(x - width / 2, 0.0), MAP_WIDTH - width)
    top = min(max(y - height / 2, 0.0), MAP_HEIGHT - height)
    return left, top, left + width, top + height


def _ray_box_distance(
    ox: float, oy: float, dx: float, dy: float, limit: float, box: dict[str, Any]
) -> float | None:
    near, far = 0.0, limit
    for origin, direction, lower, upper in (
        (ox, dx, box["x"], box["x"] + box["width"]),
        (oy, dy, box["y"], box["y"] + box["height"]),
    ):
        if abs(direction) < 1e-9:
            if origin < lower or origin > upper:
                return None
            continue
        enter = (lower - origin) / direction
        leave = (upper - origin) / direction
        near = max(near, min(enter, leave))
        far = min(far, max(enter, leave))
        if near > far:
            return None
    return near if 0 <= near <= limit else None


@dataclass(slots=True)
class Player:
    player_id: str
    token: str
    name: str
    x: float = SPAWNS[0]["x"]
    y: float = SPAWNS[0]["y"]
    role: str = "hider"
    alive: bool = True
    score: float = 0.0
    colors: list[int] = field(default_factory=lambda: [CHARACTER["defaultColor"] if inside else 0 for inside in PAINT_MASK])
    palette: list[str] = field(default_factory=lambda: list(DEFAULT_PALETTE))
    view_width: float = VIEW_WIDTH
    view_height: float = VIEW_HEIGHT
    painting: bool = False
    keys: dict[str, bool] = field(default_factory=dict)
    spectating_id: str | None = None
    last_shot: float = -10.0
    last_chat: float = 0.0
    connected: bool = False
    websocket: Any = None


class GameRoom:
    def __init__(self, code: str, host: Player):
        self.code = code
        self.host_id = host.player_id
        self.players: dict[str, Player] = {host.player_id: host}
        self.phase = "lobby"
        self.phase_started_at = time.time()
        self.phase_ends_at = 0.0
        self.winner: str | None = None
        self.result_reason: str | None = None
        self.round_number = 0
        self.practice = False
        self.chat: list[dict[str, Any]] = []
        self.lock = asyncio.Lock()
        self.task: asyncio.Task[None] | None = None
        self.last_tick = time.monotonic()
        self.last_broadcast = self.last_tick
        self.last_activity = self.last_tick
        self.closed = False

    def public_phase(self) -> str:
        return self.phase

    def view_position(self, viewer: Player) -> tuple[float, float]:
        target = self.players.get(viewer.spectating_id or "")
        if target and target.alive and target.role == "hider":
            return target.x, target.y
        return viewer.x, viewer.y

    def snapshot(self, viewer_id: str) -> dict[str, Any]:
        viewer = self.players.get(viewer_id)
        focus_x, focus_y = self.view_position(viewer) if viewer else (640.0, 480.0)
        left, top, right, bottom = _view_rect(focus_x, focus_y, viewer.view_width if viewer else VIEW_WIDTH, viewer.view_height if viewer else VIEW_HEIGHT)
        player_rows = []
        for player in self.players.values():
            in_view = left <= player.x <= right and top <= player.y <= bottom
            viewer_is_hider = bool(viewer and viewer.role == "hider")
            visible_to_team = viewer_is_hider and player.role == "hider"
            hidden_during_prep = self.phase == "hiding" and player.player_id != viewer_id
            position_allowed = player.player_id == viewer_id or (not hidden_during_prep and (in_view or visible_to_team))
            player_rows.append(
                {
                    "id": player.player_id,
                    "name": player.name,
                    "role": player.role,
                    "x": round(player.x, 1) if position_allowed else None,
                    "y": round(player.y, 1) if position_allowed else None,
                    "alive": player.alive,
                    "score": round(player.score, 1),
                    "colors": player.colors,
                    "palette": player.palette,
                    "painting": player.painting,
                    "connected": player.connected,
                    "spectatingId": player.spectating_id,
                }
            )
        scores = sorted(
            ({"id": p.player_id, "name": p.name, "score": round(p.score, 1), "alive": p.alive}
             for p in self.players.values()),
            key=lambda item: (-item["score"], item["name"].casefold()),
        )
        return {
            "code": self.code,
            "hostId": self.host_id,
            "phase": self.phase,
            "phaseStartedAt": self.phase_started_at,
            "phaseEndsAt": self.phase_ends_at,
            "roundNumber": self.round_number,
            "practice": self.practice,
            "winner": self.winner,
            "resultReason": self.result_reason,
            "spectatingId": viewer.spectating_id if viewer else None,
            "players": player_rows,
            "scores": scores,
            "chat": self.chat[-80:],
            "serverTime": time.time(),
        }

    async def _notify(self, player: Player, message: str) -> None:
        if player.websocket:
            try:
                await player.websocket.send_json({"type": "notice", "message": message})
            except Exception:
                player.connected = False
                player.websocket = None

    async def _broadcast(self) -> None:
        for player in tuple(self.players.values()):
            socket = player.websocket
            if not socket:
                continue
            try:
                await socket.send_json({"type": "snapshot", "room": self.snapshot(player.player_id)})
            except Exception:
                player.connected = False
                player.websocket = None

    async def connect(self, player_id: str, token: str, websocket: Any) -> Player | None:
        async with self.lock:
            player = self.players.get(player_id)
            if not player or not secrets.compare_digest(player.token, token):
                return None
            previous = player.websocket
            if previous and previous is not websocket:
                try:
                    await previous.close(code=4001, reason="다른 연결에서 다시 입장했습니다.")
                except Exception:
                    pass
            player.websocket = websocket
            player.connected = True
            self.last_activity = time.monotonic()
            await self._broadcast()
            return player

    async def disconnect(self, player_id: str, websocket: Any) -> None:
        async with self.lock:
            player = self.players.get(player_id)
            if player and player.websocket is websocket:
                player.websocket = None
                player.connected = False
                player.keys.clear()
                await self._broadcast()

    def _set_phase(self, phase: str, duration: float = 0.0) -> None:
        self.phase = phase
        self.phase_started_at = time.time()
        self.phase_ends_at = time.time() + duration if duration else 0.0

    def _begin_round(self) -> None:
        self.last_activity = time.monotonic()
        ordered = list(self.players.values())
        self.practice = len(ordered) == 1
        hunter = None if self.practice else random.choice(ordered)
        spawns = list(SPAWNS)
        random.shuffle(spawns)
        for index, player in enumerate(ordered):
            spawn = spawns[index]
            player.x = spawn["x"]
            player.y = spawn["y"]
            player.role = "hunter" if player is hunter else "hider"
            player.alive = True
            player.score = 0.0
            player.painting = False
            player.keys.clear()
            player.spectating_id = None
            player.last_shot = -10.0
        self.winner = None
        self.result_reason = None
        self.round_number += 1
        self._set_phase("hunting" if self.practice else "hiding", 0.0 if self.practice else 30.0)

    def _finish_round(self, winner: str, reason: str) -> None:
        if self.phase != "hunting":
            return
        self.winner = winner
        self.result_reason = reason
        for player in self.players.values():
            player.keys.clear()
            player.painting = False
        self._set_phase("results", 12.0)

    def _return_to_lobby(self) -> None:
        self.practice = False
        for player in self.players.values():
            player.role = "hider"
            player.alive = True
            player.score = 0.0
            player.painting = False
            player.keys.clear()
            player.spectating_id = None
        self.winner = None
        self.result_reason = None
        self._set_phase("lobby")

    async def handle(self, player: Player, data: dict[str, Any]) -> None:
        kind = data.get("type")
        now = time.monotonic()
        if kind == "start":
            if player.player_id != self.host_id:
                await self._notify(player, "방장만 게임을 시작할 수 있습니다.")
            elif self.phase != "lobby":
                await self._notify(player, "대기실에서만 게임을 시작할 수 있습니다.")
            elif not 1 <= len(self.players) <= 8:
                await self._notify(player, "게임 시작에는 1~8명이 필요합니다.")
            else:
                self._begin_round()
        elif kind == "return_lobby":
            if self.phase == "results" or (self.practice and player.player_id == self.host_id):
                self._return_to_lobby()
        elif kind == "input":
            if self.phase in PAINTABLE_PHASES and player.alive and not player.painting and not player.spectating_id:
                keys = data.get("keys", {})
                if isinstance(keys, dict):
                    player.keys = {name: bool(keys.get(name)) for name in ("up", "down", "left", "right")}
        elif kind == "viewport":
            width, height = data.get("width"), data.get("height")
            if all(type(value) in (int, float) and math.isfinite(value) for value in (width, height)):
                player.view_width = min(max(float(width), 64.0), VIEW_WIDTH)
                player.view_height = min(max(float(height), 64.0), VIEW_HEIGHT)
        elif kind == "paint_mode":
            if self.phase in PAINTABLE_PHASES and player.alive and player.role == "hider":
                player.painting = bool(data.get("enabled"))
                if player.painting:
                    player.keys.clear()
        elif kind == "paint":
            colors = data.get("colors")
            palette = data.get("palette", player.palette)
            if self.phase in PAINTABLE_PHASES and player.alive and player.role == "hider" and isinstance(colors, list) and len(colors) == 256:
                valid_palette = isinstance(palette, list) and 8 <= len(palette) <= 64 and all(isinstance(color, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", color) for color in palette)
                if valid_palette and all(type(color) is int and 0 <= color < len(palette) for color in colors):
                    player.palette = [color.lower() for color in palette]
                    player.colors = [color if PAINT_MASK[i] else 0 for i, color in enumerate(colors)]
        elif kind == "shoot":
            if self.phase == "hunting":
                self._shoot(player, data, now)
        elif kind == "spectate":
            target_id = data.get("targetId")
            if self.phase in PAINTABLE_PHASES and player.role == "hider" and (not player.alive or target_id):
                target = self.players.get(target_id) if isinstance(target_id, str) else None
                if target and target.role == "hider" and target.alive and target is not player:
                    player.spectating_id = target.player_id
                    player.keys.clear()
                elif target_id is None and player.alive:
                    player.spectating_id = None
                    player.keys.clear()
        elif kind == "chat":
            text = data.get("text")
            if isinstance(text, str) and 0.35 <= now - player.last_chat and text.strip():
                player.last_chat = now
                self.last_activity = now
                self.chat.append({"id": uuid.uuid4().hex[:12], "playerId": player.player_id, "name": player.name, "text": text.strip()[:160], "sentAt": time.time()})
                self.chat = self.chat[-80:]
        elif kind == "leave":
            self.players.pop(player.player_id, None)
            if player.player_id == self.host_id and self.players:
                self.host_id = next(iter(self.players))
            if not self.players:
                self.closed = True
            else:
                await self._broadcast()

    def _shoot(self, hunter: Player, data: dict[str, Any], now: float) -> None:
        if hunter.role != "hunter" or not hunter.alive:
            return
        if now - hunter.last_shot < 1.0:
            return
        tx, ty = data.get("x"), data.get("y")
        if not isinstance(tx, (int, float)) or not isinstance(ty, (int, float)):
            return
        left, top, right, bottom = _view_rect(hunter.x, hunter.y, hunter.view_width, hunter.view_height)
        if not (left <= tx <= right and top <= ty <= bottom):
            return
        dx, dy = float(tx) - hunter.x, float(ty) - hunter.y
        length = math.hypot(dx, dy)
        if length < 1:
            return
        dx, dy = dx / length, dy / length
        edge_distances = []
        if dx > 0:
            edge_distances.append((right - hunter.x) / dx)
        elif dx < 0:
            edge_distances.append((left - hunter.x) / dx)
        if dy > 0:
            edge_distances.append((bottom - hunter.y) / dy)
        elif dy < 0:
            edge_distances.append((top - hunter.y) / dy)
        max_distance = min((distance for distance in edge_distances if distance >= 0), default=0.0)
        if max_distance <= 0:
            return
        hunter.last_shot = now
        nearest_block = max_distance
        for obstacle in OBSTACLES:
            distance = _ray_box_distance(hunter.x, hunter.y, dx, dy, nearest_block, obstacle)
            if distance is not None:
                nearest_block = min(nearest_block, distance)
        nearest_hider: tuple[float, Player] | None = None
        for target in self.players.values():
            if target.role != "hider" or not target.alive:
                continue
            body = {"x": target.x - PLAYER_HALF_WIDTH, "y": target.y - PLAYER_HALF_HEIGHT,
                    "width": PLAYER_HALF_WIDTH * 2, "height": PLAYER_HALF_HEIGHT * 2}
            distance = _ray_box_distance(hunter.x, hunter.y, dx, dy, nearest_block, body)
            if distance is not None and (nearest_hider is None or distance < nearest_hider[0]):
                nearest_hider = (distance, target)
        if nearest_hider:
            target = nearest_hider[1]
            target.alive = False
            target.keys.clear()
            target.painting = False
            survivors = [p for p in self.players.values() if p.role == "hider" and p.alive]
            if not survivors:
                self._finish_round("hunter", "all_hiders_caught")
            elif not target.spectating_id:
                target.spectating_id = next((p.player_id for p in survivors), None)

    def _step_player(self, player: Player, dx: float, dy: float) -> None:
        x = min(max(player.x + dx, 32 + PLAYER_HALF_WIDTH), MAP_WIDTH - 32 - PLAYER_HALF_WIDTH)
        y = min(max(player.y + dy, 32 + PLAYER_HALF_HEIGHT), MAP_HEIGHT - 32 - PLAYER_HALF_HEIGHT)
        candidate = {"x": x, "y": player.y}
        if not any(_overlap(candidate, obstacle) for obstacle in OBSTACLES):
            player.x = x
        candidate = {"x": player.x, "y": y}
        if not any(_overlap(candidate, obstacle) for obstacle in OBSTACLES):
            player.y = y

    def _award_score(self, dt: float) -> None:
        hunter = next((p for p in self.players.values() if p.role == "hunter" and p.alive), None)
        if not hunter:
            return
        left, top, right, bottom = _view_rect(hunter.x, hunter.y, hunter.view_width, hunter.view_height)
        for hider in self.players.values():
            if hider.role != "hider" or not hider.alive:
                continue
            if left <= hider.x <= right and top <= hider.y <= bottom:
                distance = math.hypot(hider.x - hunter.x, hider.y - hunter.y)
                rate = next(points for threshold, points in RATE_BUCKETS if distance <= threshold)
                hider.score += rate * dt

    async def _tick(self, dt: float) -> None:
        if self.phase in PAINTABLE_PHASES:
            for player in self.players.values():
                if not player.alive or player.painting or player.spectating_id:
                    player.keys.clear()
                    continue
                x = int(player.keys.get("right", False)) - int(player.keys.get("left", False))
                y = int(player.keys.get("down", False)) - int(player.keys.get("up", False))
                length = math.hypot(x, y)
                if length:
                    speed = PLAYER_SPEED * dt / length
                    self._step_player(player, x * speed, y * speed)
        if self.phase == "hiding" and time.time() >= self.phase_ends_at:
            self._set_phase("hunting", 180.0)
        elif self.phase == "hunting":
            self._award_score(dt)
            if self.phase_ends_at and time.time() >= self.phase_ends_at:
                self._finish_round("hiders", "time_up")
        elif self.phase == "results" and time.time() >= self.phase_ends_at:
            self._return_to_lobby()
        if time.monotonic() - self.last_broadcast >= 0.1:
            self.last_broadcast = time.monotonic()
            await self._broadcast()

    async def run(self) -> None:
        while not self.closed:
            started = time.monotonic()
            dt = min(started - self.last_tick, 0.15)
            self.last_tick = started
            async with self.lock:
                await self._tick(dt)
                # Keep a quiet lobby available briefly so participants can reconnect.
                if self.phase == "lobby" and not any(p.connected for p in self.players.values()):
                    if time.monotonic() - self.last_activity > 900:
                        self.closed = True
            await asyncio.sleep(max(0.0, 0.05 - (time.monotonic() - started)))


class RoomManager:
    def __init__(self) -> None:
        self.rooms: dict[str, GameRoom] = {}
        self.lock = asyncio.Lock()

    @staticmethod
    def _name(value: Any) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("닉네임을 입력해 주세요.")
        return value.strip()[:18]

    async def create(self, name: Any) -> tuple[GameRoom, Player]:
        player = Player(uuid.uuid4().hex[:12], secrets.token_urlsafe(32), self._name(name))
        async with self.lock:
            code = ""
            while not code or code in self.rooms:
                code = "".join(secrets.choice(string.ascii_uppercase.replace("I", "").replace("O", "") + "23456789") for _ in range(5))
            room = GameRoom(code, player)
            self.rooms[code] = room
            room.task = asyncio.create_task(room.run(), name=f"room-{code}")
        return room, player

    async def join(self, code: str, name: Any) -> tuple[GameRoom, Player]:
        normalized = code.strip().upper()
        room = self.rooms.get(normalized)
        if not room:
            raise ValueError("방 코드를 찾을 수 없습니다.")
        async with room.lock:
            if room.phase != "lobby":
                raise ValueError("진행 중인 방에는 입장할 수 없습니다.")
            if len(room.players) >= 8:
                raise ValueError("방이 가득 찼습니다. 최대 8명이 참여할 수 있습니다.")
            player = Player(uuid.uuid4().hex[:12], secrets.token_urlsafe(32), self._name(name))
            room.players[player.player_id] = player
            await room._broadcast()
        return room, player

    def authenticate(self, code: str, player_id: str, token: str) -> tuple[GameRoom, Player] | None:
        room = self.rooms.get(code.strip().upper())
        player = room.players.get(player_id) if room else None
        if room and player and secrets.compare_digest(player.token, token):
            return room, player
        return None

    def cleanup(self) -> None:
        for room in self.rooms.values():
            room.closed = True
            if room.task:
                room.task.cancel()
