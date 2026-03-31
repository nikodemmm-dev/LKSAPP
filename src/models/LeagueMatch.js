// models/LeagueMatch.js
const mongoose = require('mongoose');

const LeagueMatchSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    homeGoals: { type: Number, required: true },
    awayGoals: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LeagueMatch', LeagueMatchSchema);
