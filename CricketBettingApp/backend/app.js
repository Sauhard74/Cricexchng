// Load environment variables first, before any other imports
const path = require('path');
const fs = require('fs');

// Try to load .env file if it exists
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  require('dotenv').config({ path: envPath });
} else {
  console.log('No .env file found, using environment variables from system');
  require('dotenv').config();
}

const express = require("express");
const cors = require("cors");
const http = require('http');
const WebSocket = require('ws');
const connectDB = require("./config/db");
const { initOddsCronJob } = require("./services/cronService");

// Log environment variables for debugging (hiding sensitive values)
console.log('Environment Variables Status:');
console.log('- PORT:', process.env.PORT || '5001 (default)');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development (default)');
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set ✓' : 'Not Set ✗');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✓' : 'Not Set ✗');
console.log('- SPORTRADAR_API_KEY:', process.env.SPORTRADAR_API_KEY ? 'Set ✓' : 'Not Set ✗');
console.log('- GOOGLE_CREDENTIALS:', process.env.GOOGLE_CREDENTIALS ? 'Set ✓' : 'Not Set ✗');
console.log('- SPREADSHEET_ID:', process.env.SPREADSHEET_ID ? 'Set ✓' : 'Not Set ✗');

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
