const axios = require("axios");

const BASE_URL = "https://api.sportradar.com/cricket-t2/en";
const API_KEY = "YtzgWaXRBBJ4vbjBbCP2U7IShSvkUNPMdYRyb1vZ";

async function fetchMatches(date) {
    try {
        const scheduleUrl = `${BASE_URL}/schedules/${date}/results.json?api_key=${API_KEY}`;
        console.log(`🔗 Fetching Schedule: ${scheduleUrl}`);
        const scheduleResponse = await axios.get(scheduleUrl);

        if (!scheduleResponse.data.results) throw new Error("Invalid schedule data");

        const matches = await Promise.all(
            scheduleResponse.data.results.map(async (match) => {
                const matchId = match.sport_event.id;
                const matchDetails = await fetchMatchDetails(matchId);
                return matchDetails;  // This could be null if fetching fails
            })
        );

        // **🔥 Remove null matches**
        return matches.filter(match => match !== null);
    } catch (error) {
        console.error("❌ [SERVICE ERROR] Fetching matches failed:", error.message);
        throw new Error("Failed to fetch match data");
    }
}

async function fetchMatchDetails(matchId) {
    try {
        const url = `${BASE_URL}/matches/${matchId}/timeline.json?api_key=${API_KEY}`;
        console.log(`🔗 Fetching Match Details: ${url}`);
        const response = await axios.get(url);
        const match = response.data;

        if (!match || !match.sport_event) {
            throw new Error("Invalid match response.");
        }

        // ✅ Extract Competitor Names
        const teams = match.sport_event.competitors.map(c => ({
            id: c.id,
            name: c.name
        }));

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

        // ✅ Extract Batting Scorecard from `innings[].teams[].statistics.batting.players`
        let battingScorecard = {
            home_team: [],
            away_team: []
        };

        if (match.statistics?.innings) {
            match.statistics.innings.forEach(inning => {
                inning.teams.forEach(team => {
                    let teamName = getTeamName(team.id);
                    let battingPlayers = team.statistics?.batting?.players || [];

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

                        console.log(`📊 [DEBUG] Batsman Data: ${JSON.stringify(batsman)}`);

                        if (teamName === homeTeam) {
                            battingScorecard.home_team.push(batsman);
                        } else {
                            battingScorecard.away_team.push(batsman);
                        }
                    });
                });
            });
        }

        // ✅ Extract Bowling Scorecard from `innings[].teams[].statistics.bowling.players`
        let bowlingScorecard = {
            home_team: [],
            away_team: []
        };

        if (match.statistics?.innings) {
            match.statistics.innings.forEach(inning => {
                inning.teams.forEach(team => {
                    let teamName = getTeamName(team.id);
                    let bowlingPlayers = team.statistics?.bowling?.players || [];

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

                        console.log(`📊 [DEBUG] Bowler Data: ${JSON.stringify(bowler)}`);

                        if (teamName === homeTeam) {
                            bowlingScorecard.home_team.push(bowler);
                        } else {
                            bowlingScorecard.away_team.push(bowler);
                        }
                    });
                });
            });
        }

        // ✅ Live Commentary Extraction (Correct Player Names)
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
        console.error("❌ [SERVICE ERROR] Fetching match details failed:", error.message);
        return null;
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
