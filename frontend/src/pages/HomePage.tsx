import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCreateGame, useJoinGame, useActiveGames, saveSession } from "../hooks/useGameApi";
import { Users, Play, Clock } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get("join");

  const [name, setName] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [joinGameCode, setJoinGameCode] = useState(joinCode || "");
  const [mode, setMode] = useState<"menu" | "create" | "join">(
    joinCode ? "join" : "menu"
  );

  const createGame = useCreateGame();
  const joinGame = useJoinGame();
  const { data: activeGames } = useActiveGames();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createGame.mutateAsync({
        player_count: playerCount,
        player_name: name.trim(),
      });
      saveSession(result.game_code, result.session_token);
      navigate(`/game/${result.game_code}`);
    } catch {
      // Error handled by mutation
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !joinGameCode.trim()) return;

    try {
      const result = await joinGame.mutateAsync({
        gameCode: joinGameCode.trim(),
        playerName: name.trim(),
      });
      saveSession(result.game_code, result.session_token);
      navigate(`/game/${result.game_code}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Cribbage
        </h1>

        {mode === "menu" && (
          <div className="space-y-4">
            {activeGames && activeGames.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-slate-300 mb-3">
                  Your Active Games
                </h2>
                <div className="space-y-2">
                  {activeGames.map((game) => (
                    <button
                      key={game.code}
                      onClick={() => navigate(`/game/${game.code}`)}
                      className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-green-400" />
                            <span className="font-medium text-white">
                              {game.code}
                            </span>
                            <span className="text-sm text-slate-400">
                              ({game.your_name})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {game.current_players}/{game.player_count}
                            </span>
                            <span className="capitalize">
                              {game.status === "waiting"
                                ? "Waiting for players"
                                : game.current_phase}
                            </span>
                          </div>
                        </div>
                        <Clock className="w-4 h-4 text-slate-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setMode("create")}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Create New Game
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Join Existing Game
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Players
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlayerCount(count)}
                    className={`py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                      playerCount === count
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    {count}
                  </button>
                ))}
              </div>
              {playerCount === 4 && (
                <p className="text-sm text-slate-400 mt-2">
                  4 players will play as 2 teams
                </p>
              )}
            </div>

            {createGame.error && (
              <p className="text-red-400 text-sm">
                {createGame.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createGame.isPending}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {createGame.isPending ? "Creating..." : "Create Game"}
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="space-y-6">
            {activeGames && activeGames.length > 0 && (
              <div className="mb-2">
                <h2 className="text-sm font-medium text-slate-400 mb-2">
                  Resume Active Game
                </h2>
                <div className="space-y-2">
                  {activeGames.map((game) => (
                    <button
                      key={game.code}
                      type="button"
                      onClick={() => navigate(`/game/${game.code}`)}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Play className="w-3 h-3 text-green-400" />
                          <span className="font-medium text-white text-sm">
                            {game.code}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({game.your_name})
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {game.current_players}/{game.player_count}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-700 mt-4 pt-4">
                  <p className="text-sm text-slate-400 mb-3">Or join a new game:</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Game Code
              </label>
              <input
                type="text"
                value={joinGameCode}
                onChange={(e) => setJoinGameCode(e.target.value.toUpperCase())}
                placeholder="Enter game code"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                maxLength={8}
              />
            </div>

            {joinGame.error && (
              <p className="text-red-400 text-sm">{joinGame.error.message}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode("menu");
                  setJoinGameCode("");
                }}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={
                  !name.trim() || !joinGameCode.trim() || joinGame.isPending
                }
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {joinGame.isPending ? "Joining..." : "Join Game"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
