# Cribbage

A real-time multiplayer cribbage web application supporting 2-4 players. Each player uses their own device with a private view of their cards. Works on phones, tablets, and desktop browsers.

## Features

- **2, 3, or 4 players** - 4-player mode plays as teams of two
- **Real-time multiplayer** - WebSocket-based instant synchronization
- **Private hands** - Server-authoritative design ensures players only see their own cards
- **Direct link sharing** - Share a URL to invite players (no account required)
- **Reconnection support** - Players can rejoin within 5 minutes if disconnected
- **Full cribbage rules** - Deal, discard, cut, pegging, and scoring phases
- **Mobile responsive** - Touch-friendly card UI that works on all screen sizes
- **Score tracking** - Visual scoreboard with skunk line indicators (61, 91)

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- TanStack React Query for API state
- React Router for navigation

**Backend:**
- FastAPI (Python)
- SQLAlchemy with async SQLite
- WebSockets for real-time communication

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cribbage
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

**Development mode (two terminals):**

Terminal 1 - Start the backend:
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 - Start the frontend dev server:
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

**Production mode:**

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

2. Run the backend (serves the built frontend):
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

Open http://localhost:8000 in your browser.

## How to Play

### Starting a Game

1. Open the app and click "Create New Game"
2. Enter your name and select the number of players (2, 3, or 4)
3. Share the generated link with other players
4. Once all players have joined, click "Start Game"

### Game Flow

1. **Deal** - Cards are automatically dealt (6 cards for 2 players, 5 for 3-4)
2. **Discard** - Select cards to send to the crib (2 cards for 2 players, 1 for 3-4)
3. **Cut** - Non-dealer taps to cut the deck and reveal the starter card
4. **Pegging** - Players alternate playing cards, counting toward 31
5. **Scoring** - Hands and crib are scored automatically
6. **Repeat** - Dealer rotates and a new round begins

### Scoring Reference

| Combination | Points |
|-------------|--------|
| Fifteens (cards summing to 15) | 2 each |
| Pairs | 2 each |
| Three of a kind | 6 |
| Four of a kind | 12 |
| Runs (3+ consecutive) | 1 per card |
| Flush (4 cards same suit) | 4 |
| Flush (5 cards same suit) | 5 |
| Nobs (Jack of cut suit) | 1 |
| His Heels (Jack cut) | 2 (dealer) |

**Pegging bonuses:**
- 15 or 31: 2 points
- Last card: 1 point
- Go: 1 point

### Winning

First player/team to reach **121 points** wins. Skunk lines:
- **Skunk** - Opponent below 91 points
- **Double skunk** - Opponent below 61 points

## Project Structure

```
cribbage/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── database.py             # SQLAlchemy async database setup
│   ├── models.py               # Database models and Pydantic schemas
│   ├── game_logic/
│   │   ├── deck.py             # Deck creation, shuffling, dealing
│   │   ├── scoring.py          # Hand and crib scoring logic
│   │   └── pegging.py          # Pegging phase rules and scoring
│   ├── routers/
│   │   ├── games.py            # REST API endpoints
│   │   └── websocket.py        # WebSocket message handling
│   └── services/
│       ├── game_service.py     # Game state management
│       └── websocket_manager.py # Connection tracking
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Card.tsx        # Playing card display
│   │   │   ├── PlayerHand.tsx  # Interactive hand display
│   │   │   ├── OpponentHand.tsx # Face-down opponent cards
│   │   │   ├── CutCard.tsx     # Starter card display
│   │   │   ├── PeggingArea.tsx # Pegging play area
│   │   │   ├── ScoreBoard.tsx  # Score display
│   │   │   ├── ScoringOverlay.tsx # Score breakdown modal
│   │   │   └── GameOverOverlay.tsx # Winner announcement
│   │   ├── pages/
│   │   │   ├── HomePage.tsx    # Create/join game
│   │   │   └── GamePage.tsx    # Main game interface
│   │   └── hooks/
│   │       ├── useGameApi.ts   # REST API hooks
│   │       └── useGameSocket.ts # WebSocket state management
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── data/                       # SQLite database directory
├── requirements.txt            # Python dependencies
└── README.md
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create a new game |
| POST | `/api/games/{code}/join` | Join an existing game |
| GET | `/api/games/{code}` | Get game info |
| POST | `/api/games/{code}/reconnect` | Reconnect with session token |

### WebSocket Protocol

Connect to `/ws/{game_code}?session_token={token}`

**Client messages:**
- `{ type: "start_game" }` - Start the game (host only)
- `{ type: "discard", cards: ["Ah", "5c"] }` - Discard to crib
- `{ type: "cut" }` - Cut the deck
- `{ type: "peg", card: "7h" }` - Play a card in pegging
- `{ type: "go" }` - Declare "Go"

**Server messages:**
- `state_sync` - Full game state on connect
- `phase_change` - Game phase transition
- `player_status` - Player connect/disconnect
- `cut_card` - Starter card revealed
- `peg_play` - Card played with scoring
- `hand_scored` / `crib_scored` - Scoring results
- `game_over` - Winner announcement

## License

MIT
