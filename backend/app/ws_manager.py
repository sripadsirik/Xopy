from __future__ import annotations
import asyncio
from typing import Set
from fastapi import WebSocket

class WSManager:
    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(ws)

    async def broadcast_json(self, payload: dict) -> None:
        async with self._lock:
            conns = list(self._connections)

        # Send outside the lock; drop dead connections
        dead = []
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.discard(ws)

    async def count(self) -> int:
        async with self._lock:
            return len(self._connections)
