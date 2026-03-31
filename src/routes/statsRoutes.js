// backend/routes/statsRoutes.js
const express = require('express');
const router = express.Router();

const Match = require('../models/Match');           // mecze LKS
const LeagueMatch = require('../models/LeagueMatch'); // mecze pozostałych drużyn

// Nazwa naszego klubu – używana przy przeliczaniu naszych meczów
const CLUB_NAME = 'LKS Wilamowiczanka';

// Pomocniczo – bezpieczne parsowanie liczby
function safeInt(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/stats/summary
 * Krótkie podsumowanie do index.html (szybkie info + sekcja statystyk).
 * Masz już front tolerujący różne nazwy, więc tutaj dajemy:
 * {
 *   team: { totalMatches, goalsFor, goalsAgainst, goalDiff, position, points },
 *   topScorers: [{ name, goals }]
 * }
 */
router.get('/summary', async (req, res) => {
  try {
    // 1) ZAWODNICY → top strzelcy
    const Player = require('../models/Player');
    const players = await Player.find({}).lean();

    // posortuj po bramkach malejąco
    const sortedByGoals = [...players].sort((a, b) => {
      const ga = safeInt(a.goals ?? a.bramki);
      const gb = safeInt(b.goals ?? b.bramki);
      return gb - ga;
    });

    const topScorers = sortedByGoals.slice(0, 5).map((p) => ({
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Zawodnik',
      goals: safeInt(p.goals ?? p.bramki),
    }));

    // 2) MECZE → podsumowanie drużyny ( tylko LIGA )
    const matches = await Match.find({ type: 'Liga' }).lean();

    let totalMatches = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const m of matches) {
      let gf = null;
      let ga = null;

      // jeśli mamy pola liczbowe goalsFor / goalsAgainst
      if (typeof m.goalsFor === 'number' && typeof m.goalsAgainst === 'number') {
        gf = m.goalsFor;
        ga = m.goalsAgainst;
      } else if (m.score && typeof m.score === 'string') {
        // lub score w formacie "2 : 1" / "2:1"
        const cleaned = m.score.replace(/\s/g, '');
        const [s1, s2] = cleaned.split(':').map((x) => parseInt(x, 10));
        if (Number.isFinite(s1) && Number.isFinite(s2)) {
          gf = s1;
          ga = s2;
        }
      }

      if (gf == null || ga == null) {
        continue; // mecz bez wyniku – pomijamy
      }

      totalMatches++;
      goalsFor += gf;
      goalsAgainst += ga;

      if (gf > ga) wins++;
      else if (gf === ga) draws++;
      else losses++;
    }

    const goalDiff = goalsFor - goalsAgainst;
    const points = wins * 3 + draws * 1;

    // UWAGA: miejsce w tabeli (position) wypełni ostatecznie /league-table,
    // ale tutaj możemy (opcjonalnie) spróbować je wyciągnąć z tamtej logiki.
    // Na szybko – zostawiamy null, front i tak to ogarnia.
    const summary = {
      team: {
        season: '2024/2025',
        totalMatches,
        goalsFor,
        goalsAgainst,
        goalDiff,
        wins,
        draws,
        losses,
        points,
        position: null,
      },
      topScorers,
    };

    res.json(summary);
  } catch (err) {
    console.error('Błąd w /api/stats/summary:', err);
    res.status(500).json({ ok: false, error: 'Błąd pobierania statystyk' });
  }
});

/**
 * GET /api/stats/league-table
 * Liczy tabelę z:
 *  - naszych meczów LKS (kolekcja Match, tylko LIGA),
 *  - meczów reszty drużyn (kolekcja LeagueMatch).
 *
 * ZASADY:
 *  - 3 pkt za zwycięstwo, 1 pkt za remis, 0 za porażkę
 *  - sortowanie: najpierw punkty, potem liczba bramek strzelonych (gf),
 *    opcjonalnie jeszcze różnica bramek
 */
