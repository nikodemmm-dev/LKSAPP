const mongoose = require('mongoose');

const dutySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['current', 'next'], // aktualny tydzień / następny tydzień
      required: true,
    },
    from: {
      type: Date,
      required: true, // początek tygodnia (np. wtorek)
    },
    to: {
      type: Date,
      required: true, // koniec tygodnia (np. niedziela)
    },
    players: {
      type: [String], // lista imion i nazwisk dyżurnych
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Duty', dutySchema);
