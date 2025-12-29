import Card from "./Card";

interface PegPlay {
  player_seat: number;
  card: string;
  points: number;
  breakdown: string[];
}

interface PeggingAreaProps {
  pegHistory: PegPlay[];
  pegCount: number;
  players: Array<{ name: string; seat: number }>;
}

export default function PeggingArea({
  pegHistory,
  pegCount,
  players,
}: PeggingAreaProps) {
  const getPlayerName = (seat: number) =>
    players.find((p) => p.seat === seat)?.name || `Player ${seat + 1}`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Count display */}
      <div className="text-center">
        <div className="text-5xl font-bold text-white">{pegCount}</div>
        <div className="text-sm text-slate-400">Count</div>
      </div>

      {/* Played cards */}
      <div className="flex justify-center gap-2 flex-wrap max-w-md">
        {pegHistory.map((play, index) => (
          <div key={index} className="relative">
            <Card card={play.card} size="sm" />
            {play.points > 0 && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                +{play.points}
              </div>
            )}
            <div className="text-xs text-slate-400 text-center mt-1 truncate w-12">
              {getPlayerName(play.player_seat).split(" ")[0]}
            </div>
          </div>
        ))}
      </div>

      {pegHistory.length === 0 && (
        <div className="text-slate-500 text-sm">No cards played yet</div>
      )}
    </div>
  );
}
