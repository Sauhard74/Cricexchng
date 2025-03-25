const mongoose = require("mongoose");

const oddsSchema = new mongoose.Schema({
    home: Number,
    away: Number,
    draw: Number,
    bookmaker: String,
    last_update: Date
}, { _id: false });

const matchSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        unique: true
    },
    home_team: {
        type: String,
        required: true
    },
    away_team: {
        type: String,
        required: true
    },
    scheduled: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'live', 'completed', 'cancelled', 'postponed'],
        default: 'scheduled'
    },
    format: {
        type: String,
        enum: ['T20', 'ODI', 'Test', 'Other'],
        default: 'Other'
    },
    venue: String,
    competition: String,
    odds: {
        type: [oddsSchema],
        default: []
    },
    score: {
        home: {
            runs: Number,
            wickets: Number,
            overs: Number
        },
        away: {
            runs: Number,
            wickets: Number,
            overs: Number
        }
    },
    winner: String,
    toss_winner: String,
    toss_decision: String,
    last_updated: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add a pre-save middleware to ensure dates are handled correctly
matchSchema.pre('save', function(next) {
    if (this.scheduled && typeof this.scheduled === 'string') {
        this.scheduled = new Date(this.scheduled);
    }
    this.last_updated = new Date();
    next();
});

// Add a helper function to normalize status before saving
matchSchema.pre('save', function(next) {
    const statusMap = {
        'not_started': 'scheduled',
        'pending': 'scheduled',
        'in_progress': 'live',
        'in_play': 'live',
        'finished': 'completed',
        'closed': 'completed',
        'abandoned': 'cancelled',
        'interrupted': 'postponed'
    };

    if (statusMap[this.status]) {
        this.status = statusMap[this.status];
    }

    next();
});

// Virtual for latest odds
matchSchema.virtual('latest_odds').get(function() {
    if (!this.odds || this.odds.length === 0) return null;
    return this.odds.sort((a, b) => b.last_update - a.last_update)[0];
});

// Method to update odds
matchSchema.methods.updateOdds = function(newOdds) {
    this.odds.push({
        ...newOdds,
        last_update: new Date()
    });
    return this.save();
};

// Method to update score
matchSchema.methods.updateScore = function(homeScore, awayScore) {
    this.score = {
        home: homeScore,
        away: awayScore
    };
    this.last_updated = new Date();
    return this.save();
};

const Match = mongoose.model("Match", matchSchema);

module.exports = Match;

