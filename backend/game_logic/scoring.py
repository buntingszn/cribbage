from itertools import combinations
from collections import Counter
from .deck import card_value, card_rank_order


def score_hand(hand: list[str], cut_card: str, is_crib: bool = False) -> dict:
    """
    Score a 4-card hand with the cut card.
    Returns breakdown: { fifteens, pairs, runs, flush, nobs, total }
    """
    all_cards = hand + [cut_card]

    fifteens = count_fifteens(all_cards)
    pairs = count_pairs(all_cards)
    runs = count_runs(all_cards)
    flush = count_flush(hand, cut_card, is_crib)
    nobs = count_nobs(hand, cut_card)

    return {
        "fifteens": fifteens * 2,
        "pairs": pairs * 2,
        "runs": runs,
        "flush": flush,
        "nobs": nobs,
        "total": fifteens * 2 + pairs * 2 + runs + flush + nobs,
    }


def count_fifteens(cards: list[str]) -> int:
    """Count combinations summing to 15"""
    count = 0
    values = [card_value(c) for c in cards]
    for r in range(2, 6):
        for combo in combinations(values, r):
            if sum(combo) == 15:
                count += 1
    return count


def count_pairs(cards: list[str]) -> int:
    """Count pairs (each pair = 1 counted, worth 2 points)"""
    ranks = [c[0] for c in cards]
    counter = Counter(ranks)
    pairs = 0
    for count in counter.values():
        # n cards of same rank = n*(n-1)/2 pairs
        pairs += count * (count - 1) // 2
    return pairs


def count_runs(cards: list[str]) -> int:
    """
    Count runs (3+ consecutive ranks).
    Handles duplicate cards creating multiple runs.
    """
    ranks = [card_rank_order(c) for c in cards]
    rank_counts = Counter(ranks)

    # Find all unique ranks present
    unique_ranks = sorted(rank_counts.keys())

    best_run_points = 0

    # Try to find runs starting from each rank
    for start_idx in range(len(unique_ranks)):
        # Find the longest consecutive sequence from this start
        run_length = 1
        multiplier = rank_counts[unique_ranks[start_idx]]

        for i in range(start_idx + 1, len(unique_ranks)):
            if unique_ranks[i] == unique_ranks[i - 1] + 1:
                run_length += 1
                multiplier *= rank_counts[unique_ranks[i]]
            else:
                break

        if run_length >= 3:
            points = run_length * multiplier
            best_run_points = max(best_run_points, points)

    return best_run_points


def count_flush(hand: list[str], cut: str, is_crib: bool) -> int:
    """
    4-card flush = 4 pts, 5-card = 5 pts
    Crib requires 5-card flush (all same suit including cut)
    """
    suits = [c[1] for c in hand]
    if len(set(suits)) == 1:
        if cut[1] == suits[0]:
            return 5
        if not is_crib:
            return 4
    return 0


def count_nobs(hand: list[str], cut: str) -> int:
    """Jack of cut suit = 1 point (nobs/one for his nob)"""
    cut_suit = cut[1]
    for card in hand:
        if card[0] == "J" and card[1] == cut_suit:
            return 1
    return 0


def check_his_heels(cut_card: str) -> int:
    """If cut card is a Jack, dealer gets 2 points (his heels)"""
    if cut_card[0] == "J":
        return 2
    return 0
