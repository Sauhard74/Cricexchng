const cron = require('node-cron');
const { fetchOddsFromSheet } = require('./googleSheetsService');
const { fetchLiveMatches, fetchMatchDetails } = require('./sportsRadarService');
const { findSportradarMatchId } = require('../utils/matchUtils');
const Odds = require('../models/Odds');
const Match = require('../models/Match');
const MatchMapping = require('../models/MatchMapping');

// Helper function to normalize match status
function normalizeStatus(status, matchDate) {
  if (!matchDate) {
    console.log('⚠️ No match date provided, defaulting to scheduled');
    return 'scheduled';
  }

  // Convert matchDate to Date object if it's a string
  const matchDateTime = new Date(matchDate);
  const now = new Date();
  
  // First check: Is the match from a previous day?
  const isYesterdayOrBefore = matchDateTime.toDateString() !== now.toDateString() && 
                             matchDateTime < now;
  
  if (isYesterdayOrBefore) {
    console.log(`Match from ${matchDateTime.toDateString()} is from a previous day, marking as completed`);
    return 'completed';
  }
  
  // Add buffer times
  const pastBuffer = 4 * 60 * 60 * 1000; // 4 hours after scheduled time
  const futureBuffer = 15 * 60 * 1000;   // 15 minutes before scheduled time
  
  // First layer: Check sheet status
  const sheetStatus = (status || '').toLowerCase().trim();
  
  // If explicitly marked as live in sheets, verify it's today's match
  if (sheetStatus === 'live') {
    // Check if match is scheduled for today
    const isToday = matchDateTime.toDateString() === now.toDateString();
    if (!isToday) {
      console.log('⚠️ Match marked as live but not scheduled for today, marking as completed');
      return 'completed';
    }
    return 'live';
  }
  
  // If explicitly marked as completed in sheets, respect that
  if (sheetStatus === 'completed') {
    return 'completed';
  }
  
  // Second layer: Date-based validation
  // If match is not in sheets or has another status, use date logic
  
  // If match date is more than 4 hours in the past
  if (matchDateTime.getTime() + pastBuffer < now.getTime()) {
    console.log('Match is more than 4 hours past scheduled time, marking as completed');
    return 'completed';
  }
  
  // If match is in the future (with 15-min buffer)
  if (matchDateTime.getTime() - futureBuffer > now.getTime()) {
    console.log('Match is in the future, marking as scheduled');
    return 'scheduled';
  }
  
  // For matches within the buffer times, keep as scheduled unless explicitly marked otherwise
  return 'scheduled';
}

// Helper function to map all matches to Sportradar
async function mapAllMatchesToSportradar() {
  try {
    console.log('🔄 Starting match mapping process...');
    
    // Get all matches from our database
    const matches = await Match.find({});
    console.log(`Found ${matches.length} matches to process`);
    
    for (const match of matches) {
      try {
        // Skip if we already have a mapping
        const existingMapping = await MatchMapping.findOne({ oddsMatchId: match.matchId });
        if (existingMapping) {
          console.log(`✅ Mapping already exists for match: ${match.home_team} vs ${match.away_team}`);
          continue;
        }
        
        // Try to find Sportradar match ID
        const sportradarMatchId = await findSportradarMatchId(match.matchId);
        
        if (sportradarMatchId) {
          console.log(`✅ Successfully mapped match: ${match.home_team} vs ${match.away_team}`);
          
          // Update match with Sportradar data
          const sportradarData = await fetchMatchDetails(sportradarMatchId);
          if (sportradarData) {
            await Match.findByIdAndUpdate(match._id, {
              venue: sportradarData.venue,
              status: sportradarData.status || match.status,
              toss_winner: sportradarData.toss_winner,
              toss_decision: sportradarData.toss_decision,
              match_winner: sportradarData.match_winner,
              home_score: sportradarData.home_score,
              away_score: sportradarData.away_score,
              batting_scorecard: sportradarData.batting_scorecard || match.batting_scorecard,
              bowling_scorecard: sportradarData.bowling_scorecard || match.bowling_scorecard,
              commentary: sportradarData.commentary || []
            });
          }
        } else {
          console.log(`⚠️ Could not find Sportradar mapping for: ${match.home_team} vs ${match.away_team}`);
        }
      } catch (error) {
        console.error(`❌ Error processing match ${match.matchId}:`, error);
      }
    }
    
    console.log('✅ Completed match mapping process');
  } catch (error) {
    console.error('❌ Error in match mapping process:', error);
  }
}

// Add this function before initOddsCronJob
async function cleanupPastMatches() {
  try {
    console.log('🧹 Starting cleanup of past matches...');
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);  // End of yesterday

    // Find all matches from before today that aren't marked as completed
    const pastMatches = await Match.find({
      scheduled: { $lt: yesterday },
      status: { $ne: 'completed' }
    });

    console.log(`Found ${pastMatches.length} past matches to cleanup`);

    for (const match of pastMatches) {
      console.log(`Marking past match as completed: ${match.home_team} vs ${match.away_team} (${new Date(match.scheduled).toDateString()})`);
      
      // Update match status
      await Match.findByIdAndUpdate(match._id, {
        status: 'completed',
        lastUpdated: new Date()
      });

      // Update corresponding odds entry
      await Odds.findOneAndUpdate(
        { matchId: match.matchId },
        {
          status: 'completed',
          lastUpdated: new Date()
        }
      );
    }

    console.log('✅ Past matches cleanup completed');
  } catch (error) {
    console.error('❌ Error during past matches cleanup:', error);
  }
}

