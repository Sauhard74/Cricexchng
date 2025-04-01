const express = require("express");
const { fetchMatches, fetchMatchDetails, fetchLiveMatches} = require("../services/sportsRadarService");

const Match = require("../models/Match");
const Bet = require("../models/Bet");
const User = require("../models/User");
const Odds = require("../models/Odds");
const MatchMapping = require("../models/MatchMapping");

const router = express.Router();

// Helper function to find Sportradar match ID
async function findSportradarMatchId(oddsMatchId) {
    try {
        const mapping = await MatchMapping.findOne({ oddsMatchId });
        if (mapping) {
            return mapping.sportradarMatchId;
        }
        
        // If no mapping found, try to find by teams and date
        const odds = await Odds.findOne({ matchId: oddsMatchId });
        if (!odds) return null;
        
        // Get matches from Sportradar for the same date
        const matchDate = new Date(odds.commence);
        const dateStr = matchDate.toISOString().split('T')[0];
        const sportradarMatches = await fetchMatches(dateStr);
        
        // Find matching match by teams
        const matchingMatch = sportradarMatches.find(match => {
            const teamsMatch = (
                (match.home_team === odds.homeTeam && match.away_team === odds.awayTeam) ||
                (match.home_team === odds.awayTeam && match.away_team === odds.homeTeam)
            );
            return teamsMatch;
        });
        
        if (matchingMatch) {
            // Create mapping for future use
            await MatchMapping.create({
                oddsMatchId,
                sportradarMatchId: matchingMatch.id,
                homeTeam: odds.homeTeam,
                awayTeam: odds.awayTeam,
                scheduled: odds.commence
            });
            return matchingMatch.id;
        }
        
        return null;
    } catch (error) {
        console.error("Error finding Sportradar match ID:", error);
        return null;
    }
}

