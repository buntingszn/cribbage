import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import (
    CreateGameRequest,
    JoinGameRequest,
    GameResponse,
    GameInfo,
    PlayerInfo,
    ActiveGameInfo,
    ActiveGamesRequest,
)
from ..services.game_service import GameService
from ..services.websocket_manager import manager

router = APIRouter(prefix="/games", tags=["games"])


@router.post("", response_model=GameResponse)
async def create_game(
    data: CreateGameRequest, session: AsyncSession = Depends(get_session)
):
    service = GameService(session)
    try:
        game, player = await service.create_game(data.player_count, data.player_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return GameResponse(
        game_id=game.id,
        game_code=game.code,
        session_token=player.session_token,
        seat=player.seat,
    )


@router.post("/{game_code}/join", response_model=GameResponse)
async def join_game(
    game_code: str,
    data: JoinGameRequest,
    session: AsyncSession = Depends(get_session),
):
    service = GameService(session)
    try:
        game, player = await service.join_game(game_code, data.player_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Notify existing players about new player
    await manager.broadcast_to_game(
        game.id,
        {
            "type": "player_joined",
            "player_name": player.name,
            "seat": player.seat,
            "current_players": len(game.players),
        },
    )

    # If game started, send state to all connected players
    if game.status == "playing":
        current_round = await service.get_current_round(game)
        for p in game.players:
            ws = manager.get_connection(p.session_token)
            if ws:
                hand_cards = []
                if current_round:
                    hand = await service.get_player_hand(current_round.id, p.id)
                    if hand:
                        hand_cards = json.loads(hand.current_cards)
                await ws.send_json({
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
                                "id": pl.id,
                                "name": pl.name,
                                "seat": pl.seat,
                                "score": pl.score,
                                "connected": pl.is_connected,
                            }
                            for pl in sorted(game.players, key=lambda x: x.seat)
                        ],
                    },
                    "your_hand": hand_cards,
                    "your_seat": p.seat,
                    "your_id": p.id,
                })

    return GameResponse(
        game_id=game.id,
        game_code=game.code,
        session_token=player.session_token,
        seat=player.seat,
    )


@router.get("/{game_code}", response_model=GameInfo)
async def get_game_info(
    game_code: str, session: AsyncSession = Depends(get_session)
):
    service = GameService(session)
    game = await service.get_game_by_code(game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameInfo(
        code=game.code,
        status=game.status,
        player_count=game.player_count,
        current_players=len(game.players),
        players=[
            PlayerInfo(
                name=p.name,
                seat=p.seat,
                connected=p.is_connected,
                score=p.score,
            )
            for p in sorted(game.players, key=lambda p: p.seat)
        ],
        current_phase=game.current_phase,
        current_dealer_seat=game.current_dealer_seat,
    )


@router.post("/{game_code}/reconnect", response_model=GameResponse)
async def reconnect(
    game_code: str,
    session_token: str,
    session: AsyncSession = Depends(get_session),
):
    service = GameService(session)
    try:
        game, player = await service.reconnect_player(session_token)
        if game.code != game_code:
            raise ValueError("Session token does not match game")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return GameResponse(
        game_id=game.id,
        game_code=game.code,
        session_token=player.session_token,
        seat=player.seat,
    )


@router.post("/active", response_model=list[ActiveGameInfo])
async def get_active_games(
    data: ActiveGamesRequest,
    session: AsyncSession = Depends(get_session),
):
    """Get all active games for the given session tokens."""
    service = GameService(session)
    games = []

    for token in data.session_tokens[:20]:  # Limit to 20 tokens
        player = await service.get_player_by_token(token)
        if player and player.game.status != "finished":
            game = player.game
            games.append(
                ActiveGameInfo(
                    code=game.code,
                    status=game.status,
                    player_count=game.player_count,
                    current_players=len(game.players),
                    your_name=player.name,
                    your_seat=player.seat,
                    current_phase=game.current_phase,
                    updated_at=game.updated_at.isoformat(),
                )
            )

    return games
