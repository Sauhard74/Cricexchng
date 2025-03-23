const cron = require('node-cron');
const { fetchOddsFromSheet } = require('./googleSheetsService');
const { fetchLiveMatches } = require('./sportsRadarService');
const Odds = require('../models/Odds');
const Match = require('../models/Match');

// Helper function to normalize match status
function normalizeStatus(status) {
  status = status?.toLowerCase();
  if (status === 'pending' || status === 'scheduled') {
    return 'not_started';
  }
  if (status === 'completed' || status === 'finished') {
    return 'closed';
  }
  return status;
}

const initOddsCronJob = (broadcastCallback) => {
  // Run every 15 seconds
  cron.schedule('*/15 * * * * *', async () => {
    try {
      console.log('🔄 Fetching latest odds...');
      const latestOdds = await fetchOddsFromSheet();
      
      // Group by team names - no bookmaker preference
      const teamGroups = {};
      
      for (const odds of latestOdds) {
        // Create a consistent key using team names
        const teamKey = `${odds.homeTeam.trim().toLowerCase()}_vs_${odds.awayTeam.trim().toLowerCase()}`;
        
        // Just take the first one we encounter for each match
        if (!teamGroups[teamKey]) {
          teamGroups[teamKey] = odds;
        }
      }
      
      // Now process only one entry per match
      const updatedOdds = [];
      
      for (const teamKey in teamGroups) {
        try {
          const odds = teamGroups[teamKey];
          
          // Generate a consistent matchId based on team names
          const matchId = `match_${odds.homeTeam.replace(/[^a-zA-Z0-9]/g, '')}_${odds.awayTeam.replace(/[^a-zA-Z0-9]/g, '')}`;
          odds.matchId = matchId;
          
          // Use exact values from sheets
          odds.homeOdds = parseFloat(odds.homeOdds);
          odds.awayOdds = parseFloat(odds.awayOdds);
          
          // Create or update match entry
          let match = await Match.findOne({ matchId });
          
          if (!match) {
            match = await Match.create({
              matchId,
              team1: odds.homeTeam,
              team2: odds.awayTeam,
              scheduled: new Date(odds.commence),
              status: normalizeStatus(odds.status || "not_started")
            });
            console.log(`✅ Created new match entry for ${odds.homeTeam} vs ${odds.awayTeam}`);
          }
          
          // Update odds in database - use a consistent matchId
          const updatedOdd = await Odds.findOneAndUpdate(
            { matchId },
            { 
              matchId,
              homeTeam: odds.homeTeam,
              awayTeam: odds.awayTeam,
              homeOdds: odds.homeOdds,
              awayOdds: odds.awayOdds,
              bookmaker: odds.bookmaker,
              commence: odds.commence,
              status: odds.status,
              lastUpdated: new Date()
            },
            { new: true, upsert: true }
          );
          
          updatedOdds.push(updatedOdd);
          console.log(`📊 Updated odds for match: ${odds.homeTeam} vs ${odds.awayTeam} from ${odds.bookmaker}`);
        } catch (error) {
          console.error(`❌ Error processing odds for match ${teamKey}:`, error);
        }
      }
      
      if (updatedOdds.length > 0) {
        console.log(`✅ Updated odds for ${updatedOdds.length} entries`);
        if (broadcastCallback) {
          broadcastCallback(updatedOdds);
        }
      }
    } catch (error) {
      console.error('❌ Error in cron job:', error);
    }
  });

  // New cron job to update live match statuses every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      console.log('🔄 Fetching live matches...');
      const liveMatches = await fetchLiveMatches();
      
      if (liveMatches && liveMatches.length > 0) {
        console.log(`Found ${liveMatches.length} live matches from API`);
        
        // Update each live match in the database
        for (const liveMatch of liveMatches) {
          try {
            // Generate a consistent matchId based on team names
            const matchId = `match_${liveMatch.home_team.replace(/[^a-zA-Z0-9]/g, '')}_${liveMatch.away_team.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            // Update the match status in the database
            const updatedMatch = await Match.findOneAndUpdate(
              { 
                $or: [
                  { matchId },
                  { team1: liveMatch.home_team, team2: liveMatch.away_team },
                  { team1: liveMatch.home_team.trim(), team2: liveMatch.away_team.trim() }
                ]
              },
              { 
                status: 'in_play',
                matchId: matchId,
                team1: liveMatch.home_team,
                team2: liveMatch.away_team,
                scheduled: liveMatch.scheduled || new Date()
              },
              { new: true, upsert: true }
            );
            
            if (updatedMatch) {
              console.log(`✅ Updated match status to LIVE: ${liveMatch.home_team} vs ${liveMatch.away_team}`);
              
              // Also update the odds status if it exists
              await Odds.updateMany(
                { matchId },
                { status: 'in_play' }
              );
            }
          } catch (error) {
            console.error(`❌ Error updating live match:`, error);
          }
        }
        
        // If there are callbacks registered, broadcast the live match status changes
        if (broadcastCallback) {
          const updatedOdds = await Odds.find({ status: 'in_play' });
          if (updatedOdds.length > 0) {
            broadcastCallback(updatedOdds);
          }
        }
      } else {
        console.log('No live matches currently available');
      }
    } catch (error) {
      console.error('❌ Error in live matches cron job:', error);
    }
  });

  console.log('✅ Initialized WebSocket odds update service');
};

module.exports = { initOddsCronJob }; 