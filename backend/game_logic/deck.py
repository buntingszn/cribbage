import random

SUITS = ["h", "d", "c", "s"]  # hearts, diamonds, clubs, spades
RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]


def create_deck() -> list[str]:
    return [f"{rank}{suit}" for suit in SUITS for rank in RANKS]


def shuffle_deck(deck: list[str]) -> list[str]:
    shuffled = deck.copy()
    random.shuffle(shuffled)
    return shuffled


def deal_hands(
    deck: list[str], player_count: int
) -> tuple[list[list[str]], list[str]]:
    cards_per_player = 6 if player_count == 2 else 5
    hands = []
    remaining = deck.copy()
    for _ in range(player_count):
        hand = remaining[:cards_per_player]
        remaining = remaining[cards_per_player:]
        hands.append(hand)
    return hands, remaining


def card_value(card: str) -> int:
    """Pegging value: A=1, 2-9=face, T/J/Q/K=10"""
    rank = card[0]
    if rank == "A":
        return 1
    if rank in "TJQK":
        return 10
    return int(rank)


def card_rank_order(card: str) -> int:
    """For run detection: A=1, 2=2, ..., K=13"""
    return RANKS.index(card[0]) + 1
