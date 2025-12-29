import Card from "./Card";

interface PlayerHandProps {
  cards: string[];
  selectedCards: string[];
  validPlays?: string[];
  onCardClick: (card: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function PlayerHand({
  cards,
  selectedCards,
  validPlays,
  onCardClick,
  disabled = false,
  size = "lg",
}: PlayerHandProps) {
  return (
    <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
      {cards.map((card) => (
        <Card
          key={card}
          card={card}
          selected={selectedCards.includes(card)}
          disabled={
            disabled || (validPlays !== undefined && !validPlays.includes(card))
          }
          onClick={() => onCardClick(card)}
          size={size}
        />
      ))}
    </div>
  );
}
