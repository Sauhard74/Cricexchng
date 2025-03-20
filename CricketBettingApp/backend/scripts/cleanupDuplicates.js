const mongoose = require('mongoose');
const Odds = require('../models/Odds');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for cleanup'))
  .catch(err => console.error('MongoDB connection error:', err));

async function cleanupDuplicates() {
  try {
    console.log('Starting duplicate cleanup by team names...');
    
    // Get all odds
    const allOdds = await Odds.find();
    console.log(`Found ${allOdds.length} total odds entries`);
    
    // Group by team names (home_team vs away_team)
    const teamGroups = {};
    
    allOdds.forEach(odd => {
      // Create a consistent key using team names
      const teamKey = `${odd.homeTeam.trim().toLowerCase()}_vs_${odd.awayTeam.trim().toLowerCase()}`;
      
      if (!teamGroups[teamKey]) {
        teamGroups[teamKey] = [];
      }
      teamGroups[teamKey].push(odd);
    });
    
    console.log(`Found ${Object.keys(teamGroups).length} unique matches by team names`);
    
    // For each match with multiple entries, keep only one (preferably DraftKings)
    let deletedCount = 0;
    
    for (const teamKey in teamGroups) {
      const odds = teamGroups[teamKey];
      
      if (odds.length > 1) {
        console.log(`Match "${teamKey}" has ${odds.length} entries`);
        
        // Sort by lastUpdated only, no bookmaker preference
        odds.sort((a, b) => {
          return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        });
        
        // Keep the first one, delete the rest
        const toKeep = odds[0];
        const toDelete = odds.slice(1);
        
        console.log(`Keeping entry from ${toKeep.bookmaker} (${toKeep.matchId}), deleting ${toDelete.length} others`);
        
        for (const odd of toDelete) {
          await Odds.deleteOne({ _id: odd._id });
          deletedCount++;
        }
      }
    }
    
    console.log(`Cleanup complete. Deleted ${deletedCount} duplicate entries.`);
    
    // Update the cronService to use team names for grouping
    console.log('Updating remaining entries to ensure consistent matchIds...');
    
    // Get all remaining odds
    const remainingOdds = await Odds.find();
    console.log(`Found ${remainingOdds.length} remaining odds entries`);
    
    // Create a mapping of team keys to matchIds
    const teamKeyToMatchId = {};
    
    // First pass: collect all matchIds
    remainingOdds.forEach(odd => {
      const teamKey = `${odd.homeTeam.trim().toLowerCase()}_vs_${odd.awayTeam.trim().toLowerCase()}`;
      if (!teamKeyToMatchId[teamKey]) {
        teamKeyToMatchId[teamKey] = odd.matchId;
      }
    });
    
    // Second pass: update any inconsistent matchIds
    let updatedCount = 0;
    for (const odd of remainingOdds) {
      const teamKey = `${odd.homeTeam.trim().toLowerCase()}_vs_${odd.awayTeam.trim().toLowerCase()}`;
      const correctMatchId = teamKeyToMatchId[teamKey];
      
      if (odd.matchId !== correctMatchId) {
        console.log(`Updating matchId for ${odd.homeTeam} vs ${odd.awayTeam}: ${odd.matchId} -> ${correctMatchId}`);
        odd.matchId = correctMatchId;
        await odd.save();
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} entries with consistent matchIds`);
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicates(); 