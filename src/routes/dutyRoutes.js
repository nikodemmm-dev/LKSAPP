// routes/dutyRoutes.js
const express = require('express');
const router = express.Router();
const Duty = require('../models/Duty');

// GET /api/duties – lista wszystkich dyżurnych
router.get('/', async (req, res) => {
  try {
    const duties = await Duty.find().sort({ from: 1 });
    res.json(duties);
  } catch (err) {
    console.error('Błąd przy pobieraniu dyżurnych:', err);
    res.status(500).json({ ok: false, error: 'Błąd przy pobieraniu dyżurnych' });
  }
});

// GET /api/duties/:id – pojedynczy wpis (np. do edycji)
router.get('/:id', async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono dyżurnego' });
    }
    res.json(duty);
  } catch (err) {
    console.error('Błąd przy pobieraniu dyżurnego:', err);
    res.status(500).json({ ok: false, error: 'Błąd przy pobieraniu dyżurnego' });
  }
});

// POST /api/duties – dodanie nowych dyżurnych
router.post('/', async (req, res) => {
  try {
    const { type, from, to, players } = req.body;

    if (!type || !from || !to) {
      return res.status(400).json({ ok: false, error: 'Brak wymaganych pól (type, from, to)' });
    }

    const duty = new Duty({
      type,
      from,
      to,
      players: Array.isArray(players) ? players : [],
    });

    await duty.save();
    res.status(201).json(duty);
  } catch (err) {
    console.error('Błąd przy tworzeniu dyżurnych:', err);
    res.status(500).json({ ok: false, error: 'Błąd przy tworzeniu dyżurnych' });
  }
});

// PUT /api/duties/:id – aktualizacja istniejącego wpisu
router.put('/:id', async (req, res) => {
  try {
    const { type, from, to, players } = req.body;

    const duty = await Duty.findByIdAndUpdate(
      req.params.id,
      {
        type,
        from,
        to,
        players: Array.isArray(players) ? players : [],
      },
      { new: true, runValidators: true }
    );

    if (!duty) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono dyżurnego do aktualizacji' });
    }

    res.json(duty);
  } catch (err) {
    console.error('Błąd przy aktualizacji dyżurnych:', err);
    res.status(500).json({ ok: false, error: 'Błąd przy aktualizacji dyżurnych' });
  }
});

// DELETE /api/duties/:id – usunięcie wpisu
router.delete('/:id', async (req, res) => {
  try {
    const duty = await Duty.findByIdAndDelete(req.params.id);
    if (!duty) {
      return res.status(404).json({ ok: false, error: 'Nie znaleziono dyżurnego do usunięcia' });
    }
    res.json({ ok: true, message: 'Usunięto dyżurnych' });
  } catch (err) {
    console.error('Błąd przy usuwaniu dyżurnych:', err);
    res.status(500).json({ ok: false, error: 'Błąd przy usuwaniu dyżurnych' });
  }
});

module.exports = router;