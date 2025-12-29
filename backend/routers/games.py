from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import (
    CreateGameRequest,
    JoinGameRequest,
    GameResponse,
    GameInfo,
    PlayerInfo,
)
from ..services.game_service import GameService

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
