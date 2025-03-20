const mongoose = require('mongoose');
const Match = require('../models/Match');
const Odds = require('../models/Odds');

async function cleanup() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cricket-betting');
    console.log('Connected to MongoDB');

    // Delete all documents from both collections
    await Match.deleteMany({});
    await Odds.deleteMany({});
    
    console.log('✅ Successfully cleared all matches and odds data');
  } catch (error) {
    console.error('Error cleaning up data:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

cleanup(); 