// routes/leagueMatchRoutes.js
const express = require('express');
const LeagueMatch = require('../models/LeagueMatch');

const router = express.Router();

// GET /api/league-matches  – lista wszystkich meczów ligi
router.get('/', async (req, res) => {
  try {
    const matches = await LeagueMatch.find().sort({ date: 1 });
    res.json(matches);
  } catch (err) {
    console.error('Błąd pobierania meczów ligi:', err);
    res.status(500).json({ ok: false, error: 'Błąd pobierania meczów ligi' });
  }
});

// POST /api/league-matches  – dodanie meczu
router.post('/', async (req, res) => {
  try {
    const { date, homeTeam, awayTeam, homeGoals, awayGoals } = req.body;

    const match = await LeagueMatch.create({
      date,
      homeTeam,
      awayTeam,
      homeGoals,
      awayGoals,
    });

    res.status(201).json(match);
  } catch (err) {
    console.error('Błąd dodawania meczu ligi:', err);
    res.status(500).json({ ok: false, error: 'Błąd dodawania meczu ligi' });
  }
});

// PUT /api/league-matches/:id  – edycja
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, homeTeam, awayTeam, homeGoals, awayGoals } = req.body;

    const updated = await LeagueMatch.findByIdAndUpdate(
      id,
      { date, homeTeam, awayTeam, homeGoals, awayGoals },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Mecz ligi nie znaleziony' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Błąd edycji meczu ligi:', err);
    res.status(500).json({ ok: false, error: 'Błąd edycji meczu ligi' });
  }
});

// DELETE /api/league-matches/:id  – usunięcie
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await LeagueMatch.findByIdAndDelete(id);

    if (!removed) {
      return res.status(404).json({ ok: false, error: 'Mecz ligi nie znaleziony' });
    }

    res.json({ ok: true, message: 'Usunięto mecz ligi' });
  } catch (err) {
    console.error('Błąd usuwania meczu ligi:', err);
    res.status(500).json({ ok: false, error: 'Błąd usuwania meczu ligi' });
  }
});

module.exports = router;
