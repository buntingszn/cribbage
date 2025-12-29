import Card from "./Card";

interface OpponentHandProps {
  cardCount: number;
  playerName: string;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  connected?: boolean;
  score?: number;
}

export default function OpponentHand({
  cardCount,
  playerName,
  isDealer = false,
  isCurrentTurn = false,
  connected = true,
  score = 0,
}: OpponentHandProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`font-medium ${connected ? "text-white" : "text-slate-500"}`}
        >
          {playerName}
        </span>
        {isDealer && (
          <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
            Dealer
          </span>
        )}
        {isCurrentTurn && (
          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full animate-pulse">
            Playing
          </span>
        )}
        {!connected && (
          <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
            Disconnected
          </span>
        )}
      </div>

      <div className="flex justify-center -space-x-8">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card key={i} card="Xh" faceDown size="sm" />
        ))}
      </div>

      <span className="text-sm text-slate-400">{score} pts</span>
    </div>
  );
}
