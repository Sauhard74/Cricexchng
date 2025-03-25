const mongoose = require('mongoose');

const matchMappingSchema = new mongoose.Schema({
    oddsMatchId: {
        type: String,
        required: true,
        unique: true
    },
    sportradarMatchId: {
        type: String,
        required: true
    },
    homeTeam: {
        type: String,
        required: true
    },
    awayTeam: {
        type: String,
        required: true
    },
    scheduled: {
        type: Date,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MatchMapping', matchMappingSchema); 