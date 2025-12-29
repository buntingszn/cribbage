interface ScoreBoardProps {
  players: Array<{
    name: string;
    score: number;
    seat: number;
  }>;
  targetScore?: number;
}

export default function ScoreBoard({
  players,
  targetScore = 121,
}: ScoreBoardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-slate-400 mb-3">Scores</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div key={player.seat} className="flex items-center gap-3">
            <span className="text-white font-medium flex-1 truncate">
              {player.name}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min((player.score / targetScore) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="text-white font-mono w-8 text-right">
                {player.score}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex justify-between text-xs text-slate-500">
          <span>0</span>
          <span>61</span>
          <span>91</span>
          <span>{targetScore}</span>
        </div>
      </div>
    </div>
  );
}
