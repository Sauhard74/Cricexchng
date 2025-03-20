const mongoose = require('mongoose');
const Odds = require('../models/Odds');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for checking matches'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkMatches() {
  try {
    console.log('Checking matches in database...');
    
    // Get all odds
    const allOdds = await Odds.find();
    console.log(`Found ${allOdds.length} total matches in database`);
    
    if (allOdds.length === 0) {
      console.log('No matches found in the database!');
      process.exit(0);
    }
    
    // Display each match
    console.log('\nMatch Details:');
    allOdds.forEach((match, index) => {
      console.log(`\n--- Match ${index + 1} ---`);
      console.log(`ID: ${match.matchId}`);
      console.log(`Teams: ${match.homeTeam} vs ${match.awayTeam}`);
      console.log(`Odds: ${match.homeOdds} / ${match.awayOdds}`);
      console.log(`Status: ${match.status}`);
      console.log(`Scheduled: ${match.commence}`);
      console.log(`Last Updated: ${match.lastUpdated}`);
      console.log(`Bookmaker: ${match.bookmaker}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking matches:', error);
    process.exit(1);
  }
}

checkMatches(); 