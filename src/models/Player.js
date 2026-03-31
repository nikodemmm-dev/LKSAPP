// models/Player.js
const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    preferredFoot: {
      type: String, // 'lewa' / 'prawa' / 'obie' itd.
      trim: true,
    },
    birthDate: {
      type: Date,
    },
    shirtNumber: {
      type: Number,
    },
    goals: {
      type: Number,
      default: 0,
      min: 0,
    },
    assists: {
      type: Number,
      default: 0,
      min: 0,
    },
    yellowCards: {
      type: Number,
      default: 0,
      min: 0,
    },
    redCards: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Player', PlayerSchema);




