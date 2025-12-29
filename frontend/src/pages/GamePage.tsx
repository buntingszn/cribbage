import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, Check, Share2 } from "lucide-react";
import {
  useGameSocketConnection,
  GameSocketContext,
  GameState,
  LocalPlayerState,
} from "../hooks/useGameSocket";
import { getSession } from "../hooks/useGameApi";
import PlayerHand from "../components/PlayerHand";
import OpponentHand from "../components/OpponentHand";
import CutCard from "../components/CutCard";
import ScoreBoard from "../components/ScoreBoard";
import PeggingArea from "../components/PeggingArea";
import ScoringOverlay from "../components/ScoringOverlay";
import GameOverOverlay from "../components/GameOverOverlay";

export default function GamePage() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const sessionToken = gameCode ? getSession(gameCode) : null;

  if (!gameCode) {
    navigate("/");
    return null;
  }

  if (!sessionToken) {
    navigate(`/?join=${gameCode}`);
    return null;
  }

  return (
    <GameSocketContext.Provider
      value={useGameSocketConnection(gameCode, sessionToken)}
    >
      <GameContent gameCode={gameCode} />
    </GameSocketContext.Provider>
  );
}

function GameContent({ gameCode }: { gameCode: string }) {
  const { gameState, playerState, connected, send, error } =
    useGameSocketConnection(gameCode, getSession(gameCode)!);

  if (!gameState || !playerState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Connecting to game...</p>
          {!connected && (
            <p className="text-yellow-500 text-sm mt-2">Reconnecting...</p>
          )}
        </div>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return <LobbyView gameCode={gameCode} gameState={gameState} send={send} />;
  }

  return (
    <GameView
      gameState={gameState}
      playerState={playerState}
      send={send}
      error={error}
    />
  );
}

interface LobbyViewProps {
  gameCode: string;
  gameState: GameState;
  send: (msg: object) => void;
}

