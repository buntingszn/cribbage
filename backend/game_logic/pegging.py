from .deck import card_value, card_rank_order


def valid_peg_plays(hand: list[str], current_count: int) -> list[str]:
    """Return cards that can be legally played (sum <= 31)"""
    return [card for card in hand if card_value(card) + current_count <= 31]


def score_peg_play(play_history: list[str], new_card: str) -> dict:
    """
    Score the pegging play.
    Returns { points, breakdown, new_count }
    """
    all_cards = play_history + [new_card]
    new_count = sum(card_value(c) for c in all_cards)

    points = 0
    breakdown = []

    # 15 or 31
    if new_count == 15:
        points += 2
        breakdown.append("fifteen for 2")
    if new_count == 31:
        points += 2
        breakdown.append("31 for 2")

    # Pairs (2, 3-of-kind=6, 4-of-kind=12)
    pair_points = score_peg_pairs(all_cards)
    if pair_points:
        points += pair_points
        if pair_points == 2:
            breakdown.append("pair for 2")
        elif pair_points == 6:
            breakdown.append("three of a kind for 6")
        elif pair_points == 12:
            breakdown.append("four of a kind for 12")

    # Runs (3+)
    run_points = score_peg_runs(all_cards)
    if run_points:
        points += run_points
        breakdown.append(f"run of {run_points} for {run_points}")

    return {"points": points, "breakdown": breakdown, "new_count": new_count}


def score_peg_pairs(cards: list[str]) -> int:
    """
    Score pairs at end of pegging sequence.
    Must be consecutive same-rank cards ending with the last played card.
    """
    if len(cards) < 2:
        return 0

    last_rank = cards[-1][0]
    count = 1

    for card in reversed(cards[:-1]):
        if card[0] == last_rank:
            count += 1
        else:
            break

    # 1 card = 0, 2 cards = 2 (1 pair), 3 cards = 6 (3 pairs), 4 cards = 12 (6 pairs)
    if count >= 2:
        return count * (count - 1)
    return 0


def score_peg_runs(cards: list[str]) -> int:
    """
    Score runs at end of pegging sequence.
    The run must include the last card played and can be in any order.
    """
    if len(cards) < 3:
        return 0

    # Check for runs of decreasing length, starting from all cards
    for run_len in range(len(cards), 2, -1):
        # Take the last run_len cards
        last_cards = cards[-run_len:]
        ranks = sorted([card_rank_order(c) for c in last_cards])

        # Check if they form a consecutive sequence
        is_run = True
        for i in range(1, len(ranks)):
            if ranks[i] != ranks[i - 1] + 1:
                is_run = False
                break

        if is_run:
            return run_len

    return 0


def score_last_card() -> int:
    """Last card played (not 31) = 1 point"""
    return 1


def score_go() -> int:
    """Go = 1 point"""
    return 1
