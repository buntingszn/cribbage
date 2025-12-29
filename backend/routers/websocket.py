import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session, async_session
from ..services.websocket_manager import manager
from ..services.game_service import GameService

router = APIRouter()


async def get_session_for_ws():
    async with async_session() as session:
        yield session


@router.websocket("/ws/{game_code}")
async def websocket_endpoint(websocket: WebSocket, game_code: str):
    session_token = websocket.query_params.get("session_token")
    if not session_token:
        await websocket.close(code=4001, reason="Missing session token")
        return

    async with async_session() as session:
        service = GameService(session)
        player = await service.get_player_by_token(session_token)

        if not player:
            await websocket.close(code=4001, reason="Invalid session token")
            return

        if player.game.code != game_code:
            await websocket.close(code=4001, reason="Game code mismatch")
            return

        await manager.connect(websocket, player.game_id, session_token)

        player.is_connected = True
        player.last_seen = datetime.utcnow()
        await session.commit()

        # Notify others of connection
        await manager.broadcast_to_game(
            player.game_id,
            {
                "type": "player_status",
                "player_id": player.id,
                "name": player.name,
                "seat": player.seat,
                "connected": True,
            },
            exclude_token=session_token,
        )

        # Send current state to connecting player
        await send_player_state(websocket, player, service)

        try:
            while True:
                data = await websocket.receive_json()
                await handle_message(data, session_token, game_code, websocket)
        except WebSocketDisconnect:
            manager.disconnect(session_token)
            player.is_connected = False
            player.last_seen = datetime.utcnow()
            await session.commit()

            await manager.broadcast_to_game(
                player.game_id,
                {
                    "type": "player_status",
                    "player_id": player.id,
                    "name": player.name,
                    "seat": player.seat,
                    "connected": False,
                },
            )


async def send_player_state(websocket: WebSocket, player, service: GameService):
    game = player.game
    current_round = await service.get_current_round(game)

    hand_cards = []
    if current_round:
        hand = await service.get_player_hand(current_round.id, player.id)
        if hand:
            hand_cards = json.loads(hand.current_cards)

    state = {
        "type": "state_sync",
        "game": {
            "code": game.code,
            "status": game.status,
            "phase": game.current_phase,
            "player_count": game.player_count,
            "current_dealer_seat": game.current_dealer_seat,
            "current_turn_seat": game.current_turn_seat,
            "peg_count": game.peg_count,
            "cut_card": game.cut_card,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "seat": p.seat,
                    "score": p.score,
                    "connected": p.is_connected,
                }
                for p in sorted(game.players, key=lambda p: p.seat)
            ],
        },
        "your_hand": hand_cards,
        "your_seat": player.seat,
        "your_id": player.id,
    }
    await websocket.send_json(state)


async def handle_message(data: dict, session_token: str, game_code: str, websocket: WebSocket):
    msg_type = data.get("type")

    async with async_session() as session:
        service = GameService(session)
        player = await service.get_player_by_token(session_token)

        if not player:
            await websocket.send_json({"type": "error", "message": "Invalid session"})
            return

        game = player.game

        try:
            if msg_type == "start_game":
                if game.status != "waiting":
                    raise ValueError("Game already started")
                if len(game.players) < game.player_count:
                    raise ValueError("Not enough players")
                await service.start_round(game)
                await broadcast_game_state(game, service)

            elif msg_type == "discard":
                cards = data.get("cards", [])
                result = await service.process_discard(player, cards)
                await websocket.send_json({
                    "type": "hand_updated",
                    "cards": result["remaining_cards"],
                })
                await manager.broadcast_to_game(
                    game.id,
                    {
                        "type": "discard_complete",
                        "player_seat": player.seat,
                        "all_discarded": result["all_discarded"],
                    },
                )
                if result["all_discarded"]:
                    await broadcast_phase_change(game)

            elif msg_type == "cut":
                result = await service.process_cut(player)
                await manager.broadcast_to_game(
                    game.id,
                    {
                        "type": "cut_card",
                        "card": result["cut_card"],
                        "dealer_points": result["dealer_points"],
                    },
                )
                await broadcast_phase_change(game)
                # Send valid plays to the player whose turn it is
                await send_valid_plays_to_current_player(game, service)

            elif msg_type == "peg":
                card = data.get("card")
                if not card:
                    raise ValueError("No card specified")
                result = await service.process_peg(player, card)
                await manager.broadcast_to_game(
                    game.id,
                    {
                        "type": "peg_play",
                        "player_seat": result["player_seat"],
                        "card": result["card"],
                        "count": result["new_count"],
                        "points": result["points"],
                        "breakdown": result["breakdown"],
                    },
                )
                if result["phase"] == "hand_scoring":
                    await broadcast_phase_change(game)
                    # Auto-score hands
                    score_results = await service.score_hands(game)
                    for score_result in score_results:
                        await manager.broadcast_to_game(
                            game.id,
                            {
                                "type": "hand_scored" if not score_result.get("is_crib") else "crib_scored",
                                "player_seat": score_result["player_seat"],
                                "player_name": score_result["player_name"],
                                "cards": score_result["cards"],
                                "score": score_result["score"],
                                "new_total": score_result["new_total"],
                            },
                        )
                    if game.status == "finished":
                        winner = max(game.players, key=lambda p: p.score)
                        await manager.broadcast_to_game(
                            game.id,
                            {
                                "type": "game_over",
                                "winner_seat": winner.seat,
                                "winner_name": winner.name,
                                "final_scores": [p.score for p in sorted(game.players, key=lambda p: p.seat)],
                            },
                        )
                    else:
                        # Start new round
                        await service.start_round(game)
                        await broadcast_game_state(game, service)
                else:
                    await broadcast_phase_change(game)
                    await send_valid_plays_to_current_player(game, service)

            elif msg_type == "go":
                result = await service.process_go(player)
                await manager.broadcast_to_game(
                    game.id,
                    {
                        "type": "peg_go",
                        "player_seat": result["player_seat"],
                    },
                )
                if result["phase"] != "pegging":
                    await broadcast_phase_change(game)
                else:
                    await send_valid_plays_to_current_player(game, service)

            elif msg_type == "sync":
                await send_player_state(websocket, player, service)

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

        except ValueError as e:
            await websocket.send_json({"type": "error", "message": str(e)})


async def broadcast_game_state(game, service: GameService):
    for player in game.players:
        ws = manager.get_connection(player.session_token)
        if ws:
            await send_player_state(ws, player, service)


async def broadcast_phase_change(game):
    await manager.broadcast_to_game(
        game.id,
        {
            "type": "phase_change",
            "phase": game.current_phase,
            "turn_seat": game.current_turn_seat,
            "dealer_seat": game.current_dealer_seat,
        },
    )


async def send_valid_plays_to_current_player(game, service: GameService):
    """Send valid plays to the player whose turn it is"""
    if game.current_phase != "pegging" or game.current_turn_seat is None:
        return

    current_player = next(
        (p for p in game.players if p.seat == game.current_turn_seat), None
    )
    if not current_player:
        return

    valid_plays = await service.get_valid_plays(current_player)
    ws = manager.get_connection(current_player.session_token)
    if ws:
        await ws.send_json({
            "type": "valid_plays",
            "cards": valid_plays,
        })
