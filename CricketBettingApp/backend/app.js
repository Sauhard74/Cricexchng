const express = require("express");
const cors = require("cors");
const http = require('http');
const WebSocket = require('ws');
const connectDB = require("./config/db");
const { initOddsCronJob } = require("./services/cronService");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Function to broadcast odds updates to all connected clients
const broadcastOddsUpdate = (odds) => {
  const oddsData = odds.map(odd => ({
    matchId: odd.matchId,
    homeTeam: odd.homeTeam,
    awayTeam: odd.awayTeam,
    homeOdds: odd.homeOdds,
    awayOdds: odd.awayOdds,
    bookmaker: odd.bookmaker
  }));
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'ODDS_UPDATE',
        data: oddsData
      }));
    }
  });
};

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Initialize cron job for odds fetching
initOddsCronJob(broadcastOddsUpdate);

// API Routes
const matchRoutes = require("./routes/matchRoutes");
const betRoutes = require("./routes/betRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const debugRoutes = require("./routes/debugRoutes");

app.use("/api", matchRoutes);
app.use("/api/bet", betRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/debug", debugRoutes);

// Simple test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
