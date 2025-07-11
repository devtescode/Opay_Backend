const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'useropay', // Reference to the User schema
        required: true
    },
    deviceInfo: {
        type: String,
        required: true
    },
    loggedInAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 60 * 60 * 1000) // Expires in 1 hour
    }
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
