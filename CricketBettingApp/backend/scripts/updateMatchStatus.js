const mongoose = require('mongoose');
const Odds = require('../models/Odds');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for updating match status'))
  .catch(err => console.error('MongoDB connection error:', err));

async function updateMatchStatus() {
  try {
    console.log('Updating match statuses in database...');
    
    // Direct update using updateMany
    const result = await Odds.updateMany(
      {}, // Match all documents
      { $set: { status: 'not_started' } }
    );
    
    console.log(`Updated status for ${result.modifiedCount} matches to 'not_started'`);
    console.log('Update result:', result);
    
    // Double-check the update
    const allOdds = await Odds.find();
    console.log(`Found ${allOdds.length} total matches in database`);
    
    console.log('\nStatus check after update:');
    allOdds.forEach((match, index) => {
      console.log(`Match ${index + 1}: ${match.homeTeam} vs ${match.awayTeam} - Status: ${match.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating match status:', error);
    process.exit(1);
  }
}

updateMatchStatus(); 