// public/js/admin-matches.js

// helper do pobierania JSON z obsługą błędów HTTP
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} dla ${url}`);
  }
  return res.json();
}

// prosty escapowanie tekstu do tytułów (title="...")
function escapeForTitle(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}

function resetMatchForm() {
  document.getElementById('matchId').value = '';
  document.getElementById('matchDate').value = '';
  document.getElementById('matchTime').value = '';
  document.getElementById('matchOpponent').value = '';
  document.getElementById('matchHomeAway').value = '';
  document.getElementById('matchType').value = 'Liga';
  document.getElementById('matchScore').value = '';
  document.getElementById('matchScorersNote').value = '';
  document.getElementById('matchAssistsNote').value = '';
  document.getElementById('matchCardsNote').value = '';
  document.getElementById('matchFormMessage').textContent = '';
}

function fillMatchForm(match) {
  document.getElementById('matchId').value = match._id || '';

  if (match.date) {
    const d = new Date(match.date);
    if (!isNaN(d.getTime())) {
      document.getElementById('matchDate').value = d
        .toISOString()
        .slice(0, 10);
    }
  } else {
    document.getElementById('matchDate').value = '';
  }

  document.getElementById('matchTime').value = match.time || '';
  document.getElementById('matchOpponent').value = match.opponent || '';
  document.getElementById('matchHomeAway').value = match.homeAway || '';
  document.getElementById('matchType').value = match.type || 'Liga';
  document.getElementById('matchScore').value = match.score || '';

  document.getElementById('matchScorersNote').value =
    match.scorersNote || '';
  document.getElementById('matchAssistsNote').value =
    match.assistsNote || '';
  document.getElementById('matchCardsNote').value = match.cardsNote || '';
}

// normalizacja wyniku (2 1 -> 2 : 1, 2:1 -> 2 : 1 itd.)
function normalizeScore(rawScore) {
  let score = (rawScore || '').trim();

  if (!score) return '- : -';

  // jeśli "- : -" lub "--" itp. – traktuj jako brak
  if (score === '-:-' || score === '-' || score === ':') {
    return '- : -';
  }

  // format "2 1"
  const spaceMatch = score.match(/^(\d+)\s+(\d+)$/);
  if (spaceMatch) {
    return `${spaceMatch[1]} : ${spaceMatch[2]}`;
  }

  // format "2:1" lub "2 : 1"
  const colonMatch = score.match(/^(\d+)\s*:\s*(\d+)$/);
  if (colonMatch) {
    return `${colonMatch[1]} : ${colonMatch[2]}`;
  }

  // cokolwiek innego zostawiamy (żeby nie blokować nietypowych wyników)
  return score;
}

// nie pozwalamy wpisać wyniku dla meczu w przyszłości
function validateScoreAgainstDate(dateStr, score) {
  if (!dateStr) return { ok: true };

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { ok: true };

  const today = new Date();
  // zerujemy godzinę dla porównania tylko dat
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  if (d > today && score !== '- : -') {
    return {
      ok: false,
      message: 'Nie możesz wpisać wyniku dla meczu, który jeszcze się nie odbył.',
    };
  }

  return { ok: true };
}

async function saveMatch() {
  const id = document.getElementById('matchId').value.trim();
  const dateStr = document.getElementById('matchDate').value;
  const time = document.getElementById('matchTime').value.trim();
  const opponent = document.getElementById('matchOpponent').value.trim();
  const homeAway = document.getElementById('matchHomeAway').value;
  const type = document.getElementById('matchType').value;
  const rawScore = document.getElementById('matchScore').value;

  const scorersNote = document
    .getElementById('matchScorersNote')
    .value.trim();
  const assistsNote = document
    .getElementById('matchAssistsNote')
    .value.trim();
  const cardsNote = document.getElementById('matchCardsNote').value.trim();

  const msgEl = document.getElementById('matchFormMessage');
  msgEl.textContent = '';

  // prosta walidacja pól wymaganych
  if (!dateStr || !time || !opponent || !homeAway) {
    msgEl.textContent = 'Uzupełnij datę, godzinę, przeciwnika oraz Dom/Wyjazd.';
    return;
  }

  // normalizacja wyniku
  const score = normalizeScore(rawScore);

  // blokada wyniku dla przyszłych meczów
  const dateCheck = validateScoreAgainstDate(dateStr, score);
  if (!dateCheck.ok) {
    msgEl.textContent = dateCheck.message;
    return;
  }

  const payload = {
    date: dateStr,
    time,
    opponent,
    homeAway,
    type,
    score,
    scorersNote,
    assistsNote,
    cardsNote,
  };

  try {
    if (id) {
      // edycja
      await fetchJson(`/api/matches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Zaktualizowano mecz.';
    } else {
      // nowy mecz
      await fetchJson('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Dodano nowy mecz.';
    }

    resetMatchForm();
    await loadMatches();
  } catch (err) {
    console.error('Błąd przy zapisie meczu:', err);
    msgEl.textContent = 'Błąd przy zapisie meczu: ' + err.message;
  }
}

