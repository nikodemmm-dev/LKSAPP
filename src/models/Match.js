// models/Match.js
const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },              
    time: { type: String, required: true },            
    opponent: { type: String, required: true },        
    opponentLogoUrl: { type: String, default: '' },
    homeAway: {
      type: String,
      enum: ['Dom', 'Wyjazd'],
      required: true,
    },
    type: { type: String, default: 'Liga' },           
    score: { type: String, default: '- : -' },         
    scorersNote: { type: String, default: '' },        
    assistsNote: { type: String, default: '' },        
    cardsNote: { type: String, default: '' },          
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('Match', MatchSchema);