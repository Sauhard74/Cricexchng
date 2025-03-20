const { google } = require('googleapis');
const sheets = google.sheets('v4');

// Configure Google Sheets API credentials
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SPREADSHEET_ID = '1kQ2Lv7EQsUVaGaAkuB57K6nWlRm5EATrZMfE2LUz_pI';
const SHEET_NAME = 'Sheet1'; // Update this if your sheet has a different name

// Initialize auth client
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: SCOPES,
  });
  return auth.getClient();
}

// Update the parseDate function
function parseDate(dateString) {
  try {
    console.log('Parsing date string:', dateString);

    if (!dateString) {
      console.warn('Empty date string, using current date');
      return new Date().toISOString();
    }

    // Handle DD/MM/YYYY format
    if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/'); // Changed order since input is MM/DD/YYYY
      const fullYear = year.length === 2 ? '20' + year : year;
      // Create date using correct order: year, month (0-based), day
      const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
      console.log('Parsed date:', date.toISOString());
      return date.toISOString();
    }

    // Handle YYYY-MM-DD format
    if (dateString.includes('-')) {
      const date = new Date(dateString);
      console.log('Parsed date:', date.toISOString());
      return date.toISOString();
    }

    // Try parsing as a timestamp
    const timestamp = Date.parse(dateString);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp);
      console.log('Parsed date:', date.toISOString());
      return date.toISOString();
    }

    throw new Error(`Unable to parse date: ${dateString}`);
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date().toISOString();
  }
}

// Update the generateMatchId function to be more consistent
function generateMatchId(homeTeam, awayTeam) {
  // Remove spaces and special characters from team names
  const cleanHomeTeam = homeTeam.trim().replace(/[^a-zA-Z0-9]/g, '');
  const cleanAwayTeam = awayTeam.trim().replace(/[^a-zA-Z0-9]/g, '');
  
  // Create a consistent matchId format
  return `match_${cleanHomeTeam}_${cleanAwayTeam}`;
}

// Fetch odds data from Google Sheets
async function fetchOddsFromSheet() {
  try {
    console.log('🔄 Fetching odds data from Google Sheets...');
    
    const authClient = await getAuthClient();
    
    console.log(`📊 Attempting to fetch data from spreadsheet ID: ${SPREADSHEET_ID}`);
    
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`, // Fetch all columns
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.error('❌ No data found in the spreadsheet');
      throw new Error('No data found in the spreadsheet');
    }
    
    console.log(`✅ Successfully fetched ${rows.length} rows from Google Sheets`);
    console.log(`📋 Headers: ${rows[0].join(', ')}`);
    
    // Parse the header row to find column indexes based on your actual sheet structure
    const headers = rows[0];
    const eventNameIndex = headers.indexOf('event_name');
    const commenceIndex = headers.indexOf('commence');
    const statusIndex = headers.indexOf('status');
    const bookmakerIndex = headers.indexOf('bookmaker');
    const odd1Index = headers.indexOf('odd_1');
    const odd2Index = headers.indexOf('odd_2');
    
    // Check if required columns exist
    if (eventNameIndex === -1 || commenceIndex === -1 || 
        statusIndex === -1 || bookmakerIndex === -1 || 
        odd1Index === -1 || odd2Index === -1) {
      console.error('❌ Required columns missing in spreadsheet');
      console.error(`Required columns: event_name, commence, status, bookmaker, odd_1, odd_2`);
      console.error(`Found columns: ${headers.join(', ')}`);
      throw new Error('Required columns missing in spreadsheet');
    }
    
    // Remove the processedMatches tracking since we want all bookmakers
    const oddsData = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length > 0 && row[eventNameIndex]) {
        const eventName = row[eventNameIndex];
        let [homeTeam, awayTeam] = eventName.includes(' vs ') ? 
          eventName.split(' vs ') : eventName.split('_');
        
        const matchId = generateMatchId(homeTeam.trim(), awayTeam.trim());
        
        oddsData.push({
          matchId: matchId,
          homeTeam: homeTeam.trim(),
          awayTeam: awayTeam.trim(),
          homeOdds: parseFloat(row[odd1Index]),
          awayOdds: parseFloat(row[odd2Index]),
          bookmaker: row[bookmakerIndex],
          commence: parseDate(row[commenceIndex]),
          status: row[statusIndex],
          lastUpdated: new Date()
        });

        console.log(`📊 Processing odds: ${homeTeam.trim()} vs ${awayTeam.trim()} from ${row[bookmakerIndex]}`);
      }
    }
    
    console.log(`✅ Successfully processed odds for ${oddsData.length} entries`);
    if (oddsData.length > 0) {
      console.log(`📊 Sample odds: ${oddsData[0].homeTeam} vs ${oddsData[0].awayTeam}, Odds: ${oddsData[0].homeOdds}-${oddsData[0].awayOdds} from ${oddsData[0].bookmaker}`);
    }
    
    return oddsData;
  } catch (error) {
    console.error('Error fetching odds from sheet:', error);
    throw error;
  }
}

module.exports = {
  fetchOddsFromSheet
};