const cron = require('node-cron');
const { fetchOddsFromSheet } = require('./googleSheetsService');
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

  console.log('✅ Initialized WebSocket odds update service');
};

module.exports = { initOddsCronJob }; 