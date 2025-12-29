import { Trophy } from "lucide-react";

interface Player {
  name: string;
  seat: number;
  score: number;
}

interface GameOverOverlayProps {
  winner: { seat: number; name: string };
  players: Player[];
  onPlayAgain: () => void;
}

export default function GameOverOverlay({
  winner,
  players,
  onPlayAgain,
}: GameOverOverlayProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const losingScore = sortedPlayers[sortedPlayers.length - 1]?.score || 0;

  // Determine if it's a skunk (loser didn't pass 91) or double skunk (didn't pass 61)
  let skunkStatus = "";
  if (losingScore < 61) {
    skunkStatus = "Double Skunk!";
  } else if (losingScore < 91) {
    skunkStatus = "Skunk!";
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center">
        <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />

        <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>

        <p className="text-xl text-green-400 mb-2">{winner.name} wins!</p>

        {skunkStatus && (
          <p className="text-amber-500 font-bold text-lg mb-4">{skunkStatus}</p>
        )}

        <div className="bg-slate-900 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            Final Scores
          </h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.seat}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  index === 0 ? "bg-amber-900/30" : "bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {index === 0 && <Trophy className="w-4 h-4 text-amber-400" />}
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                <span className="text-white font-mono text-lg">
                  {player.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
