// routes/playerRoutes.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// GET /api/players – lista wszystkich zawodników
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().sort({ shirtNumber: 1, lastName: 1 });
    res.json(players);
  } catch (err) {
    console.error('Błąd pobierania zawodników:', err);
    res.status(500).json({ ok: false, error: 'Błąd pobierania zawodników' });
  }
});

// GET /api/players/:id – pojedynczy zawodnik
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono zawodnika' });
    }
    res.json(player);
  } catch (err) {
    console.error('Błąd pobierania zawodnika:', err);
    res.status(500).json({ ok: false, error: 'Błąd pobierania zawodnika' });
  }
});

// POST /api/players – (opcjonalnie) tworzenie nowego
router.post('/', async (req, res) => {
  try {
    const player = new Player(req.body);
    const saved = await player.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Błąd tworzenia zawodnika:', err);
    res.status(400).json({ ok: false, error: 'Błąd tworzenia zawodnika' });
  }
});

// PUT /api/players/:id – pełna aktualizacja (np. edycja danych zawodnika)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono zawodnika' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Błąd aktualizacji zawodnika:', err);
    res.status(400).json({ ok: false, error: 'Błąd aktualizacji zawodnika' });
  }
});

// DELETE /api/players/:id – usunięcie zawodnika
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Player.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono zawodnika' });
    }
    res.json({ ok: true, message: 'Usunięto zawodnika' });
  } catch (err) {
    console.error('Błąd usuwania zawodnika:', err);
    res.status(500).json({ ok: false, error: 'Błąd usuwania zawodnika' });
  }
});

// PATCH /api/players/:id/stats – aktualizacja samych statystyk (bramki, asysty, kartki)
router.patch('/:id/stats', async (req, res) => {
  try {
    const { goals, assists, yellowCards, redCards } = req.body;

    const update = {};
    if (goals != null) update.goals = goals;
    if (assists != null) update.assists = assists;
    if (yellowCards != null) update.yellowCards = yellowCards;
    if (redCards != null) update.redCards = redCards;

    const updated = await Player.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono zawodnika' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Błąd aktualizacji statystyk zawodnika:', err);
    res.status(400).json({ ok: false, error: 'Błąd aktualizacji statystyk zawodnika' });
  }
});

module.exports = router;