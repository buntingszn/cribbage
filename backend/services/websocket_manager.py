from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # game_id -> {session_token -> WebSocket}
        self.active_connections: dict[str, dict[str, WebSocket]] = {}
        # session_token -> game_id (reverse lookup)
        self.session_games: dict[str, str] = {}

    async def connect(self, websocket: WebSocket, game_id: str, session_token: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
        self.active_connections[game_id][session_token] = websocket
        self.session_games[session_token] = game_id

    def disconnect(self, session_token: str):
        game_id = self.session_games.pop(session_token, None)
        if game_id and game_id in self.active_connections:
            self.active_connections[game_id].pop(session_token, None)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    def get_connection(self, session_token: str) -> WebSocket | None:
        game_id = self.session_games.get(session_token)
        if game_id and game_id in self.active_connections:
            return self.active_connections[game_id].get(session_token)
        return None

    async def broadcast_to_game(
        self, game_id: str, message: dict, exclude_token: str | None = None
    ):
        if game_id in self.active_connections:
            for token, ws in list(self.active_connections[game_id].items()):
                if token != exclude_token:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        # Connection may have closed
                        pass

    async def send_personal(self, session_token: str, message: dict):
        ws = self.get_connection(session_token)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()
