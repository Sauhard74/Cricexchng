const mongoose = require('mongoose');
const Odds = require('../models/Odds');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for updating team colors'))
  .catch(err => console.error('MongoDB connection error:', err));

// Team color mapping
const teamColors = {
  'royal challengers bangalore': '#FF0000', // Red
  'chennai super kings': '#FFCC00', // Yellow
  'kolkata knight riders': '#7B3FE4', // Purple
  'mumbai indians': '#0066CC', // Blue
  'lucknow super giants': '#00BFFF', // Sky Blue
  'gujarat titans': '#566573', // Grey-Blue
  'delhi capitals': '#0078BC', // Blue
  'rajasthan royals': '#FF69B4', // Pink
  'sunrisers hyderabad': '#FF8C00', // Orange
  'punjab kings': '#ED1C24', // Red
};

// Helper function to find team color
const getTeamColor = (teamName) => {
  const normalizedName = teamName.toLowerCase();
  
  for (const [team, color] of Object.entries(teamColors)) {
    if (normalizedName.includes(team) || team.includes(normalizedName)) {
      return color;
    }
  }
  
  return null;
};

async function updateTeamColors() {
  try {
    console.log('Updating team colors in database...');
    
    // Get all odds
    const allOdds = await Odds.find();
    console.log(`Found ${allOdds.length} total matches in database`);
    
    if (allOdds.length === 0) {
      console.log('No matches found in the database!');
      process.exit(0);
    }
    
    // Update each match with team colors
    let updateCount = 0;
    for (const match of allOdds) {
      const homeTeamColor = getTeamColor(match.homeTeam);
      const awayTeamColor = getTeamColor(match.awayTeam);
      
      let updateNeeded = false;
      
      if (homeTeamColor && (!match.homeTeamColor || match.homeTeamColor !== homeTeamColor)) {
        match.homeTeamColor = homeTeamColor;
        updateNeeded = true;
      }
      
      if (awayTeamColor && (!match.awayTeamColor || match.awayTeamColor !== awayTeamColor)) {
        match.awayTeamColor = awayTeamColor;
        updateNeeded = true;
      }
      
      if (updateNeeded) {
        console.log(`Updating colors for ${match.homeTeam} (${match.homeTeamColor}) vs ${match.awayTeam} (${match.awayTeamColor})`);
        await match.save();
        updateCount++;
      }
    }
    
    console.log(`Updated team colors for ${updateCount} matches`);
    
    // Show all matches with their colors
    console.log('\nMatch Team Colors:');
    for (const match of allOdds) {
      console.log(`${match.homeTeam} (${match.homeTeamColor || 'No color'}) vs ${match.awayTeam} (${match.awayTeamColor || 'No color'})`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating team colors:', error);
    process.exit(1);
  }
}

updateTeamColors(); 