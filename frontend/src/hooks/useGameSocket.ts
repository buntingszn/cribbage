import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export interface PlayerState {
  id: string;
  name: string;
  seat: number;
  score: number;
  connected: boolean;
}

export interface PegPlay {
  player_seat: number;
  card: string;
  points: number;
  breakdown: string[];
}

export interface ScoreResult {
  player_seat: number;
  player_name: string;
  cards: string[];
  score: { fifteens: number; pairs: number; runs: number; flush: number; nobs: number; total: number };
  new_total: number;
  is_crib?: boolean;
}

export interface GameState {
  code: string;
  status: string;
  phase: string;
  player_count: number;
  current_dealer_seat: number;
  current_turn_seat: number | null;
  peg_count: number;
  cut_card: string | null;
  players: PlayerState[];
  pegHistory: PegPlay[];
  scoringResults: ScoreResult[];
  winner?: { seat: number; name: string };
  // Track total cards played per seat (doesn't reset on 31)
  cardsPlayedPerSeat: Record<number, number>;
}

export interface LocalPlayerState {
  hand: string[];
  seat: number;
  id: string;
  validPlays: string[];
}

interface GameSocketContextValue {
  gameState: GameState | null;
  playerState: LocalPlayerState | null;
  connected: boolean;
  send: (message: object) => void;
  error: string | null;
}

export const GameSocketContext = createContext<GameSocketContextValue | null>(null);

export function useGameSocketConnection(
  gameCode: string,
  sessionToken: string
): GameSocketContextValue {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerState, setPlayerState] = useState<LocalPlayerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/${gameCode}?session_token=${sessionToken}`
    );

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setConnected(false);
      // Attempt reconnect after 2 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = () => {
      setError("Connection error");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    wsRef.current = ws;
  }, [gameCode, sessionToken]);

  const handleMessage = useCallback((msg: Record<string, unknown>) => {
    switch (msg.type) {
      case "state_sync": {
        const gameData = msg.game as Record<string, unknown>;
        const players = (gameData.players as Array<{seat: number}>) || [];
        // Initialize cards played tracking - 0 for all seats
        const cardsPlayedPerSeat: Record<number, number> = {};
        players.forEach(p => { cardsPlayedPerSeat[p.seat] = 0; });
        setGameState({
          ...gameData as Omit<GameState, 'pegHistory' | 'scoringResults' | 'cardsPlayedPerSeat'>,
          pegHistory: [],
          scoringResults: [],
          cardsPlayedPerSeat,
        } as GameState);
        setPlayerState({
          hand: msg.your_hand as string[],
          seat: msg.your_seat as number,
          id: msg.your_id as string,
          validPlays: [],
        });
        break;
      }

      case "your_hand":
        setPlayerState((prev) =>
          prev ? { ...prev, hand: msg.cards as string[] } : null
        );
        break;

      case "hand_updated":
        setPlayerState((prev) =>
          prev ? { ...prev, hand: msg.cards as string[] } : null
        );
        break;

      case "valid_plays":
        setPlayerState((prev) =>
          prev ? { ...prev, validPlays: msg.cards as string[] } : null
        );
        break;

      case "phase_change":
        setGameState((prev) => {
          if (!prev) return null;
          const newPhase = msg.phase as string;
          // Reset card counts when entering discard phase (new round)
          const resetCardCounts = newPhase === "discard";
          const cardsPlayedPerSeat = resetCardCounts
            ? Object.fromEntries(prev.players.map(p => [p.seat, 0]))
            : prev.cardsPlayedPerSeat;
          return {
            ...prev,
            phase: newPhase,
            current_turn_seat: (msg.turn_seat as number) ?? null,
            current_dealer_seat: msg.dealer_seat as number,
            // Reset peg history when phase changes away from pegging
            pegHistory: newPhase === "pegging" ? prev.pegHistory : [],
            peg_count: newPhase === "pegging" ? prev.peg_count : 0,
            cardsPlayedPerSeat,
            // Clear scoring results on new round
            scoringResults: resetCardCounts ? [] : prev.scoringResults,
          };
        });
        break;

      case "player_status": {
        const seat = msg.seat as number;
        const isConnected = msg.connected as boolean;
        setGameState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: prev.players.map((p) =>
              p.seat === seat ? { ...p, connected: isConnected } : p
            ),
          };
        });
        break;
      }

      case "cut_card":
        setGameState((prev) =>
          prev ? { ...prev, cut_card: msg.card as string } : null
        );
        break;

      case "peg_play": {
        const play: PegPlay = {
          player_seat: msg.player_seat as number,
          card: msg.card as string,
          points: msg.points as number,
          breakdown: msg.breakdown as string[],
        };
        setGameState((prev) => {
          if (!prev) return null;
          const newCount = msg.count as number;
          // Increment cards played for this player (never resets during a round)
          const cardsPlayedPerSeat = {
            ...prev.cardsPlayedPerSeat,
            [play.player_seat]: (prev.cardsPlayedPerSeat[play.player_seat] || 0) + 1,
          };
          return {
            ...prev,
            peg_count: newCount,
            pegHistory: newCount === 0 ? [play] : [...prev.pegHistory, play],
            cardsPlayedPerSeat,
            players: prev.players.map((p) =>
              p.seat === play.player_seat
                ? { ...p, score: p.score + play.points }
                : p
            ),
          };
        });
        // Remove the played card from our hand
        setPlayerState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            hand: prev.hand.filter((c) => c !== play.card),
            validPlays: [],
          };
        });
        break;
      }

      case "peg_go":
        // Just a notification, no state change needed
        break;

      case "hand_scored":
      case "crib_scored": {
        const result: ScoreResult = {
          player_seat: msg.player_seat as number,
          player_name: msg.player_name as string,
          cards: msg.cards as string[],
          score: msg.score as ScoreResult["score"],
          new_total: msg.new_total as number,
          is_crib: msg.type === "crib_scored",
        };
        setGameState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            scoringResults: [...prev.scoringResults, result],
            players: prev.players.map((p) =>
              p.seat === result.player_seat
                ? { ...p, score: result.new_total }
                : p
            ),
          };
        });
        break;
      }

      case "game_over":
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                status: "finished",
                winner: {
                  seat: msg.winner_seat as number,
                  name: msg.winner_name as string,
                },
              }
            : null
        );
        break;

      case "error":
        setError(msg.message as string);
        break;
    }
  }, []);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { gameState, playerState, connected, send, error };
}

export function useGameSocket(): GameSocketContextValue {
  const context = useContext(GameSocketContext);
  if (!context) {
    throw new Error("useGameSocket must be used within GameSocketProvider");
  }
  return context;
}
