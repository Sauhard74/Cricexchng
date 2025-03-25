const axios = require("axios");
require('dotenv').config();

const BASE_URL = process.env.SPORTRADAR_BASE_URL || "https://api.sportradar.com/cricket-t2/en";
const API_KEY = process.env.SPORTRADAR_API_KEY;

// Add rate limiting delay
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests

if (!API_KEY) {
    console.error("❌ SPORTRADAR_API_KEY is not set in environment variables");
}

// Helper function to add delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMatches(date) {
    try {
        if (!API_KEY) throw new Error("Sportradar API key not configured");
        
        const scheduleUrl = `${BASE_URL}/schedules/${date}/results.json?api_key=${API_KEY}`;
        console.log(`🔗 Fetching Schedule: ${scheduleUrl}`);
        const scheduleResponse = await axios.get(scheduleUrl);

        if (!scheduleResponse.data.results) throw new Error("Invalid schedule data");

        // Process matches sequentially to avoid rate limiting
        const matches = [];
        for (const match of scheduleResponse.data.results) {
            try {
                await delay(RATE_LIMIT_DELAY);
                const matchId = match.sport_event.id;
                const matchDetails = await fetchMatchDetails(matchId);
                if (matchDetails) {
                    matches.push(matchDetails);
                }
            } catch (error) {
                console.error(`Failed to fetch match details: ${error.message}`);
            }
        }

        return matches;
    } catch (error) {
        console.error("❌ [SERVICE ERROR] Fetching matches failed:", error.message);
        if (error.response) {
            console.error("API Response:", error.response.data);
            console.error("Status:", error.response.status);
        }
        throw new Error("Failed to fetch match data");
    }
}

async function fetchMatchDetails(matchId) {
    try {
        if (!API_KEY) throw new Error("Sportradar API key not configured");

        // Log the incoming match ID
        console.log('🔍 [SPORTRADAR] Incoming Match ID:', matchId);

        // If it's from our odds API format (e.g., "match-titans_punjabkings:1")
        if (matchId.includes('match-') || matchId.includes('_')) {
            console.log('🔄 [SPORTRADAR] Converting odds API match ID format');
            
            // Extract team names from the match ID
            let teams = matchId;
            
            // Remove 'match-' prefix if present
            teams = teams.replace('match-', '');
            
            // Split by underscore and take the first part (teams)
            teams = teams.split('_')[0];
            
            // Convert to Sportradar format
            if (teams) {
                console.log('👥 [SPORTRADAR] Extracted teams:', teams);
                
                // Use Sportradar's format: sr:match:teams
                // Keep the original ID as a fallback
                const sportradarId = `sr:match:${teams}`;
                console.log('🔄 [SPORTRADAR] Converted to:', sportradarId);
                
                // Try to fetch with Sportradar ID first
                try {
                    const result = await tryFetchMatch(sportradarId);
                    if (result) {
                        return result;
                    }
                } catch (error) {
                    console.log('⚠️ Failed to fetch with Sportradar ID, using original:', error.message);
                }
            }
        }

        // If conversion failed or not needed, try with original ID
        return await tryFetchMatch(matchId);
    } catch (error) {
        console.error("❌ [SPORTRADAR] Error in fetchMatchDetails:", error.message);
        console.error("Stack:", error.stack);
        return null;
    }
}

