import json
import secrets
from datetime import datetime
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import GameDB, PlayerDB, RoundDB, PlayerHandDB
from ..game_logic import deck, pegging, scoring


class GameService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_game(
        self, player_count: int, creator_name: str
    ) -> tuple[GameDB, PlayerDB]:
        if player_count not in (2, 3, 4):
            raise ValueError("Player count must be 2, 3, or 4")

        game = GameDB(
            id=str(uuid4()),
            code=secrets.token_urlsafe(6)[:8],
            status="waiting",
            player_count=player_count,
            is_teams=(player_count == 4),
            current_phase="waiting",
        )

        player = PlayerDB(
            id=str(uuid4()),
            game_id=game.id,
            session_token=secrets.token_hex(32),
            name=creator_name[:50],
            seat=0,
            team=0 if game.is_teams else None,
        )

        self.session.add(game)
        self.session.add(player)
        await self.session.commit()
        await self.session.refresh(game)
        await self.session.refresh(player)
        return game, player

    async def get_game_by_code(self, code: str) -> GameDB | None:
        result = await self.session.execute(
            select(GameDB)
            .where(GameDB.code == code)
            .options(selectinload(GameDB.players), selectinload(GameDB.rounds))
        )
        return result.scalar_one_or_none()

    async def get_player_by_token(self, token: str) -> PlayerDB | None:
        result = await self.session.execute(
            select(PlayerDB)
            .where(PlayerDB.session_token == token)
            .options(selectinload(PlayerDB.game).selectinload(GameDB.players))
        )
        return result.scalar_one_or_none()

    async def join_game(
        self, game_code: str, player_name: str
    ) -> tuple[GameDB, PlayerDB]:
        game = await self.get_game_by_code(game_code)
        if not game:
            raise ValueError("Game not found")
        if len(game.players) >= game.player_count:
            raise ValueError("Game is full")
        if game.status != "waiting":
            raise ValueError("Game already started")

        seat = len(game.players)
        player = PlayerDB(
            id=str(uuid4()),
            game_id=game.id,
            session_token=secrets.token_hex(32),
            name=player_name[:50],
            seat=seat,
            team=seat % 2 if game.is_teams else None,
        )

        self.session.add(player)

        # Start game if full
        if len(game.players) + 1 == game.player_count:
            game.status = "playing"
            game.current_phase = "deal"

        await self.session.commit()
        await self.session.refresh(game)
        await self.session.refresh(player)
        return game, player

    async def start_round(self, game: GameDB) -> RoundDB:
        full_deck = deck.create_deck()
        shuffled = deck.shuffle_deck(full_deck)
        hands, remaining = deck.deal_hands(shuffled, game.player_count)

        round_num = len(game.rounds) + 1
        game_round = RoundDB(
            id=str(uuid4()),
            game_id=game.id,
            round_number=round_num,
            dealer_seat=game.current_dealer_seat,
            deck_state=json.dumps(remaining),
        )
        self.session.add(game_round)
        await self.session.flush()

        sorted_players = sorted(game.players, key=lambda p: p.seat)
        for i, player in enumerate(sorted_players):
            hand = PlayerHandDB(
                id=str(uuid4()),
                round_id=game_round.id,
                player_id=player.id,
                dealt_cards=json.dumps(hands[i]),
                current_cards=json.dumps(hands[i]),
            )
            self.session.add(hand)

        game.current_phase = "discard"
        game.cut_card = None
        game.peg_count = 0
        await self.session.commit()
        return game_round

    async def get_current_round(self, game: GameDB) -> RoundDB | None:
        if not game.rounds:
            return None
        return max(game.rounds, key=lambda r: r.round_number)

    async def get_player_hand(
        self, round_id: str, player_id: str
    ) -> PlayerHandDB | None:
        result = await self.session.execute(
            select(PlayerHandDB).where(
                PlayerHandDB.round_id == round_id,
                PlayerHandDB.player_id == player_id,
            )
        )
        return result.scalar_one_or_none()

    async def process_discard(
        self, player: PlayerDB, cards: list[str]
    ) -> dict:
        game = player.game
        current_round = await self.get_current_round(game)
        if not current_round:
            raise ValueError("No active round")

        hand = await self.get_player_hand(current_round.id, player.id)
        if not hand:
            raise ValueError("No hand found")

        current_cards = json.loads(hand.current_cards)
        discard_count = 2 if game.player_count == 2 else 1

        if len(cards) != discard_count:
            raise ValueError(f"Must discard exactly {discard_count} cards")

        for card in cards:
            if card not in current_cards:
                raise ValueError(f"Card {card} not in hand")
            current_cards.remove(card)

        hand.current_cards = json.dumps(current_cards)

        crib_cards = json.loads(current_round.crib_cards)
        crib_cards.extend(cards)
        current_round.crib_cards = json.dumps(crib_cards)

        await self.session.commit()

        # Check if all players have discarded
        all_hands = await self.session.execute(
            select(PlayerHandDB).where(PlayerHandDB.round_id == current_round.id)
        )
        all_hands = all_hands.scalars().all()

        expected_hand_size = 4
        all_discarded = all(
            len(json.loads(h.current_cards)) == expected_hand_size for h in all_hands
        )

        if all_discarded:
            game.current_phase = "cut"
            # Set turn to player after dealer (non-dealer cuts)
            game.current_turn_seat = (game.current_dealer_seat + 1) % game.player_count
            await self.session.commit()

        return {
            "remaining_cards": current_cards,
            "all_discarded": all_discarded,
            "phase": game.current_phase,
        }

    async def process_cut(self, player: PlayerDB) -> dict:
        game = player.game
        if game.current_phase != "cut":
            raise ValueError("Not in cut phase")
        if player.seat != game.current_turn_seat:
            raise ValueError("Not your turn to cut")

        current_round = await self.get_current_round(game)
        if not current_round:
            raise ValueError("No active round")

        remaining_deck = json.loads(current_round.deck_state)
        if not remaining_deck:
            raise ValueError("No cards left to cut")

        cut_index = secrets.randbelow(len(remaining_deck))
        cut_card = remaining_deck.pop(cut_index)
        current_round.deck_state = json.dumps(remaining_deck)
        game.cut_card = cut_card

        # Check for His Heels (Jack as cut card = 2 points for dealer)
        dealer_points = 0
        if cut_card[0] == "J":
            dealer = next(p for p in game.players if p.seat == game.current_dealer_seat)
            dealer.score += 2
            dealer_points = 2

        game.current_phase = "pegging"
        game.current_turn_seat = (game.current_dealer_seat + 1) % game.player_count
        game.peg_count = 0

        await self.session.commit()

        return {
            "cut_card": cut_card,
            "dealer_points": dealer_points,
            "phase": game.current_phase,
        }

    async def reconnect_player(self, session_token: str) -> tuple[GameDB, PlayerDB]:
        player = await self.get_player_by_token(session_token)
        if not player:
            raise ValueError("Session not found")

        player.is_connected = True
        player.last_seen = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(player)
        return player.game, player

    async def mark_player_disconnected(self, session_token: str):
        player = await self.get_player_by_token(session_token)
        if player:
            player.is_connected = False
            player.last_seen = datetime.utcnow()
            await self.session.commit()

    async def mark_player_connected(self, session_token: str):
        player = await self.get_player_by_token(session_token)
        if player:
            player.is_connected = True
            player.last_seen = datetime.utcnow()
            await self.session.commit()

    async def get_all_hands_for_round(self, round_id: str) -> list[PlayerHandDB]:
        result = await self.session.execute(
            select(PlayerHandDB).where(PlayerHandDB.round_id == round_id)
        )
        return list(result.scalars().all())

    async def process_peg(self, player: PlayerDB, card: str) -> dict:
        game = player.game
        if game.current_phase != "pegging":
            raise ValueError("Not in pegging phase")
        if player.seat != game.current_turn_seat:
            raise ValueError("Not your turn")

        current_round = await self.get_current_round(game)
        if not current_round:
            raise ValueError("No active round")

        hand = await self.get_player_hand(current_round.id, player.id)
        if not hand:
            raise ValueError("No hand found")

        current_cards = json.loads(hand.current_cards)
        pegged_cards = json.loads(hand.pegged_cards)

        if card not in current_cards:
            raise ValueError("Card not in hand")

        # Check if play is valid (doesn't exceed 31)
        if deck.card_value(card) + game.peg_count > 31:
            raise ValueError("Play would exceed 31")

        # Make the play
        current_cards.remove(card)
        pegged_cards.append(card)
        hand.current_cards = json.dumps(current_cards)
        hand.pegged_cards = json.dumps(pegged_cards)

        # Update peg history
        peg_history = json.loads(current_round.peg_history)
        peg_history.append({"seat": player.seat, "card": card})

        # Get cards played in current sequence (since last reset)
        current_sequence = self._get_current_peg_sequence(peg_history)

        # Score the play
        history_cards = [p["card"] for p in current_sequence[:-1]]
        peg_result = pegging.score_peg_play(history_cards, card)

        game.peg_count = peg_result["new_count"]
        player.score += peg_result["points"]

        current_round.peg_history = json.dumps(peg_history)

        # Determine next turn
        await self._advance_peg_turn(game, current_round)

        await self.session.commit()

        return {
            "card": card,
            "points": peg_result["points"],
            "breakdown": peg_result["breakdown"],
            "new_count": peg_result["new_count"],
            "player_seat": player.seat,
            "next_turn_seat": game.current_turn_seat,
            "phase": game.current_phase,
        }

    def _get_current_peg_sequence(self, peg_history: list[dict]) -> list[dict]:
        """Get plays since last count reset (31 or all Go)"""
        sequence = []
        for play in reversed(peg_history):
            if play.get("type") == "reset":
                break
            sequence.insert(0, play)
        return sequence

    async def _advance_peg_turn(self, game: GameDB, current_round: RoundDB):
        """Advance to next player's turn in pegging, handling Go and phase transitions"""
        all_hands = await self.get_all_hands_for_round(current_round.id)

        # Check if all cards have been played
        all_empty = all(len(json.loads(h.current_cards)) == 0 for h in all_hands)
        if all_empty:
            # Award last card point if not 31
            if game.peg_count != 31:
                current_player = next(p for p in game.players if p.seat == game.current_turn_seat)
                current_player.score += 1

            # Move to scoring phase
            game.current_phase = "hand_scoring"
            game.current_turn_seat = (game.current_dealer_seat + 1) % game.player_count
            return

        # If count hit 31, reset
        if game.peg_count == 31:
            game.peg_count = 0
            peg_history = json.loads(current_round.peg_history)
            peg_history.append({"type": "reset"})
            current_round.peg_history = json.dumps(peg_history)

        # Find next player who can play
        for i in range(1, game.player_count + 1):
            next_seat = (game.current_turn_seat + i) % game.player_count
            next_player = next(p for p in game.players if p.seat == next_seat)
            hand = next(h for h in all_hands if h.player_id == next_player.id)
            cards = json.loads(hand.current_cards)

            valid_plays = pegging.valid_peg_plays(cards, game.peg_count)
            if valid_plays:
                game.current_turn_seat = next_seat
                return

        # No one can play - reset count and find someone with cards
        game.peg_count = 0
        peg_history = json.loads(current_round.peg_history)
        peg_history.append({"type": "reset"})
        current_round.peg_history = json.dumps(peg_history)

        for i in range(1, game.player_count + 1):
            next_seat = (game.current_turn_seat + i) % game.player_count
            next_player = next(p for p in game.players if p.seat == next_seat)
            hand = next(h for h in all_hands if h.player_id == next_player.id)
            cards = json.loads(hand.current_cards)
            if cards:
                game.current_turn_seat = next_seat
                return

    async def process_go(self, player: PlayerDB) -> dict:
        """Handle when a player declares Go (cannot play)"""
        game = player.game
        if game.current_phase != "pegging":
            raise ValueError("Not in pegging phase")
        if player.seat != game.current_turn_seat:
            raise ValueError("Not your turn")

        current_round = await self.get_current_round(game)
        if not current_round:
            raise ValueError("No active round")

        hand = await self.get_player_hand(current_round.id, player.id)
        current_cards = json.loads(hand.current_cards)
        valid_plays = pegging.valid_peg_plays(current_cards, game.peg_count)

        if valid_plays:
            raise ValueError("You must play a card if possible")

        # Record the Go
        peg_history = json.loads(current_round.peg_history)
        peg_history.append({"seat": player.seat, "type": "go"})
        current_round.peg_history = json.dumps(peg_history)

        await self._advance_peg_turn(game, current_round)
        await self.session.commit()

        return {
            "player_seat": player.seat,
            "next_turn_seat": game.current_turn_seat,
            "phase": game.current_phase,
        }

    async def get_valid_plays(self, player: PlayerDB) -> list[str]:
        """Get valid cards a player can play in pegging"""
        game = player.game
        if game.current_phase != "pegging":
            return []

        current_round = await self.get_current_round(game)
        if not current_round:
            return []

        hand = await self.get_player_hand(current_round.id, player.id)
        if not hand:
            return []

        current_cards = json.loads(hand.current_cards)
        return pegging.valid_peg_plays(current_cards, game.peg_count)

    async def score_hands(self, game: GameDB) -> list[dict]:
        """Score all hands and the crib"""
        current_round = await self.get_current_round(game)
        if not current_round:
            raise ValueError("No active round")

        cut_card = game.cut_card
        if not cut_card:
            raise ValueError("No cut card")

        results = []
        all_hands = await self.get_all_hands_for_round(current_round.id)

        # Score in order: non-dealer first, then dealer, then crib
        sorted_players = sorted(game.players, key=lambda p: p.seat)

        # Reorder so non-dealer scores first
        dealer_idx = next(i for i, p in enumerate(sorted_players) if p.seat == game.current_dealer_seat)
        scoring_order = sorted_players[dealer_idx + 1:] + sorted_players[:dealer_idx + 1]

        for player in scoring_order:
            hand = next(h for h in all_hands if h.player_id == player.id)
            dealt_cards = json.loads(hand.dealt_cards)
            # Get the 4 cards kept (not the discards)
            kept_cards = json.loads(hand.current_cards) if json.loads(hand.current_cards) else dealt_cards[:4]

            # Actually we need to get original 4 kept cards, not pegged
            # Let's use dealt_cards minus crib_cards
            crib_cards = json.loads(current_round.crib_cards)
            kept_cards = [c for c in dealt_cards if c not in crib_cards or dealt_cards.count(c) > crib_cards.count(c)][:4]

            score_result = scoring.score_hand(kept_cards, cut_card, is_crib=False)
            player.score += score_result["total"]
            hand.hand_score = score_result["total"]

            results.append({
                "player_seat": player.seat,
                "player_name": player.name,
                "cards": kept_cards,
                "score": score_result,
                "new_total": player.score,
            })

            # Check for winner
            if player.score >= 121:
                game.status = "finished"
                await self.session.commit()
                return results

        # Score crib for dealer
        dealer = next(p for p in game.players if p.seat == game.current_dealer_seat)
        crib_cards = json.loads(current_round.crib_cards)
        crib_result = scoring.score_hand(crib_cards, cut_card, is_crib=True)
        dealer.score += crib_result["total"]

        results.append({
            "player_seat": dealer.seat,
            "player_name": dealer.name,
            "cards": crib_cards,
            "score": crib_result,
            "new_total": dealer.score,
            "is_crib": True,
        })

        # Check for winner
        if dealer.score >= 121:
            game.status = "finished"
        else:
            # Start new round
            game.current_dealer_seat = (game.current_dealer_seat + 1) % game.player_count
            game.current_phase = "deal"

        await self.session.commit()
        return results