router.get('/league-table', async (req, res) => {
  try {
    // 1) Pobierz mecze LKS 
    const ourMatches = await Match.find({ type: 'Liga' }).lean();

    const allMatches = [];

    for (const m of ourMatches) {
      let gf = null;
      let ga = null;

      // spróbuj wziąć bezpośrednio goalsFor/goalsAgainst
      if (typeof m.goalsFor === 'number' && typeof m.goalsAgainst === 'number') {
        gf = m.goalsFor;
        ga = m.goalsAgainst;
      } else if (m.score && typeof m.score === 'string') {
        // "2 : 1" / "2:1"
        const cleaned = m.score.replace(/\s/g, '');
        const [s1, s2] = cleaned.split(':').map((x) => parseInt(x, 10));
        if (Number.isFinite(s1) && Number.isFinite(s2)) {
          gf = s1;
          ga = s2;
        }
      }

      if (gf == null || ga == null) {
        // brak wyniku – omijamy przy liczeniu tabeli
        continue;
      }

      // ustalenie, kto był gospodarzem
      const isHome =
        typeof m.isHome === 'boolean'
          ? m.isHome
          : m.homeAway === 'Dom';

      const opponent = m.opponent || m.awayTeam || m.homeTeam || 'Przeciwnik';

      let homeTeam, awayTeam, homeGoals, awayGoals;

      if (isHome) {
        homeTeam = CLUB_NAME;
        awayTeam = opponent;
        homeGoals = gf;
        awayGoals = ga;
      } else {
        homeTeam = opponent;
        awayTeam = CLUB_NAME;
        homeGoals = ga;
        awayGoals = gf;
      }

      allMatches.push({
        date: m.date || null,
        homeTeam,
        awayTeam,
        homeGoals,
        awayGoals,
      });
    }

    // 2) Pobierz mecze z kolekcji LeagueMatch
    const leagueMatches = await LeagueMatch.find({}).lean();

    for (const lm of leagueMatches) {
      // tu zakładamy, że w modelu są homeTeam, awayTeam, homeGoals, awayGoals
      let hg = null;
      let ag = null;

      if (typeof lm.homeGoals === 'number' && typeof lm.awayGoals === 'number') {
        hg = lm.homeGoals;
        ag = lm.awayGoals;
      } else if (lm.score && typeof lm.score === 'string') {
        const cleaned = lm.score.replace(/\s/g, '');
        const [s1, s2] = cleaned.split(':').map((x) => parseInt(x, 10));
        if (Number.isFinite(s1) && Number.isFinite(s2)) {
          hg = s1;
          ag = s2;
        }
      }

      if (hg == null || ag == null) {
        continue;
      }

      const homeTeam = lm.homeTeam || 'Gospodarz';
      const awayTeam = lm.awayTeam || 'Goście';

      allMatches.push({
        date: lm.date || null,
        homeTeam,
        awayTeam,
        homeGoals: hg,
        awayGoals: ag,
      });
    }

    // 3) Jeśli dalej brak jakichkolwiek meczów – pusta tabela
    if (!allMatches.length) {
      return res.json({ table: [] });
    }

    // 4) Liczymy statystyki dla każdej drużyny
    const tableMap = new Map();

    function ensureTeam(name) {
      if (!tableMap.has(name)) {
        tableMap.set(name, {
          teamName: name,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        });
      }
      return tableMap.get(name);
    }

    for (const m of allMatches) {
      const home = ensureTeam(m.homeTeam);
      const away = ensureTeam(m.awayTeam);

      home.played++;
      away.played++;

      home.goalsFor += m.homeGoals;
      home.goalsAgainst += m.awayGoals;

      away.goalsFor += m.awayGoals;
      away.goalsAgainst += m.homeGoals;

      if (m.homeGoals > m.awayGoals) {
        // wygrana gospodarzy
        home.wins++;
        home.points += 3;
        away.losses++;
      } else if (m.homeGoals < m.awayGoals) {
        // wygrana gości
        away.wins++;
        away.points += 3;
        home.losses++;
      } else {
        // remis
        home.draws++;
        away.draws++;
        home.points += 1;
        away.points += 1;
      }
    }

    // policz różnice bramkowe
    for (const team of tableMap.values()) {
      team.goalDiff = team.goalsFor - team.goalsAgainst;
    }

    // 5) Zmapuj na tablicę i posortuj:
    //   - najpierw pkt, potem gole strzelone, potem różnica
    let table = Array.from(tableMap.values());

    table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return b.goalDiff - a.goalDiff;
    });

    // 6) Ustaw pozycje (miejsce w tabeli)
    table = table.map((t, idx) => ({
      position: idx + 1,
      ...t,
    }));

    res.json({ table });
  } catch (err) {
    console.error('Błąd w /api/stats/league-table:', err);
    res
      .status(500)
      .json({ ok: false, error: 'Błąd generowania tabeli ligowej' });
  }
});

module.exports = router;