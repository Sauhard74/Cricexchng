const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        unique: true
    },
    team1: String,
    team2: String,
    scheduled: Date,
    status: {
        type: String,
        default: 'scheduled'
    },
    winner: { type: String },
}, { timestamps: true });

// Add a pre-save middleware to ensure dates are handled correctly
matchSchema.pre('save', function(next) {
    if (this.scheduled && typeof this.scheduled === 'string') {
        this.scheduled = new Date(this.scheduled);
    }
    next();
});

// Add a helper function to normalize status before saving
matchSchema.pre('save', function(next) {
    // Map various status values to our enum values
    const statusMap = {
        'not_started': 'scheduled',
        'pending': 'scheduled',
        'finished': 'completed',
        'closed': 'completed'
    };

    if (statusMap[this.status]) {
        this.status = statusMap[this.status];
    }

    next();
});

const Match = mongoose.model("Match", matchSchema);

module.exports = Match;

