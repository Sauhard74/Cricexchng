const axios = require('axios');
const Match = require('../models/Match');
const MatchMapping = require('../models/MatchMapping');

const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = 'https://api.sportradar.us/cricket-t2/en';

// Team name mappings for better matching
const TEAM_MAPPINGS = {
    'gujarat': ['gujarat', 'gt', 'gujarat titans'],
    'punjab': ['punjab', 'pbks', 'punjab kings'],
    'bangalore': ['bangalore', 'rcb', 'royal challengers bangalore'],
    'chennai': ['chennai', 'csk', 'chennai super kings'],
    'kolkata': ['kolkata', 'kkr', 'kolkata knight riders'],
    'mumbai': ['mumbai', 'mi', 'mumbai indians'],
    'lucknow': ['lucknow', 'lsg', 'lucknow super giants'],
    'delhi': ['delhi', 'dc', 'delhi capitals'],
    'rajasthan': ['rajasthan', 'rr', 'rajasthan royals'],
    'hyderabad': ['hyderabad', 'srh', 'sunrisers hyderabad']
};

/**
 * Helper function to normalize team names for comparison
 * @param {string} name - Team name to normalize
 * @returns {string} - Normalized team name
 */
function normalizeTeamName(name) {
    if (!name) return '';
    
    // Convert to lowercase and remove special characters
    const normalized = name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    // Try to match with known team variations
    for (const [key, variations] of Object.entries(TEAM_MAPPINGS)) {
        if (variations.some(v => normalized.includes(v))) {
            return key;
        }
    }

    return normalized;
}

/**
 * Find Sportradar match ID for a given odds match ID
 * @param {string} oddsMatchId - Match ID from odds database
 * @returns {Promise<string|null>} - Sportradar match ID if found, null otherwise
 */
async function findSportradarMatchId(oddsMatchId) {
    try {
        console.log(`🔍 Finding Sportradar match ID for odds match: ${oddsMatchId}`);

        // Check if we already have a mapping
        const existingMapping = await MatchMapping.findOne({ oddsMatchId });
        if (existingMapping) {
            console.log('✅ Found existing mapping');
            return existingMapping.sportradarMatchId;
        }

        // Get match details from odds database
        const match = await Match.findOne({ matchId: oddsMatchId });
        if (!match) {
            console.log('❌ Match not found in odds database');
            return null;
        }

        if (!match.home_team || !match.away_team) {
            console.log('❌ Match found but missing team names:', match);
            return null;
        }

        console.log('📊 Match details from odds:', {
            home_team: match.home_team,
            away_team: match.away_team,
            scheduled: match.scheduled
        });

        // Get the specific date for the match
        const matchDate = new Date(match.scheduled);
        const dateStr = matchDate.toISOString().split('T')[0];
        
        console.log('📅 Searching for matches on:', dateStr);

        // Get matches from Sportradar API
        const url = `${BASE_URL}/schedules/${dateStr}/schedule.json?api_key=${API_KEY}`;
        console.log('🔗 Fetching from Sportradar:', url);

        const response = await axios.get(url);
        const schedules = response.data.sport_events || [];

        console.log(`📊 Found ${schedules.length} total matches in schedule`);

        // Filter for IPL 2025 matches only
        const iplMatches = schedules.filter(event => 
            event.tournament?.name === 'Indian Premier League 2025'
        );

        // Log full tournament details for debugging
        console.log('Available tournaments:', schedules.map(event => ({
            name: event.tournament?.name,
            id: event.tournament?.id
        })));

        console.log(`📊 Found ${iplMatches.length} IPL 2025 matches`);

        // Normalize team names from odds
        const normalizedHomeTeam = normalizeTeamName(match.home_team);
        const normalizedAwayTeam = normalizeTeamName(match.away_team);

        console.log('Normalized team names from odds:', {
            original: {
                home: match.home_team,
                away: match.away_team
            },
            normalized: {
                home: normalizedHomeTeam,
                away: normalizedAwayTeam
            }
        });

        // Find matching match
        const matchingEvent = iplMatches.find(event => {
            if (!event.competitors || event.competitors.length < 2) {
                return false;
            }

            const eventHomeTeam = normalizeTeamName(event.competitors[0].name);
            const eventAwayTeam = normalizeTeamName(event.competitors[1].name);

            console.log('Comparing with Sportradar teams:', {
                original: {
                    home: event.competitors[0].name,
                    away: event.competitors[1].name
                },
                normalized: {
                    home: eventHomeTeam,
                    away: eventAwayTeam
                }
            });

            // Check if teams match (in any order)
            const teamsMatch = (
                (eventHomeTeam === normalizedHomeTeam && eventAwayTeam === normalizedAwayTeam) ||
                (eventHomeTeam === normalizedAwayTeam && eventAwayTeam === normalizedHomeTeam)
            );

            if (teamsMatch) {
                console.log('✅ Found matching teams:', {
                    sportradar: {
                        home: event.competitors[0].name,
                        away: event.competitors[1].name
                    },
                    odds: {
                        home: match.home_team,
                        away: match.away_team
                    }
                });
            }

            return teamsMatch;
        });

        if (matchingEvent) {
            console.log('✅ Found matching match:', matchingEvent.id);

            // Create new mapping
            const newMapping = new MatchMapping({
                oddsMatchId,
                sportradarMatchId: matchingEvent.id,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                scheduled: match.scheduled
            });

            await newMapping.save();
            console.log('✅ Saved new mapping');

            return matchingEvent.id;
        }

        console.log('❌ No matching match found');
        return null;
    } catch (error) {
        console.error('❌ Error finding Sportradar match:', error);
        console.error('Stack:', error.stack);
        return null;
    }
}

module.exports = {
    findSportradarMatchId,
    normalizeTeamName
}; 