function LobbyView({ gameCode, gameState, send }: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/?join=${gameCode}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join my Cribbage game",
        url: shareUrl,
      });
    } else {
      copyLink();
    }
  };

  const canStart =
    gameState.players.length === gameState.player_count &&
    gameState.players.every((p) => p.connected);

  const handleStart = () => {
    send({ type: "start_game" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          Waiting for Players
        </h1>
        <p className="text-center text-slate-400 mb-8">
          {gameState.players.length} / {gameState.player_count} players joined
        </p>

        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-slate-400 mb-3">
            Share this link:
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            />
            <button
              onClick={copyLink}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-slate-300" />
              )}
            </button>
            {"share" in navigator && (
              <button
                onClick={shareLink}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Players:</h2>
          <div className="space-y-2">
            {gameState.players.map((player) => (
              <div
                key={player.seat}
                className="flex items-center justify-between py-2 px-3 bg-slate-900 rounded-lg"
              >
                <span className="text-white font-medium">{player.name}</span>
                <span
                  className={`text-sm ${
                    player.connected ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {player.connected ? "Ready" : "Connecting..."}
                </span>
              </div>
            ))}
            {Array.from({
              length: gameState.player_count - gameState.players.length,
            }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center py-2 px-3 border-2 border-dashed border-slate-700 rounded-lg"
              >
                <span className="text-slate-500">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {gameState.players[0] && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors"
          >
            {canStart ? "Start Game" : "Waiting for all players..."}
          </button>
        )}
      </div>
    </div>
  );
}

interface GameViewProps {
  gameState: GameState;
  playerState: LocalPlayerState;
  send: (msg: object) => void;
  error: string | null;
}

function GameView({ gameState, playerState, send, error }: GameViewProps) {
  const navigate = useNavigate();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showScoringOverlay, setShowScoringOverlay] = useState(false);

  const myPlayer = gameState.players.find((p) => p.seat === playerState.seat);
  const opponents = gameState.players.filter(
    (p) => p.seat !== playerState.seat
  );

  const isMyTurn = gameState.current_turn_seat === playerState.seat;
  const amDealer = gameState.current_dealer_seat === playerState.seat;

  const discardCount = gameState.player_count === 2 ? 2 : 1;
  const canDiscard =
    gameState.phase === "discard" &&
    selectedCards.length === discardCount &&
    playerState.hand.length > 4;

  const canCut =
    gameState.phase === "cut" && isMyTurn && !gameState.cut_card;

  const canPeg =
    gameState.phase === "pegging" &&
    isMyTurn &&
    playerState.validPlays.length > 0;

  const mustGo =
    gameState.phase === "pegging" &&
    isMyTurn &&
    playerState.validPlays.length === 0 &&
    playerState.hand.length > 0;

  const handleCardClick = (card: string) => {
    if (gameState.phase === "discard" && playerState.hand.length > 4) {
      setSelectedCards((prev) => {
        if (prev.includes(card)) {
          return prev.filter((c) => c !== card);
        }
        if (prev.length < discardCount) {
          return [...prev, card];
        }
        return [...prev.slice(1), card];
      });
    } else if (gameState.phase === "pegging" && isMyTurn) {
      if (playerState.validPlays.includes(card)) {
        send({ type: "peg", card });
      }
    }
  };

  const handleDiscard = () => {
    send({ type: "discard", cards: selectedCards });
    setSelectedCards([]);
  };

  const handleCut = () => {
    send({ type: "cut" });
  };

  const handleGo = () => {
    send({ type: "go" });
  };

  const handlePlayAgain = () => {
    navigate("/");
  };

  // Reset selection when phase changes
  useEffect(() => {
    setSelectedCards([]);
  }, [gameState.phase]);

  // Show scoring overlay when results come in
  useEffect(() => {
    if (gameState.scoringResults.length > 0 && gameState.phase !== "pegging") {
      setShowScoringOverlay(true);
    }
  }, [gameState.scoringResults.length, gameState.phase]);

  // Game over overlay
  if (gameState.status === "finished" && gameState.winner) {
    return (
      <GameOverOverlay
        winner={gameState.winner}
        players={gameState.players.map((p) => ({
          name: p.name,
          seat: p.seat,
          score: p.score,
        }))}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Error display */}
      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 text-center text-sm">
          {error}
        </div>
      )}

      {/* Phase indicator */}
      <div className="bg-slate-800 px-4 py-2 text-center">
        <span className="text-slate-400 text-sm">
          {gameState.phase === "discard" &&
            `Select ${discardCount} card(s) for the crib`}
          {gameState.phase === "cut" &&
            (canCut ? "Tap to cut the deck" : "Waiting for cut...")}
          {gameState.phase === "pegging" &&
            (isMyTurn
              ? canPeg
                ? "Your turn - play a card"
                : "Your turn - say Go"
              : "Waiting for opponent...")}
          {gameState.phase === "hand_scoring" && "Scoring hands..."}
          {gameState.phase === "crib_scoring" && "Scoring crib..."}
        </span>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Opponents area */}
        <div className="flex justify-center gap-8 flex-wrap">
          {opponents.map((opponent) => (
            <OpponentHand
              key={opponent.seat}
              cardCount={
                gameState.phase === "waiting" || gameState.phase === "deal"
                  ? 0
                  : Math.max(0, 4 - (gameState.pegHistory?.filter(p => p.player_seat === opponent.seat).length || 0))
              }
              playerName={opponent.name}
              isDealer={opponent.seat === gameState.current_dealer_seat}
              isCurrentTurn={opponent.seat === gameState.current_turn_seat}
              connected={opponent.connected}
              score={opponent.score}
            />
          ))}
        </div>

        {/* Center area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {gameState.phase === "pegging" ? (
            <PeggingArea
              pegHistory={gameState.pegHistory || []}
              pegCount={gameState.peg_count}
              players={gameState.players}
            />
          ) : (
            <div className="flex items-center gap-8">
              <CutCard
                card={gameState.cut_card}
                canCut={canCut}
                onCut={handleCut}
              />
            </div>
          )}

          {/* Crib indicator */}
          {gameState.phase === "discard" && (
            <div className="text-sm text-slate-400">
              {amDealer
                ? "Your crib"
                : `${gameState.players.find((p) => p.seat === gameState.current_dealer_seat)?.name}'s crib`}
            </div>
          )}
        </div>

        {/* Score board (sidebar on desktop, bottom on mobile) */}
        <div className="lg:absolute lg:right-4 lg:top-20 lg:w-64">
          <ScoreBoard
            players={gameState.players.map((p) => ({
              name: p.name,
              score: p.score,
              seat: p.seat,
            }))}
          />
        </div>

        {/* Player area */}
        <div className="space-y-4">
          {/* Player info */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-white font-medium">{myPlayer?.name}</span>
            {amDealer && (
              <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
                Dealer
              </span>
            )}
            <span className="text-slate-400">({myPlayer?.score} pts)</span>
          </div>

          {/* Player's hand */}
          <PlayerHand
            cards={playerState.hand}
            selectedCards={selectedCards}
            validPlays={
              gameState.phase === "pegging" ? playerState.validPlays : undefined
            }
            onCardClick={handleCardClick}
            disabled={
              gameState.phase !== "discard" &&
              !(gameState.phase === "pegging" && isMyTurn)
            }
          />

          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            {canDiscard && (
              <button
                onClick={handleDiscard}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Send to Crib
              </button>
            )}
            {mustGo && (
              <button
                onClick={handleGo}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                Go
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scoring overlay */}
      {showScoringOverlay && gameState.scoringResults.length > 0 && (
        <ScoringOverlay
          results={gameState.scoringResults}
          onClose={() => setShowScoringOverlay(false)}
        />
      )}
    </div>
  );
}
