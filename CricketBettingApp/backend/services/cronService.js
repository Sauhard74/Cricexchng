const cron = require('node-cron');
const { fetchOddsFromSheet } = require('./googleSheetsService');
const { fetchLiveMatches, fetchMatchDetails } = require('./sportsRadarService');
const { findSportradarMatchId } = require('../utils/matchUtils');
const Odds = require('../models/Odds');
const Match = require('../models/Match');
const MatchMapping = require('../models/MatchMapping');

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
          
          // Generate matchId in the exact format as seen in database
          const matchId = `match_${odds.homeTeam.replace(/\s+/g, '')}_${odds.awayTeam.replace(/\s+/g, '')}`;
          odds.matchId = matchId;
          
          console.log('Generated matchId:', matchId); // Add logging to verify matchId format
          
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
              status: normalizeStatus(odds.status || "not_started")
            },
            { new: true, upsert: true }
          );

          console.log('Match data after update:', {
            id: match._id,
            matchId: match.matchId,
            home_team: match.home_team,
            away_team: match.away_team
          });

          // Try to create match mapping if it doesn't exist
          const existingMapping = await MatchMapping.findOne({ oddsMatchId: matchId });
          if (!existingMapping) {
            try {
              const sportradarMatchId = await findSportradarMatchId(matchId);
              if (sportradarMatchId) {
                const newMapping = new MatchMapping({
                  oddsMatchId: matchId,
                  sportradarMatchId: sportradarMatchId,
                  homeTeam: odds.homeTeam,
                  awayTeam: odds.awayTeam,
                  scheduled: new Date(odds.commence)
                });
                await newMapping.save();
                console.log(`✅ Created new mapping for ${odds.homeTeam} vs ${odds.awayTeam}`);

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
                    batting_scorecard: sportradarData.batting_scorecard || [],
                    bowling_scorecard: sportradarData.bowling_scorecard || [],
                    commentary: sportradarData.commentary || []
                  });
                }
              }
            } catch (mappingError) {
              console.error(`❌ Error creating mapping for match ${matchId}:`, mappingError);
            }
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
            // Generate matchId in the exact format as seen in database
            const matchId = `match_${liveMatch.home_team.replace(/\s+/g, '')}_${liveMatch.away_team.replace(/\s+/g, '')}`;
            
            console.log('Generated live match ID:', matchId); // Add logging to verify matchId format
            
            // Update the match status in the database
            const updatedMatch = await Match.findOneAndUpdate(
              { 
                $or: [
                  { matchId },
                  { home_team: liveMatch.home_team, away_team: liveMatch.away_team },
                  { home_team: liveMatch.home_team.trim(), away_team: liveMatch.away_team.trim() }
                ]
              },
              { 
                status: 'live',
                matchId: matchId,
                home_team: liveMatch.home_team,
                away_team: liveMatch.away_team,
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

  // Run match mapping every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running match mapping cron job...');
    await mapAllMatchesToSportradar();
  });

  console.log('✅ Initialized WebSocket odds update service');
};

module.exports = { initOddsCronJob }; 