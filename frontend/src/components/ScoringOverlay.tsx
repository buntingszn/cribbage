import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { BottomSheet } from './ui/BottomSheet';
import { useHaptics } from '../hooks/useHaptics';
import { useEffect } from 'react';

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
  const { trigger } = useHaptics();

  // Trigger haptic when scoring appears
  useEffect(() => {
    if (results.length > 0) {
      const totalPoints = results.reduce((sum, r) => sum + r.score.total, 0);
      if (totalPoints > 0) {
        trigger('success');
      }
    }
  }, [results, trigger]);

  if (results.length === 0) return null;

  return (
    <BottomSheet
      isOpen={results.length > 0}
      onClose={onClose}
      title="Round Scoring"
      height={0.75}
    >
      <div className="px-4 pb-6">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {results.map((result, index) => (
              <motion.div
                key={`${result.player_seat}-${result.is_crib ? 'crib' : 'hand'}`}
                className="bg-slate-900 rounded-xl p-4"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: index * 0.15,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {result.player_name}
                    </span>
                    {result.is_crib && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        Crib
                      </span>
                    )}
                  </div>
                  <motion.div
                    className="text-2xl font-bold text-green-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 15,
                      delay: index * 0.15 + 0.2,
                    }}
                  >
                    +{result.score.total}
                  </motion.div>
                </div>

                {/* Cards - staggered reveal */}
                <div className="flex justify-center gap-1.5 mb-3">
                  {result.cards.map((card, cardIndex) => (
                    <motion.div
                      key={cardIndex}
                      initial={{ opacity: 0, y: -20, rotateY: 180 }}
                      animate={{ opacity: 1, y: 0, rotateY: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                        delay: index * 0.15 + cardIndex * 0.08,
                      }}
                    >
                      <Card card={card} size="sm" />
                    </motion.div>
                  ))}
                </div>

                {/* Score breakdown with animations */}
                <motion.div
                  className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.15 + 0.4 }}
                >
                  {result.score.fifteens > 0 && (
                    <ScoreRow label="Fifteens" value={result.score.fifteens} />
                  )}
                  {result.score.pairs > 0 && (
                    <ScoreRow label="Pairs" value={result.score.pairs} />
                  )}
                  {result.score.runs > 0 && (
                    <ScoreRow label="Runs" value={result.score.runs} />
                  )}
                  {result.score.flush > 0 && (
                    <ScoreRow label="Flush" value={result.score.flush} />
                  )}
                  {result.score.nobs > 0 && (
                    <ScoreRow label="Nobs" value={result.score.nobs} />
                  )}
                </motion.div>

                {/* New total */}
                <motion.div
                  className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.15 + 0.5 }}
                >
                  <span className="text-slate-400 text-sm">New total</span>
                  <motion.span
                    className="text-white font-bold text-lg"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ delay: index * 0.15 + 0.6 }}
                  >
                    {result.new_total}
                  </motion.span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Continue button */}
        <motion.button
          onClick={onClose}
          className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium transition-colors"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: results.length * 0.15 + 0.3 }}
        >
          Continue
        </motion.button>
      </div>
    </BottomSheet>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
