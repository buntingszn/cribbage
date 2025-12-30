import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { useHaptics } from '../hooks/useHaptics';

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
  const { trigger } = useHaptics();
  const [showCelebration, setShowCelebration] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const prevCount = useRef(pegCount);
  const prevHistoryLength = useRef(pegHistory.length);

  const getPlayerName = (seat: number) =>
    players.find((p) => p.seat === seat)?.name || `Player ${seat + 1}`;

  // Detect count reset (31 or Go)
  useEffect(() => {
    // Check for 31
    if (pegCount === 31 && prevCount.current !== 31) {
      setShowCelebration(true);
      trigger('success');
      setTimeout(() => setShowCelebration(false), 1500);
    }

    // Check for reset to 0
    if (pegCount === 0 && prevCount.current > 0) {
      setIsResetting(true);
      setTimeout(() => setIsResetting(false), 500);
    }

    prevCount.current = pegCount;
  }, [pegCount, trigger]);

  // Trigger haptic on new card played
  useEffect(() => {
    if (pegHistory.length > prevHistoryLength.current) {
      const lastPlay = pegHistory[pegHistory.length - 1];
      if (lastPlay && lastPlay.points > 0) {
        trigger('success');
      } else {
        trigger('impact');
      }
    }
    prevHistoryLength.current = pegHistory.length;
  }, [pegHistory, trigger]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Count display */}
      <div className="text-center relative">
        <AnimatePresence mode="wait">
          {showCelebration ? (
            <motion.div
              key="celebration"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-6xl font-bold text-amber-400"
            >
              31!
            </motion.div>
          ) : (
            <motion.div
              key={isResetting ? 'resetting' : pegCount}
              className="text-5xl font-bold text-white"
              initial={isResetting ? { rotateX: 90, opacity: 0 } : { scale: 0.8, opacity: 0 }}
              animate={{ rotateX: 0, scale: 1, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
            >
              {pegCount}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="text-sm text-slate-400"
          animate={{ opacity: showCelebration ? 0 : 1 }}
        >
          Count
        </motion.div>

        {/* Progress to 31 indicator */}
        <div className="mt-2 w-32 mx-auto">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-green-400 rounded-full"
              initial={false}
              animate={{ width: `${Math.min((pegCount / 31) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* Played cards */}
      <motion.div
        className="flex justify-center gap-2 flex-wrap max-w-md"
        role="status"
        aria-live="polite"
        aria-label={`Count is ${pegCount}`}
        layout
      >
        <AnimatePresence mode="popLayout">
          {pegHistory.map((play, index) => (
            <motion.div
              key={`${play.card}-${index}`}
              className="relative"
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              layout
            >
              <Card card={play.card} size="sm" />

              {/* Points badge */}
              <AnimatePresence>
                {play.points > 0 && (
                  <motion.div
                    className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-lg"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 15,
                      delay: 0.1,
                    }}
                  >
                    +{play.points}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player name */}
              <motion.div
                className="text-xs text-slate-400 text-center mt-1 truncate w-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {getPlayerName(play.player_seat).split(' ')[0]}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {pegHistory.length === 0 && (
        <motion.div
          className="text-slate-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Play a card to start pegging
        </motion.div>
      )}

      {/* Celebration particles (optional visual flair) */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-400"
                initial={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / 8) * Math.PI * 2) * 60,
                  y: Math.sin((i / 8) * Math.PI * 2) * 60 - 30,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