const initOddsCronJob = (broadcastCallback) => {
  // Run cleanup when service starts
  cleanupPastMatches();

  // Run every 15 seconds
  cron.schedule('*/15 * * * * *', async () => {
    try {
      console.log('🔄 Fetching latest odds...');
      const latestOdds = await fetchOddsFromSheet();
      
      // Get all existing matches from database that are not completed
      const existingMatches = await Match.find({ 
        status: { $nin: ['completed'] } 
      });
      
      // Create a set of match IDs from the sheet data
      const sheetMatchIds = new Set();
      
      // First, mark all existing odds as not in sheet
      await Odds.updateMany({}, { isInSheet: false });
      
      // Group by team names - no bookmaker preference
      const teamGroups = {};
      
      for (const odds of latestOdds) {
        // Create a consistent key using team names
        const teamKey = `${odds.homeTeam.trim().toLowerCase()}_vs_${odds.awayTeam.trim().toLowerCase()}`;
        const matchId = `match_${odds.homeTeam.replace(/\s+/g, '')}_${odds.awayTeam.replace(/\s+/g, '')}`;
        
        // Add to set of current sheet matches
        sheetMatchIds.add(matchId);
        
        // Just take the first one we encounter for each match
        if (!teamGroups[teamKey]) {
          teamGroups[teamKey] = odds;
        }
      }
      
      // Check for matches that were in DB but not in sheet anymore
      for (const match of existingMatches) {
        if (!sheetMatchIds.has(match.matchId)) {
          console.log(`⚠️ Match ${match.matchId} (${match.home_team} vs ${match.away_team}) not found in sheets, marking as completed`);
          
          // Update match status to completed
          await Match.findOneAndUpdate(
            { matchId: match.matchId },
            { 
              status: 'completed',
              lastUpdated: new Date()
            }
          );
          
          // Update odds status to completed
          await Odds.findOneAndUpdate(
            { matchId: match.matchId },
            { 
              status: 'completed',
              lastUpdated: new Date(),
              isInSheet: false
            }
          );
        }
      }
      
      // Now process only one entry per match
      const updatedOdds = [];
      
      for (const teamKey in teamGroups) {
        try {
          const odds = teamGroups[teamKey];
          
          // Generate matchId in the exact format as seen in database
          const matchId = `match_${odds.homeTeam.replace(/\s+/g, '')}_${odds.awayTeam.replace(/\s+/g, '')}`;
          odds.matchId = matchId;
          
          console.log('Generated matchId:', matchId);
          
          // Use exact values from sheets
          odds.homeOdds = parseFloat(odds.homeOdds);
          odds.awayOdds = parseFloat(odds.awayOdds);
          
          // Create or update match entry
          let match = await Match.findOneAndUpdate(
            { matchId },
            {
              matchId,
              home_team: odds.homeTeam,
              away_team: odds.awayTeam,
              scheduled: new Date(odds.commence),
              status: normalizeStatus(odds.status || "not_started", odds.commence)
            },
            { new: true, upsert: true }
          );

          console.log('Match data after update:', {
            id: match._id,
            matchId: match.matchId,
            home_team: match.home_team,
            away_team: match.away_team,
            status: match.status
          });

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
              lastUpdated: new Date(),
              isInSheet: true
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

  // Also add daily cleanup at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running daily cleanup of past matches...');
    await cleanupPastMatches();
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
            // Generate matchId in the exact format as seen in database
            const matchId = `match_${liveMatch.home_team.replace(/\s+/g, '')}_${liveMatch.away_team.replace(/\s+/g, '')}`;
            
            console.log('Generated live match ID:', matchId);
            
            // First check if we have this match in our odds collection
            const existingOdds = await Odds.findOne({ matchId });
            if (!existingOdds) {
              console.log(`⚠️ No odds found for match ${matchId}, skipping status update`);
              continue;
            }

            // Only update match details, but keep the status from sheets
            const updatedMatch = await Match.findOneAndUpdate(
              { 
                $or: [
                  { matchId },
                  { home_team: liveMatch.home_team, away_team: liveMatch.away_team },
                  { home_team: liveMatch.home_team.trim(), away_team: liveMatch.away_team.trim() }
                ]
              },
              { 
                matchId: matchId,
                home_team: liveMatch.home_team,
                away_team: liveMatch.away_team,
                scheduled: existingOdds.commence,
                last_updated: new Date()
              },
              { new: true, upsert: true }
            );
            
            if (updatedMatch) {
              console.log(`✅ Updated match details: ${liveMatch.home_team} vs ${liveMatch.away_team}`);
              console.log('Current status from sheets:', existingOdds.status);
            }
          } catch (error) {
            console.error(`❌ Error updating live match:`, error);
          }
        }
        
        // If there are callbacks registered, broadcast updates
        if (broadcastCallback) {
          const updatedOdds = await Odds.find({ status: 'live' });
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

  // Run match mapping every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running match mapping cron job...');
    await mapAllMatchesToSportradar();
  });

  console.log('✅ Initialized WebSocket odds update service');
};

module.exports = { initOddsCronJob }; 