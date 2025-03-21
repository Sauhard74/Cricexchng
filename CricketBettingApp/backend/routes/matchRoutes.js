const express = require("express");
const { fetchMatches, fetchMatchDetails, fetchLiveMatches} = require("../services/sportsRadarService");

const Match = require("../models/Match");
const Bet = require("../models/Bet");
const User = require("../models/User");
const Odds = require("../models/Odds");

const router = express.Router();


// ✅ Route to Fetch Only Live Matches with Odds
router.get("/matches/live", async (req, res) => {
    try {
        console.log('🟡 [ROUTE HIT] Fetching live matches with odds');
        
        // Instead, get all odds (which should now be one per match)
        const odds = await Odds.find();
        
        // Map to the format expected by the frontend
        const matches = odds.map(odd => ({
            id: odd.matchId,
            home_team: odd.homeTeam,
            away_team: odd.awayTeam,
            home_odds: odd.homeOdds,
            away_odds: odd.awayOdds,
            bookmaker: odd.bookmaker,
            scheduled: odd.commence,
            status: odd.status,
            lastUpdated: odd.lastUpdated,
            home_team_color: odd.homeTeamColor,
            away_team_color: odd.awayTeamColor
        }));
        
        console.log(`📊 Found ${matches.length} matches with odds`);
        res.json(matches);
    } catch (error) {
        console.error('❌ Error fetching live matches:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


router.get("/matches/:date", async (req, res) => {
    try {
        const { date } = req.params;
        console.log(`🟡 [ROUTE HIT] Fetching matches for date: ${date}`);

        // Get all odds entries
        const oddsEntries = await Odds.find({});
        
        if (oddsEntries.length === 0) {
            console.log('⚠️ No odds data available in database');
            return res.json([]);
        }
        
        // Filter odds entries by date (if commence date is available)
        const matchesForDate = oddsEntries.filter(odds => {
            if (!odds.commence) return true; // Include if no date specified
            
            // Create a date object from the commence time
            const oddsDateObj = new Date(odds.commence);
            
            // Create a date object from the requested date (ensure it's in the same timezone)
            const requestedDate = new Date(date);
            
            // Format both to YYYY-MM-DD in local timezone
            const oddsDateFormatted = oddsDateObj.toLocaleDateString('en-CA'); // en-CA uses YYYY-MM-DD format
            const requestedDateFormatted = requestedDate.toLocaleDateString('en-CA');
            
            // Log for debugging
            console.log(`Match ${odds.matchId}:
              - commence time: ${odds.commence}
              - odds date obj: ${oddsDateObj}
              - formatted odds date: ${oddsDateFormatted}
              - requested date: ${date}
              - formatted requested date: ${requestedDateFormatted}
              - match? ${oddsDateFormatted === requestedDateFormatted}`);
            
            return oddsDateFormatted === requestedDateFormatted;
        });
        
        // Create match objects from odds data
        const matchesWithOdds = matchesForDate.map(odds => ({
            id: odds.matchId,
            home_team: odds.homeTeam,
            away_team: odds.awayTeam,
            league: "Cricket League", // You can customize this
            venue: "TBD",
            scheduled: odds.commence || new Date().toISOString(),
            status: odds.status || "not_started",
            home_odds: odds.homeOdds,
            away_odds: odds.awayOdds,
            bookmaker: odds.bookmaker,
            home_team_color: odds.homeTeamColor,
            away_team_color: odds.awayTeamColor
        }));
        
        // Group by matchId to remove duplicates (from different bookmakers)
        const uniqueMatches = {};
        matchesWithOdds.forEach(match => {
            if (!uniqueMatches[match.id] || 
                new Date(match.scheduled) > new Date(uniqueMatches[match.id].scheduled)) {
                uniqueMatches[match.id] = match;
            }
        });
        
        // Convert back to array
        const finalMatches = Object.values(uniqueMatches);
        
        console.log(`📊 Sending ${finalMatches.length} matches for date ${date}`);
        console.log("✅ [ROUTE SUCCESS] Sending data to frontend.");
        res.json(finalMatches);
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to fetch matches:", error.message);
        res.status(500).json({ error: "Failed to retrieve matches." });
    }
});

// Add this route to get a single match by ID
router.get("/match/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    console.log(`🟡 [ROUTE HIT] Fetching match details for ID: ${matchId}`);
    
    // Get all matches first (for debugging)
    const allMatches = await Odds.find({});
    console.log('Available match IDs:', allMatches.map(m => m.matchId));
    
    // Find the match with exact matchId
    const matchFromOdds = await Odds.findOne({ matchId });
    
    if (!matchFromOdds) {
      console.log(`⚠️ No match found with ID: ${matchId}`);
      return res.status(404).json({ 
        error: "Match not found",
        searchedId: matchId,
        availableIds: allMatches.map(m => m.matchId)
      });
    }
    
    // Create a match object from the odds data
    const matchDetails = {
      id: matchFromOdds.matchId,
      home_team: matchFromOdds.homeTeam,
      away_team: matchFromOdds.awayTeam,
      league: "Cricket League",
      venue: "TBD",
      scheduled: matchFromOdds.commence || new Date().toISOString(),
      status: matchFromOdds.status || "not_started",
      home_odds: matchFromOdds.homeOdds,
      away_odds: matchFromOdds.awayOdds,
      bookmaker: matchFromOdds.bookmaker,
      home_team_color: matchFromOdds.homeTeamColor,
      away_team_color: matchFromOdds.awayTeamColor
    };
    
    console.log("✅ [ROUTE SUCCESS] Match details sent:", matchDetails);
    res.json(matchDetails);
  } catch (error) {
    console.error("❌ [ROUTE ERROR] Failed to fetch match details:", error.message);
    res.status(500).json({ error: "Failed to retrieve match details" });
  }
});

// ✅ New endpoint for live scores
router.get("/match/:matchId/livescores", async (req, res) => {
  try {
    const { matchId } = req.params;
    console.log(`🟡 [ROUTE HIT] Fetching live scores for match ID: ${matchId}`);
    
    // Find the match with exact matchId
    const matchFromOdds = await Odds.findOne({ matchId });
    
    if (!matchFromOdds) {
      console.log(`⚠️ No match found with ID: ${matchId}`);
      return res.status(404).json({ error: "Match not found" });
    }
    
    // Check if we have a match in the match collection (for more detailed data)
    const matchDetail = await Match.findOne({ matchId }) || {};
    
    // Combine data from both collections
    const currentInningsNumber = matchDetail.currentInnings || 1;
    const battingTeam = currentInningsNumber % 2 === 1 ? matchFromOdds.homeTeam : matchFromOdds.awayTeam;
    const bowlingTeam = currentInningsNumber % 2 === 1 ? matchFromOdds.awayTeam : matchFromOdds.homeTeam;
    
    // Create mock batsmen if not available from DB
    const currentBatsmen = matchDetail.currentBatsmen || [
      {
        name: `${battingTeam} Batsman 1`,
        runs: Math.floor(Math.random() * 60),
        balls_faced: Math.floor(Math.random() * 40) + 10,
        fours: Math.floor(Math.random() * 5),
        sixes: Math.floor(Math.random() * 3),
        strike_rate: (Math.random() * 50 + 100).toFixed(2),
        on_strike: true
      },
      {
        name: `${battingTeam} Batsman 2`,
        runs: Math.floor(Math.random() * 30),
        balls_faced: Math.floor(Math.random() * 30) + 5,
        fours: Math.floor(Math.random() * 3),
        sixes: Math.floor(Math.random() * 2),
        strike_rate: (Math.random() * 50 + 100).toFixed(2),
        on_strike: false
      }
    ];
    
    // Create mock bowler if not available from DB
    const currentBowler = matchDetail.currentBowler || {
      name: `${bowlingTeam} Bowler`,
      overs: `${Math.floor(Math.random() * 4)}.${Math.floor(Math.random() * 6)}`,
      maidens: Math.floor(Math.random() * 2),
      runs_conceded: Math.floor(Math.random() * 30),
      wickets: Math.floor(Math.random() * 3),
      economy: (Math.random() * 4 + 5).toFixed(2)
    };
    
    // Generate mock recent overs
    const recentOvers = matchDetail.recentOvers || generateMockRecentOvers(5);
    
    // Mock match stats
    const matchStats = {
      run_rate: (Math.random() * 3 + 6).toFixed(2),
      last_wicket: `${battingTeam} Batsman 3 (21 runs)`,
      last_five_overs: `${Math.floor(Math.random() * 20 + 30)} runs, ${Math.floor(Math.random() * 2)} wickets`,
      extras: Math.floor(Math.random() * 10)
    };
    
    // Build the response object
    const liveScoresData = {
      home_score: matchFromOdds.homeScore || `${Math.floor(Math.random() * 150 + 100)}/${Math.floor(Math.random() * 5)}`,
      away_score: matchFromOdds.awayScore || `${Math.floor(Math.random() * 150 + 100)}/${Math.floor(Math.random() * 5)}`,
      current_innings: currentInningsNumber,
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      current_over: `${Math.floor(Math.random() * 15 + 5)}.${Math.floor(Math.random() * 6)}`,
      current_batsmen: currentBatsmen,
      current_bowler: currentBowler,
      recent_overs: recentOvers,
      match_stats: matchStats
    };
    
    console.log("✅ [ROUTE SUCCESS] Live scores sent for match:", matchId);
    res.json(liveScoresData);
  } catch (error) {
    console.error("❌ [ROUTE ERROR] Failed to fetch live scores:", error.message);
    res.status(500).json({ error: "Failed to retrieve live scores" });
  }
});

// Helper function to generate mock recent overs
function generateMockRecentOvers(numberOfOvers) {
  const overs = [];
  const possibleBallResults = [0, 1, 2, 3, 4, 6, 'W'];
  
  for (let i = 1; i <= numberOfOvers; i++) {
    const balls = [];
    let overRuns = 0;
    
    for (let j = 0; j < 6; j++) {
      const ballResult = possibleBallResults[Math.floor(Math.random() * possibleBallResults.length)];
      balls.push({ runs: ballResult });
      
      if (ballResult !== 'W') {
        overRuns += typeof ballResult === 'number' ? ballResult : 0;
      }
    }
    
    overs.push({
      over_number: i,
      balls: balls,
      runs: overRuns
    });
  }
  
  return overs;
}

// ✅ Save Match to Database (Admin)
router.post("/matches/save", async (req, res) => {
    try {
        const { matchId, team1, team2, scheduled, status } = req.body;

        // ✅ Validate scheduled field
        if (!scheduled || isNaN(Date.parse(scheduled))) {
            return res.status(400).json({ error: "Invalid or missing scheduled date" });
        }

        const existingMatch = await Match.findOne({ matchId });
        if (existingMatch) return res.status(400).json({ error: "Match already exists in DB" });

        const match = new Match({
            matchId,
            team1,
            team2,
            scheduled: new Date(scheduled), // ✅ Convert to Date object
            status
        });
        await match.save();

        res.json({ message: "Match saved successfully", match });
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to save match:", error.message);
        res.status(500).json({ error: "Failed to save match" });
    }
});


// ✅ Fetch All Matches (Past & Live)
router.get("/matches/all", async (req, res) => {
    try {
        const matches = await Match.find();
        res.json({ matches });
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to fetch matches:", error.message);
        res.status(500).json({ error: "Failed to retrieve matches." });
    }
});

// ✅ Fetch All Bets on a Match
router.get("/matches/:matchId/bets", async (req, res) => {
    try {
        const { matchId } = req.params;
        const bets = await Bet.find({ matchId });
        res.json(bets);
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to fetch bets:", error.message);
        res.status(500).json({ error: "Failed to retrieve bets." });
    }
});

// ✅ Update Match Result & Settle Bets (Admin)
router.post("/matches/update-result", async (req, res) => {
    try {
        const { matchId, winner } = req.body;

        const match = await Match.findOne({ matchId });
        if (!match) return res.status(404).json({ error: "Match not found" });

        match.status = "completed";
        match.winner = winner;
        await match.save();

        // ✅ Settle Bets
        const bets = await Bet.find({ matchId });
        for (const bet of bets) {
            if (bet.team === winner) {
                const user = await User.findOne({ username: bet.username });
                user.credits += bet.amount * 2; // Winning amount
                await user.save();
                bet.status = "won";
            } else {
                bet.status = "lost";
            }
            await bet.save();
        }

        res.json({ message: "Match result updated. Bets settled.", betsUpdated: bets.length });
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Failed to update match result:", error.message);
        res.status(500).json({ error: "Failed to update match result." });
    }
});

// ✅ Manual trigger for odds update
router.get("/admin/update-odds", async (req, res) => {
    try {
        console.log(`🟡 [ROUTE HIT] Manual odds update triggered`);
        
        const { fetchOddsFromSheet } = require('../services/googleSheetsService');
        const oddsData = await fetchOddsFromSheet();
        
        if (oddsData.length === 0) {
            return res.json({ 
                success: false, 
                message: "No odds data fetched from sheet. Check server logs for details." 
            });
        }
        
        // Update database
        const Odds = require('../models/Odds');
        const Match = require('../models/Match');
        
        // Clear existing odds for testing
        await Odds.deleteMany({});
        
        // Insert new odds
        for (const odds of oddsData) {
            await Odds.create(odds);
            
            // Create match if needed
            const matchExists = await Match.findOne({ matchId: odds.matchId });
            if (!matchExists) {
                await Match.create({
                    matchId: odds.matchId,
                    team1: odds.homeTeam,
                    team2: odds.awayTeam,
                    scheduled: new Date(),
                    status: "scheduled"
                });
            }
        }
        
        res.json({ 
            success: true, 
            message: `Updated odds for ${oddsData.length} matches`,
            sample: oddsData.slice(0, 3)
        });
    } catch (error) {
        console.error("❌ [ROUTE ERROR] Manual odds update failed:", error.message);
        res.status(500).json({ error: "Failed to update odds." });
    }
});

// ✅ Debug route to check odds data
router.get("/debug/odds", async (req, res) => {
  try {
    console.log("🔍 [DEBUG] Checking all odds in database");
    
    // Get all odds entries
    const allOdds = await Odds.find({}).lean();
    
    if (!allOdds || allOdds.length === 0) {
      return res.json({
        message: "No odds found in database",
        count: 0
      });
    }
    
    res.json({
      message: "Found odds in database",
      count: allOdds.length,
      odds: allOdds.map(odd => ({
        matchId: odd.matchId,
        homeTeam: odd.homeTeam,
        awayTeam: odd.awayTeam,
        homeOdds: odd.homeOdds,
        awayOdds: odd.awayOdds
      }))
    });
  } catch (error) {
    console.error("❌ [DEBUG ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add this debug route at the top of your routes
router.get("/debug/odds-direct", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Directly checking odds data");
        
        // Get all odds entries directly from the database
        const oddsEntries = await Odds.find({}).lean();
        
        if (!oddsEntries || oddsEntries.length === 0) {
            console.log("⚠️ No odds data found in database");
            return res.json({ 
                success: false, 
                message: "No odds data found in database",
                oddsCount: 0
            });
        }
        
        console.log(`✅ Found ${oddsEntries.length} odds entries in database`);
        
        // Return a simplified response
        res.json({
            success: true,
            oddsCount: oddsEntries.length,
            sampleData: oddsEntries.slice(0, 3)
        });
    } catch (error) {
        console.error("❌ [DEBUG ERROR]:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

// Route for betting details
router.get("/betting/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { bookmaker } = req.query;
    
    console.log(`🟡 [ROUTE HIT] Fetching betting details for ID: ${matchId}, preferred bookmaker: ${bookmaker}`);
    
    // Instead, just get the odds for this match (should be only one entry)
    const odds = await Odds.findOne({ matchId });
    
    if (!odds) {
      return res.status(404).json({ error: 'Match odds not found' });
    }
    
    // Get the match details
    const match = await Match.findOne({ matchId });
    
    // Return combined data
    res.json({
      id: odds.matchId,
      home_team: odds.homeTeam,
      away_team: odds.awayTeam,
      home_odds: odds.homeOdds,
      away_odds: odds.awayOdds,
      bookmaker: odds.bookmaker,
      scheduled: odds.commence,
      status: odds.status || match?.status,
      venue: match?.venue || 'TBD',
      lastUpdated: odds.lastUpdated
    });
  } catch (error) {
    console.error('❌ Error fetching match odds:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/live', async (req, res) => {
  try {
    const matches = await Match.find().sort({ scheduled: 1 });
    const matchesWithOdds = await Promise.all(matches.map(async (match) => {
      // Get all odds for this match, sorted by lastUpdated
      const allOdds = await Odds.find({ 
        matchId: match.matchId
      }).sort({ lastUpdated: -1 });

      if (!allOdds || allOdds.length === 0) {
        console.log(`No odds found for match: ${match.matchId}`);
        return null;
      }

      // Just use the first available odds (most recently updated)
      const odds = allOdds[0];

      return {
        id: match.matchId,
        home_team: match.team1,
        away_team: match.team2,
        scheduled: match.scheduled,
        status: match.status,
        home_odds: odds.homeOdds,
        away_odds: odds.awayOdds,
        bookmaker: odds.bookmaker
      };
    }));

    // Filter out matches without odds
    const validMatches = matchesWithOdds.filter(match => match !== null);
    console.log(`📊 Found ${validMatches.length} matches with odds`);
    res.json(validMatches);
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

module.exports = router;