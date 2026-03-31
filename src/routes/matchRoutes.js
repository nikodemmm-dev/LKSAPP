// backend/routes/matchRoutes.js
const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    const now = new Date(); // Pobieramy aktualną datę i godzinę

    // Logika filtrowania na podstawie daty
    if (status === 'played') {
      // Mecze rozegrane: data jest mniejsza niż "teraz"
      filter.date = { $lt: now };
    } else if (status === 'upcoming') {
      // Mecze nadchodzące: data jest większa lub równa "teraz"
      filter.date = { $gte: now };
    }

    const matches = await Match.find(filter)
      // Dla rozegranych sortujemy od najnowszych, dla nadchodzących od najbliższych
      .sort({ date: status === 'upcoming' ? 1 : -1 })
      .lean();

    res.json(matches);
  } catch (err) {
    console.error('Błąd pobierania meczów:', err);
    res.status(500).json({ ok: false, error: 'Błąd pobierania meczów' });
  }
});


// Helper do normalizacji wyniku: "2 1" / "2:1" -> "2 : 1"
function normalizeScore(raw) {
  if (!raw) return '- : -';
  const trimmed = String(raw).trim();

  // 2 1
  let m = trimmed.match(/^(\d+)\s+(\d+)$/);
  if (m) {
    return `${m[1]} : ${m[2]}`;
  }

  // 2:1 lub 2 : 1 itp.
  m = trimmed.match(/^(\d+)\s*:\s*(\d+)$/);
  if (m) {
    return `${m[1]} : ${m[2]}`;
  }

  // cokolwiek innego zostawiamy jak jest
  return trimmed;
}

// POST /api/matches – dodanie meczu
router.post('/', async (req, res) => {
  try {
    const {
      date,
      time,
      opponent,
      opponentLogoUrl,   // nowe pole
      homeAway,
      type,
      score,
    } = req.body;

    if (!date || !opponent || !homeAway) {
      return res.status(400).json({
        ok: false,
        error: 'Pola data, przeciwnik i dom/wyjazd są wymagane.',
      });
    }

    // Zamiana daty (YYYY-MM-DD) na Date
    const dateObj = new Date(date);
    const normalizedScore = normalizeScore(score);

    const match = await Match.create({
      date: dateObj,
      time: time || '',
      opponent,
      opponentLogoUrl: opponentLogoUrl || '',
      homeAway,
      type: type || 'Liga',
      score: normalizedScore,
    });

    res.status(201).json({ ok: true, match });
  } catch (err) {
    console.error('Błąd dodawania meczu:', err);
    res.status(500).json({ ok: false, error: 'Błąd dodawania meczu' });
  }
});

// PUT /api/matches/:id – edycja meczu
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      time,
      opponent,
      opponentLogoUrl,   // nowe pole
      homeAway,
      type,
      score,
    } = req.body;

    const update = {};
    if (date) update.date = new Date(date);
    if (time !== undefined) update.time = time;
    if (opponent !== undefined) update.opponent = opponent;
    if (opponentLogoUrl !== undefined) update.opponentLogoUrl = opponentLogoUrl;
    if (homeAway !== undefined) update.homeAway = homeAway;
    if (type !== undefined) update.type = type;
    if (score !== undefined) update.score = normalizeScore(score);

    const match = await Match.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!match) {
      return res
        .status(404)
        .json({ ok: false, error: 'Nie znaleziono meczu o podanym ID.' });
    }

    res.json({ ok: true, match });
  } catch (err) {
    console.error('Błąd edycji meczu:', err);
    res.status(500).json({ ok: false, error: 'Błąd edycji meczu' });
  }
});

// DELETE /api/matches/:id – usunięcie meczu
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Match.findByIdAndDelete(id);

    if (!result) {
      return res
        .status(404)
        .json({ ok: false, error: 'Nie znaleziono meczu do usunięcia.' });
    }

    res.json({ ok: true, message: 'Mecz został usunięty.' });
  } catch (err) {
    console.error('Błąd usuwania meczu:', err);
    res.status(500).json({ ok: false, error: 'Błąd usuwania meczu' });
  }
});

module.exports = router;

