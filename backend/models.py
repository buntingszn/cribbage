from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel
from .database import Base


class GameDB(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="waiting")
    player_count: Mapped[int] = mapped_column(Integer, default=2)
    is_teams: Mapped[bool] = mapped_column(Boolean, default=False)
    current_dealer_seat: Mapped[int] = mapped_column(Integer, default=0)
    current_phase: Mapped[str] = mapped_column(String(20), default="waiting")
    current_turn_seat: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    peg_count: Mapped[int] = mapped_column(Integer, default=0)
    cut_card: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    players: Mapped[list["PlayerDB"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )
    rounds: Mapped[list["RoundDB"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )


class PlayerDB(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"))
    session_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(50))
    seat: Mapped[int] = mapped_column(Integer)
    team: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    game: Mapped["GameDB"] = relationship(back_populates="players")
    hands: Mapped[list["PlayerHandDB"]] = relationship(
        back_populates="player", cascade="all, delete-orphan"
    )


class RoundDB(Base):
    __tablename__ = "rounds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    game_id: Mapped[str] = mapped_column(ForeignKey("games.id"))
    round_number: Mapped[int] = mapped_column(Integer)
    dealer_seat: Mapped[int] = mapped_column(Integer)
    deck_state: Mapped[str] = mapped_column(Text, default="[]")
    crib_cards: Mapped[str] = mapped_column(Text, default="[]")
    peg_history: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    game: Mapped["GameDB"] = relationship(back_populates="rounds")
    hands: Mapped[list["PlayerHandDB"]] = relationship(
        back_populates="round", cascade="all, delete-orphan"
    )


class PlayerHandDB(Base):
    __tablename__ = "player_hands"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    round_id: Mapped[str] = mapped_column(ForeignKey("rounds.id"))
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id"))
    dealt_cards: Mapped[str] = mapped_column(Text, default="[]")
    current_cards: Mapped[str] = mapped_column(Text, default="[]")
    pegged_cards: Mapped[str] = mapped_column(Text, default="[]")
    hand_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    round: Mapped["RoundDB"] = relationship(back_populates="hands")
    player: Mapped["PlayerDB"] = relationship(back_populates="hands")


# Pydantic schemas for API
class CreateGameRequest(BaseModel):
    player_count: int
    player_name: str


class JoinGameRequest(BaseModel):
    player_name: str


class GameResponse(BaseModel):
    game_id: str
    game_code: str
    session_token: str
    seat: int


class PlayerInfo(BaseModel):
    name: str
    seat: int
    connected: bool
    score: int


class GameInfo(BaseModel):
    code: str
    status: str
    player_count: int
    current_players: int
    players: list[PlayerInfo]
    current_phase: str
    current_dealer_seat: int
