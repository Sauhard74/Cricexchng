const axios = require("axios");
const {fetchMatchDetails} = require("../services/sportsRadarService")
require("dotenv").config();
const router = express.Router();
const API_KEY = process.env.SPORTRADAR_API_KEY;

exports.getMatchesByDate = async (req, res) => {
  const { date } = req.params;
  try {
    const response = await axios.get(
      `https://api.sportradar.com/cricket-t2/en/schedules/${date}/results.json?api_key=${API_KEY}`
    );
    console.log("[API RESPONSE]", response.data); // Debugging Log
    res.json(response.data); // Ensure full response is sent
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
};
// ✅ Route to Fetch Live Matches
router.get("/matches/live", async (req, res) => {
    try {
        console.log(`🟡 [ROUTE HIT] Fetching live matches`);
        const matches = await fetchLiveMatches();
        console.log("✅ [ROUTE SUCCESS] Live matches data sent.");
        res.json(matches);
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to fetch live matches:", error.message);
        res.status(500).json({ error: "Failed to retrieve live matches." });
    }
});

// ✅ API Endpoint: Fetch Match Details by Match ID
router.get("/match/:matchId", async (req, res) => {
    try {
        const { matchId } = req.params;
        console.log(`🟡 [ROUTE HIT] Fetching match details for: ${matchId}`);

        const matchDetails = await fetchMatchDetails(matchId);

        if (!matchDetails) {
            return res.status(404).json({ error: "Match details not found." });
        }

        console.log("✅ [ROUTE SUCCESS] Match details sent.");
        res.json(matchDetails);
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to fetch match details:", error.message);
        res.status(500).json({ error: "Failed to retrieve match details." });
    }
});

module.exports = router;