// ✅ Route to Fetch Only Live Matches with Odds
router.get("/matches/live", async (req, res) => {
    try {
        console.log('🟡 [ROUTE HIT] Fetching live and upcoming matches with odds');
        
        // Get all odds (which should now be one per match)
        const odds = await Odds.find();
        
        // Process matches based on status from the sheet
        const matches = odds
            .filter(odd => {
                // Keep if it's in the sheet (don't do complex time filtering)
                const status = (odd.status || '').toLowerCase().trim();
                
                // Show match if it's in the sheet and not explicitly completed
                if (status !== 'completed') {
                    console.log(`✅ Including match: ${odd.homeTeam} vs ${odd.awayTeam} (${status || 'pending'})`);
                    return true;
                }
                
                console.log(`❌ Excluding completed match: ${odd.homeTeam} vs ${odd.awayTeam}`);
                return false;
            })
            .map(odd => {
                const status = (odd.status || '').toLowerCase().trim();
                
                // Map status value
                let normalizedStatus = status;
                if (!status || status === '') {
                    normalizedStatus = 'pending';
                }
                
                return {
                    id: odd.matchId,
                    home_team: odd.homeTeam,
                    away_team: odd.awayTeam,
                    home_odds: odd.homeOdds,
                    away_odds: odd.awayOdds,
                    bookmaker: odd.bookmaker,
                    scheduled: odd.commence,
                    status: normalizedStatus,
                    lastUpdated: odd.lastUpdated,
                    home_team_color: odd.homeTeamColor,
                    away_team_color: odd.awayTeamColor
                };
            });
        
        // Log match breakdown for debugging
        const matchBreakdown = matches.reduce((acc, m) => {
            acc[m.status] = (acc[m.status] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`📊 Found ${matches.length} total matches`);
        console.log('Match breakdown:', matchBreakdown);
        
        res.json(matches);
    } catch (error) {
        console.error('❌ Error fetching matches:', error);
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
            
            // Parse the requested date (YYYY-MM-DD) and set it to midnight UTC
            const reqYear = parseInt(date.substr(0, 4));
            const reqMonth = parseInt(date.substr(5, 2)) - 1; // months are 0-indexed
            const reqDay = parseInt(date.substr(8, 2));
            
            // Create UTC date objects for comparison without time component
            const requestedUTCDate = new Date(Date.UTC(reqYear, reqMonth, reqDay));
            
            // Convert match commence time to UTC date
            const matchDateObj = new Date(odds.commence);
            const matchUTCDate = new Date(
                Date.UTC(
                    matchDateObj.getUTCFullYear(),
                    matchDateObj.getUTCMonth(),
                    matchDateObj.getUTCDate()
                )
            );
            
            // Format for logging
            const requestedDateStr = requestedUTCDate.toISOString().split('T')[0];
            const matchDateStr = matchUTCDate.toISOString().split('T')[0];
            
            // Log for debugging
            console.log(`Match ${odds.matchId}: req=${requestedDateStr}, match=${matchDateStr}, match=${matchDateStr === requestedDateStr}`);
            
            return matchDateStr === requestedDateStr;
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
        const decodedMatchId = decodeURIComponent(matchId);
        
        console.log(`🔍 [MATCH ROUTE] Received request for match:`, {
            raw_id: matchId,
            decoded_id: decodedMatchId
        });

        // First try to get match from Odds collection using exact match ID
        const matchFromOdds = await Odds.findOne({ matchId: decodedMatchId });
        
        console.log('📊 [MATCH ROUTE] Odds lookup result:', {
            found: !!matchFromOdds,
            matchId: matchFromOdds?.matchId,
            teams: matchFromOdds ? `${matchFromOdds.homeTeam} vs ${matchFromOdds.awayTeam}` : 'N/A'
        });

        if (!matchFromOdds) {
            console.log('❌ [MATCH ROUTE] Match not found in Odds collection:', decodedMatchId);
            return res.status(404).json({ 
                error: 'Match not found',
                details: 'No match found in odds database'
            });
        }

        // Initialize response object with odds data
        let enrichedMatch = {
            id: matchFromOdds.matchId,
            home_team: matchFromOdds.homeTeam,
            away_team: matchFromOdds.awayTeam,
            scheduled: matchFromOdds.commence,
            status: matchFromOdds.status || 'scheduled',
            home_odds: matchFromOdds.homeOdds,
            away_odds: matchFromOdds.awayOdds,
            bookmaker: matchFromOdds.bookmaker,
            venue: 'TBD',
            batting_scorecard: {
                home_team: [],
                away_team: []
            },
            bowling_scorecard: {
                home_team: [],
                away_team: []
            },
            commentary: []
        };

        try {
            // Try to find Sportradar mapping
            /* Temporarily disabled Sportradar integration
            const mapping = await MatchMapping.findOne({ 
                $or: [
                    { oddsMatchId: decodedMatchId },
                    { oddsMatchId: matchId }
                ]
            });
            
            console.log('🔍 [MATCH ROUTE] Mapping lookup result:', {
                found: !!mapping,
                sportradarId: mapping?.sportradarMatchId
            });

            if (mapping) {
                console.log('✅ [MATCH ROUTE] Found Sportradar mapping:', mapping.sportradarMatchId);
                const sportradarData = await fetchMatchDetails(mapping.sportradarMatchId);

                if (sportradarData) {
                    console.log('✅ [MATCH ROUTE] Successfully fetched Sportradar data');
                    enrichedMatch = {
                        ...enrichedMatch,
                        venue: sportradarData.venue,
                        status: sportradarData.status || enrichedMatch.status,
                        toss_winner: sportradarData.toss_winner,
                        toss_decision: sportradarData.toss_decision,
                        match_winner: sportradarData.match_winner,
                        home_score: sportradarData.home_score,
                        away_score: sportradarData.away_score,
                        batting_scorecard: sportradarData.batting_scorecard || enrichedMatch.batting_scorecard,
                        bowling_scorecard: sportradarData.bowling_scorecard || enrichedMatch.bowling_scorecard,
                        commentary: sportradarData.commentary || []
                    };
                }
            } else {
                console.log('🔄 [MATCH ROUTE] No existing mapping, attempting to find match in Sportradar...');
                const sportradarMatchId = await findSportradarMatchId(decodedMatchId);

                if (sportradarMatchId) {
                    console.log('✅ [MATCH ROUTE] Found and mapped Sportradar match:', sportradarMatchId);
                    const sportradarData = await fetchMatchDetails(sportradarMatchId);

                    if (sportradarData) {
                        enrichedMatch = {
                            ...enrichedMatch,
                            venue: sportradarData.venue,
                            status: sportradarData.status || enrichedMatch.status,
                            toss_winner: sportradarData.toss_winner,
                            toss_decision: sportradarData.toss_decision,
                            match_winner: sportradarData.match_winner,
                            home_score: sportradarData.home_score,
                            away_score: sportradarData.away_score,
                            batting_scorecard: sportradarData.batting_scorecard || enrichedMatch.batting_scorecard,
                            bowling_scorecard: sportradarData.bowling_scorecard || enrichedMatch.bowling_scorecard,
                            commentary: sportradarData.commentary || []
                        };
                    }
                }
            }
            */
            
            // Add message about Sportradar being temporarily disabled
            console.log('ℹ️ [MATCH ROUTE] Sportradar integration temporarily disabled');
            
        } catch (sportradarError) {
            console.error('⚠️ [MATCH ROUTE] Error fetching Sportradar data:', sportradarError);
            // Continue with basic match data if Sportradar fetch fails
        }

        console.log('🏁 [MATCH ROUTE] Sending response with data structure:', {
            has_odds: true,
            has_sportradar: enrichedMatch.batting_scorecard.home_team.length > 0,
            status: enrichedMatch.status,
            teams: `${enrichedMatch.home_team} vs ${enrichedMatch.away_team}`
        });

        res.json(enrichedMatch);
    } catch (error) {
        console.error('❌ [MATCH ROUTE] Error in match details route:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to fetch match details',
            message: error.message
        });
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
    // Find only matches with status 'in_play' or 'started'
    const liveMatches = await Match.find({ 
      status: { $in: ['in_play', 'started'] } 
    }).sort({ scheduled: 1 });

    console.log(`📊 Found ${liveMatches.length} live matches in database`);
    
    // If no live matches, try to fetch directly from API
    if (liveMatches.length === 0) {
      try {
        /* Temporarily disabled Sportradar API integration
        const { fetchLiveMatches } = require('../services/sportsRadarService');
        const apiLiveMatches = await fetchLiveMatches();
        
        if (apiLiveMatches && apiLiveMatches.length > 0) {
          console.log(`📡 Found ${apiLiveMatches.length} live matches from API`);
          
          // Return API results directly if we have them
          return res.json(apiLiveMatches);
        }
        */
        console.log('ℹ️ Sportradar API integration temporarily disabled');
      } catch (error) {
        console.error('Error fetching live matches from API:', error);
        // Continue with normal flow if API fetch fails
      }
    }

    const matchesWithOdds = await Promise.all(liveMatches.map(async (match) => {
      // Get all odds for this match, sorted by lastUpdated
      const allOdds = await Odds.find({ 
        matchId: match.matchId
      }).sort({ lastUpdated: -1 });

      if (!allOdds || allOdds.length === 0) {
        console.log(`No odds found for match: ${match.matchId}`);
        
        // Return match data even without odds
        return {
          id: match.matchId,
          home_team: match.team1,
          away_team: match.team2,
          scheduled: match.scheduled,
          status: match.status,
          home_odds: 1.0,
          away_odds: 1.0,
          bookmaker: "Default"
        };
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

    // Filter out matches without odds (should be none with our default handling)
    const validMatches = matchesWithOdds.filter(match => match !== null);
    console.log(`📊 Returning ${validMatches.length} live matches with data`);
    res.json(validMatches);
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ✅ Route to Fetch Completed Matches
router.get("/matches/completed", async (req, res) => {
    try {
        console.log('🟡 [ROUTE HIT] Fetching completed matches');

        // Get all odds entries
        const odds = await Odds.find();
        
        // Process matches based on completed status or if they were in sheet but no longer
        const matches = odds
            .filter(odd => {
                const status = (odd.status || '').toLowerCase().trim();

                // Include if:
                // 1. Explicitly marked as completed in sheets
                if (status === 'completed') {
                    console.log(`✅ Including completed match from sheets: ${odd.homeTeam} vs ${odd.awayTeam}`);
                    return true;
                }

                // 2. Match was in sheets but is no longer there
                if (odd.isInSheet === false) {
                    console.log(`✅ Including match no longer in sheets: ${odd.homeTeam} vs ${odd.awayTeam}`);
                    return true;
                }

                return false;
            })
            .map(odd => ({
                id: odd.matchId,
                home_team: odd.homeTeam,
                away_team: odd.awayTeam,
                home_odds: odd.homeOdds,
                away_odds: odd.awayOdds,
                bookmaker: odd.bookmaker,
                scheduled: odd.commence,
                status: 'completed',
                lastUpdated: odd.lastUpdated,
                home_team_color: odd.homeTeamColor,
                away_team_color: odd.awayTeamColor
            }));

        // Sort matches by date, most recent first
        matches.sort((a, b) => new Date(b.scheduled) - new Date(a.scheduled));
        
        console.log(`📊 Found ${matches.length} completed matches`);
        res.json(matches);
    } catch (error) {
        console.error('❌ Error fetching completed matches:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;