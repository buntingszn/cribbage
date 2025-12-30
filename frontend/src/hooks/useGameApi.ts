import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE = "/api";

interface CreateGameData {
  player_count: number;
  player_name: string;
}

interface JoinGameData {
  gameCode: string;
  playerName: string;
}

interface GameResponse {
  game_id: string;
  game_code: string;
  session_token: string;
  seat: number;
}

interface PlayerInfo {
  name: string;
  seat: number;
  connected: boolean;
  score: number;
}

interface GameInfo {
  code: string;
  status: string;
  player_count: number;
  current_players: number;
  players: PlayerInfo[];
  current_phase: string;
  current_dealer_seat: number;
}

export function useCreateGame() {
  return useMutation({
    mutationFn: async (data: CreateGameData): Promise<GameResponse> => {
      const res = await fetch(`${API_BASE}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create game");
      }
      return res.json();
    },
  });
}

export function useJoinGame() {
  return useMutation({
    mutationFn: async ({ gameCode, playerName }: JoinGameData): Promise<GameResponse> => {
      const res = await fetch(`${API_BASE}/games/${gameCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to join game");
      }
      return res.json();
    },
  });
}

export function useGameInfo(gameCode: string | undefined) {
  return useQuery<GameInfo>({
    queryKey: ["game", gameCode],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/games/${gameCode}`);
      if (!res.ok) {
        throw new Error("Game not found");
      }
      return res.json();
    },
    enabled: !!gameCode,
    refetchInterval: 2000,
  });
}

export function saveSession(gameCode: string, sessionToken: string) {
  localStorage.setItem(`cribbage_${gameCode}`, sessionToken);
}

export function getSession(gameCode: string): string | null {
  return localStorage.getItem(`cribbage_${gameCode}`);
}

export function clearSession(gameCode: string) {
  localStorage.removeItem(`cribbage_${gameCode}`);
}

export function getAllSessions(): { gameCode: string; token: string }[] {
  const sessions: { gameCode: string; token: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("cribbage_")) {
      const gameCode = key.replace("cribbage_", "");
      const token = localStorage.getItem(key);
      if (token) {
        sessions.push({ gameCode, token });
      }
    }
  }
  return sessions;
}

interface ActiveGameInfo {
  code: string;
  status: string;
  player_count: number;
  current_players: number;
  your_name: string;
  your_seat: number;
  current_phase: string;
  updated_at: string;
}

export function useActiveGames() {
  return useQuery<ActiveGameInfo[]>({
    queryKey: ["activeGames"],
    queryFn: async () => {
      const sessions = getAllSessions();
      if (sessions.length === 0) return [];

      const res = await fetch(`${API_BASE}/games/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_tokens: sessions.map((s) => s.token),
        }),
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });
}
