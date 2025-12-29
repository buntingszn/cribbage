import Card from "./Card";

interface ScoreResult {
  player_seat: number;
  player_name: string;
  cards: string[];
  score: {
    fifteens: number;
    pairs: number;
    runs: number;
    flush: number;
    nobs: number;
    total: number;
  };
  new_total: number;
  is_crib?: boolean;
}

interface ScoringOverlayProps {
  results: ScoreResult[];
  onClose: () => void;
}

export default function ScoringOverlay({
  results,
  onClose,
}: ScoringOverlayProps) {
  if (results.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Round Scoring
        </h2>

        <div className="space-y-6">
          {results.map((result, index) => (
            <div
              key={index}
              className="bg-slate-900 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">
                  {result.player_name}
                  {result.is_crib && (
                    <span className="text-amber-500 ml-2">(Crib)</span>
                  )}
                </span>
                <span className="text-2xl font-bold text-green-400">
                  +{result.score.total}
                </span>
              </div>

              {/* Cards */}
              <div className="flex justify-center gap-1 mb-3">
                {result.cards.map((card, i) => (
                  <Card key={i} card={card} size="sm" />
                ))}
              </div>

              {/* Score breakdown */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.score.fifteens > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fifteens:</span>
                    <span className="text-white">{result.score.fifteens}</span>
                  </div>
                )}
                {result.score.pairs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pairs:</span>
                    <span className="text-white">{result.score.pairs}</span>
                  </div>
                )}
                {result.score.runs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runs:</span>
                    <span className="text-white">{result.score.runs}</span>
                  </div>
                )}
                {result.score.flush > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flush:</span>
                    <span className="text-white">{result.score.flush}</span>
                  </div>
                )}
                {result.score.nobs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nobs:</span>
                    <span className="text-white">{result.score.nobs}</span>
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-700 text-right">
                <span className="text-slate-400 text-sm">
                  New total: {result.new_total}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