async function deleteMatch(id) {
  if (!id) return;
  const ok = confirm('Na pewno usunąć ten mecz?');
  if (!ok) return;

  try {
    await fetchJson(`/api/matches/${id}`, { method: 'DELETE' });
    await loadMatches();
  } catch (err) {
    console.error('Błąd przy usuwaniu meczu:', err);
    alert('Błąd przy usuwaniu meczu: ' + err.message);
  }
}

async function loadMatches() {
  const tbody = document.getElementById('adminMatchesBody');
  const msgEl = document.getElementById('matchesTableMessage');

  if (!tbody || !msgEl) {
    console.error('Brakuje adminMatchesBody lub matchesTableMessage w HTML');
    return;
  }

  msgEl.textContent = 'Ładuję mecze...';

  try {
    const data = await fetchJson('/api/matches');
    const matches = Array.isArray(data) ? data : data.matches || [];

    if (!matches.length) {
      msgEl.textContent = 'Brak meczów w bazie.';
      tbody.innerHTML = '';
      return;
    }

    msgEl.textContent = '';

    // sortujemy po dacie rosnąco
    matches.sort((a, b) => {
      const da = a.date ? new Date(a.date) : 0;
      const db = b.date ? new Date(b.date) : 0;
      return da - db;
    });

    const rowsHtml = matches
      .map((m) => {
        const d = m.date ? new Date(m.date) : null;
        const dateStr = d ? d.toISOString().slice(0, 10) : '';
        const timeStr = m.time || '';
        const opponent = m.opponent || '';
        const homeAway = m.homeAway || '';
        const type = m.type || '';
        const score = m.score || '- : -';

        const scorersNote = m.scorersNote || '';
        const assistsNote = m.assistsNote || '';
        const cardsNote = m.cardsNote || '';

        const hasScorers = !!scorersNote.trim();
        const hasAssists = !!assistsNote.trim();
        const hasCards = !!cardsNote.trim();

        const scoreClass =
          score === '- : -' ? 'text-slate-400' : 'font-semibold';

        // ikonki z dymkiem (tooltip = title)
        const scorersCell = hasScorers
          ? `<button type="button"
                     class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] hover:bg-emerald-100"
                     title="${escapeForTitle(scorersNote)}">
               ℹ️
             </button>`
          : '<span class="text-slate-400">—</span>';

        const assistsCell = hasAssists
          ? `<button type="button"
                     class="px-2 py-1 rounded bg-sky-50 text-sky-700 text-[11px] hover:bg-sky-100"
                     title="${escapeForTitle(assistsNote)}">
               ℹ️
             </button>`
          : '<span class="text-slate-400">—</span>';

        const cardsCell = hasCards
          ? `<button type="button"
                     class="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[11px] hover:bg-amber-100"
                     title="${escapeForTitle(cardsNote)}">
               🟨
             </button>`
          : '<span class="text-slate-400">—</span>';

        return `
          <tr class="border-b last:border-0">
            <td class="py-2 pr-2">${dateStr}</td>
            <td class="py-2 pr-2">${timeStr}</td>
            <td class="py-2 pr-2">${opponent}</td>
            <td class="py-2 pr-2">${homeAway}</td>
            <td class="py-2 pr-2">${type}</td>
            <td class="py-2 pr-2 ${scoreClass}">${score}</td>
            <td class="py-2 pr-2">${scorersCell}</td>
            <td class="py-2 pr-2">${assistsCell}</td>
            <td class="py-2 pr-2">${cardsCell}</td>
            <td class="py-2 pr-2 text-right">
              <button
                type="button"
                class="text-xs text-green-700 hover:underline mr-2"
                data-action="edit"
                data-id="${m._id}"
              >
                Edytuj
              </button>
              <button
                type="button"
                class="text-xs text-red-600 hover:underline"
                data-action="delete"
                data-id="${m._id}"
              >
                Usuń
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error('Błąd przy pobieraniu /api/matches:', err);
    msgEl.textContent = 'Błąd przy pobieraniu meczów: ' + err.message;
    tbody.innerHTML = '';
  }
}

// inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveMatchBtn');
  const resetBtn = document.getElementById('resetMatchFormBtn');
  const tbody = document.getElementById('adminMatchesBody');

  if (saveBtn) {
    saveBtn.addEventListener('click', saveMatch);
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', resetMatchForm);
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!id) return;

      if (action === 'delete') {
        deleteMatch(id);
      } else if (action === 'edit') {
        // najprościej: pobierz całą listę i znajdź mecz po _id
        fetchJson('/api/matches')
          .then((data) => {
            const matches = Array.isArray(data) ? data : data.matches || [];
            const match = matches.find((m) => m._id === id);
            if (match) {
              fillMatchForm(match);
              const msgEl = document.getElementById('matchFormMessage');
              if (msgEl) msgEl.textContent = 'Edytujesz wybrany mecz.';
            }
          })
          .catch((err) => {
            console.error('Błąd przy pobieraniu meczu do edycji:', err);
          });
      }
    });
  }

  loadMatches();
});