// Helper function to try fetching match with a given ID
async function tryFetchMatch(matchId) {
    try {
        const encodedMatchId = encodeURIComponent(matchId);
        console.log('🔍 [SPORTRADAR] Trying with ID:', matchId);
        
        const url = `${BASE_URL}/matches/${encodedMatchId}/timeline.json?api_key=${API_KEY}`;
        console.log(`🔗 [SPORTRADAR] Fetching Match Details: ${url}`);
        
        const response = await axios.get(url);
        const match = response.data;

        // Handle rate limiting
        if (response.status === 429) {
            console.log('⚠️ Rate limit hit, waiting before retry...');
            await delay(RATE_LIMIT_DELAY * 2);
            return await tryFetchMatch(matchId);
        }

        if (!match || !match.sport_event) {
            console.error("❌ [SPORTRADAR] Invalid match response - missing sport_event");
            return null;
        }

        // ✅ Extract Competitor Names
        const teams = match.sport_event.competitors.map(c => ({
            id: c.id,
            name: c.name
        }));

        console.log('🏏 Teams:', teams);

        const getTeamName = (teamId) => {
            const team = teams.find(t => t.id === teamId);
            return team ? team.name : "Unknown";
        };

        const homeTeam = teams[0]?.name || "Unknown Home Team";
        const awayTeam = teams[1]?.name || "Unknown Away Team";

        // ✅ Toss Winner & Match Winner
        const tossWinner = getTeamName(match.sport_event_status?.toss_won_by);
        const tossDecision = match.sport_event_status?.toss_decision || "N/A";
        const matchWinner = getTeamName(match.sport_event_status?.winner_id) || "Match Not Decided";

        // ✅ Scorecard Mapping (Runs, Overs, Wickets)
        const scores = match.sport_event_status?.period_scores || [];
        const homeScore = scores[1]?.display_score || "N/A";
        const homeOvers = scores[1]?.display_overs || "N/A";
        const awayScore = scores[0]?.display_score || "N/A";
        const awayOvers = scores[0]?.display_overs || "N/A";

        console.log('📊 Scores:', { homeScore, homeOvers, awayScore, awayOvers });

        // ✅ Extract Batting Scorecard
        let battingScorecard = {
            home_team: [],
            away_team: []
        };

        if (match.statistics?.innings) {
            console.log('📊 Processing innings data...');
            match.statistics.innings.forEach((inning, idx) => {
                console.log(`Processing inning ${idx + 1}`);
                inning.teams.forEach(team => {
                    let teamName = getTeamName(team.id);
                    let battingPlayers = team.statistics?.batting?.players || [];

                    console.log(`Processing batting for team: ${teamName}, found ${battingPlayers.length} players`);

                    battingPlayers.forEach(player => {
                        let batsman = {
                            name: player.name,
                            runs: player.statistics?.runs || 0,
                            balls_faced: player.statistics?.balls_faced || 0,
                            fours: player.statistics?.fours || 0,
                            sixes: player.statistics?.sixes || 0,
                            strike_rate: player.statistics?.strike_rate || 0,
                            dismissal: player.statistics?.dismissal?.type || "Not Out"
                        };

                        if (teamName === homeTeam) {
                            battingScorecard.home_team.push(batsman);
                        } else {
                            battingScorecard.away_team.push(batsman);
                        }
                    });
                });
            });
        } else {
            console.log('⚠️ No innings data found in match statistics');
        }

        // ✅ Extract Bowling Scorecard
        let bowlingScorecard = {
            home_team: [],
            away_team: []
        };

        if (match.statistics?.innings) {
            console.log('📊 Processing bowling statistics...');
            match.statistics.innings.forEach((inning, idx) => {
                console.log(`Processing bowling for inning ${idx + 1}`);
                inning.teams.forEach(team => {
                    let teamName = getTeamName(team.id);
                    let bowlingPlayers = team.statistics?.bowling?.players || [];

                    console.log(`Processing bowling for team: ${teamName}, found ${bowlingPlayers.length} players`);

                    bowlingPlayers.forEach(player => {
                        let bowler = {
                            name: player.name,
                            overs: player.statistics?.overs_bowled || 0,
                            wickets: player.statistics?.wickets || 0,
                            runs_conceded: player.statistics?.runs_conceded || 0,
                            economy: player.statistics?.economy_rate || 0,
                            maidens: player.statistics?.maidens || 0,
                            wides: player.statistics?.wides || 0,
                            no_balls: player.statistics?.no_balls || 0
                        };

                        if (teamName === homeTeam) {
                            bowlingScorecard.home_team.push(bowler);
                        } else {
                            bowlingScorecard.away_team.push(bowler);
                        }
                    });
                });
            });
        }

        // ✅ Live Commentary Extraction
        const commentary = match.timeline
            ?.filter(event => event.type === "ball") // Only get ball events
            .map(event => ({
                over: event.over_number,
                ball: event.ball_number,
                runs: event.batting_params?.runs_scored || 0,
                batsman: event.batting_params?.striker?.name || "Unknown Batsman",
                bowler: event.bowling_params?.bowler?.name || "Unknown Bowler",
                description: event.commentary?.text || "No description available"
            })) || [];

        console.log('📊 Final Data Structure:', {
            batting_players: {
                home: battingScorecard.home_team.length,
                away: battingScorecard.away_team.length
            },
            bowling_players: {
                home: bowlingScorecard.home_team.length,
                away: bowlingScorecard.away_team.length
            },
            commentary_entries: commentary.length
        });

        return {
            id: matchId,
            league: match.sport_event.season?.name || "N/A",
            venue: match.sport_event.venue?.name || "Unknown Venue",
            scheduled: match.sport_event.scheduled,
            status: match.sport_event_status?.status || "N/A",
            toss_winner: tossWinner,
            toss_decision: tossDecision,
            match_winner: matchWinner,
            home_team: homeTeam,
            away_team: awayTeam,
            home_score: `${homeScore} (${homeOvers} overs)`,
            away_score: `${awayScore} (${awayOvers} overs)`,
            batting_scorecard: battingScorecard,
            bowling_scorecard: bowlingScorecard,
            commentary: commentary
        };
    } catch (error) {
        console.error("❌ [SPORTRADAR] Error in tryFetchMatch:", error.message);
        throw error;
    }
}

async function fetchLiveMatches() {
    try {
        const liveUrl = `${BASE_URL}/schedules/live/schedule.json?api_key=${API_KEY}`;
        console.log(`🔗 Fetching Live Matches: ${liveUrl}`);

        const response = await axios.get(liveUrl);
        if (!response.data.sport_events) throw new Error("Invalid live matches data");

        const liveMatches = response.data.sport_events.map(match => ({
            id: match.id,
            league: match.season.name,
            tournament: match.tournament.name,
            scheduled: match.scheduled,
            venue: match.venue?.name || "Unknown Venue",
            status: match.status,
            home_team: match.competitors[0]?.name || "Unknown Home Team",
            away_team: match.competitors[1]?.name || "Unknown Away Team"
        }));

        return liveMatches;
    } catch (error) {
        console.error("❌ [SERVICE ERROR] Fetching live matches failed:", error.message);
        throw new Error("Failed to fetch live matches");
    }
}

module.exports = { fetchMatches, fetchMatchDetails, fetchLiveMatches};
