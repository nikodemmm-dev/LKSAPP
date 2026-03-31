// public/js/admin-league-matches.js

async function leagueFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} dla ${url}`);
  }
  return res.json();
}

function resetLeagueMatchForm() {
  document.getElementById('leagueMatchId').value = '';
  document.getElementById('leagueMatchDate').value = '';
  document.getElementById('leagueHomeTeam').value = '';
  document.getElementById('leagueAwayTeam').value = '';
  document.getElementById('leagueHomeGoals').value = '';
  document.getElementById('leagueAwayGoals').value = '';
  const msgEl = document.getElementById('leagueMatchFormMessage');
  if (msgEl) msgEl.textContent = '';
}

// wypełnienie formularza przy edycji
function fillLeagueMatchForm(match) {
  document.getElementById('leagueMatchId').value = match._id || '';
  document.getElementById('leagueMatchDate').value = match.date
    ? new Date(match.date).toISOString().slice(0, 10)
    : '';
  document.getElementById('leagueHomeTeam').value = match.homeTeam || '';
  document.getElementById('leagueAwayTeam').value = match.awayTeam || '';
  document.getElementById('leagueHomeGoals').value =
    typeof match.homeGoals === 'number' ? match.homeGoals : '';
  document.getElementById('leagueAwayGoals').value =
    typeof match.awayGoals === 'number' ? match.awayGoals : '';
}

async function loadLeagueMatches() {
  const tbody = document.getElementById('adminLeagueMatchesBody');
  const msgEl = document.getElementById('leagueMatchesTableMessage');

  if (!tbody || !msgEl) return;

  msgEl.textContent = 'Ładuję mecze ligi...';

  try {
    const data = await leagueFetchJson('/api/league-matches');
    const matches = Array.isArray(data) ? data : [];

    if (!matches.length) {
      msgEl.textContent = 'Brak meczów ligi w bazie.';
      tbody.innerHTML = '';
      return;
    }

    msgEl.textContent = '';

    const rowsHtml = matches
      .sort((a, b) => {
        const da = a.date ? new Date(a.date) : 0;
        const db = b.date ? new Date(b.date) : 0;
        return da - db;
      })
      .map((m) => {
        const d = m.date ? new Date(m.date) : null;
        const dateStr = d ? d.toLocaleDateString('pl-PL') : '';
        const home = m.homeTeam || '';
        const away = m.awayTeam || '';
        const hg =
          typeof m.homeGoals === 'number' ? m.homeGoals : '';
        const ag =
          typeof m.awayGoals === 'number' ? m.awayGoals : '';

        return `
          <tr class="border-b last:border-0">
            <td class="py-2 pr-2">${dateStr}</td>
            <td class="py-2 pr-2">${home}</td>
            <td class="py-2 pr-2">${away}</td>
            <td class="py-2 pr-2 font-semibold">${hg} : ${ag}</td>
            <td class="py-2 pr-2 text-right">
              <button
                type="button"
                class="text-xs text-green-700 hover:underline mr-2"
                data-league-action="edit"
                data-id="${m._id}"
              >
                Edytuj
              </button>
              <button
                type="button"
                class="text-xs text-red-600 hover:underline"
                data-league-action="delete"
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
    console.error('Błąd przy pobieraniu meczów ligi:', err);
    msgEl.textContent = 'Błąd przy pobieraniu meczów ligi: ' + err.message;
    tbody.innerHTML = '';
  }
}

async function saveLeagueMatch() {
  const id = document.getElementById('leagueMatchId').value.trim();
  const date = document.getElementById('leagueMatchDate').value;
  const homeTeam = document.getElementById('leagueHomeTeam').value.trim();
  const awayTeam = document.getElementById('leagueAwayTeam').value.trim();
  const homeGoalsStr = document.getElementById('leagueHomeGoals').value;
  const awayGoalsStr = document.getElementById('leagueAwayGoals').value;
  const msgEl = document.getElementById('leagueMatchFormMessage');

  msgEl.textContent = '';

  if (!date || !homeTeam || !awayTeam || homeGoalsStr === '' || awayGoalsStr === '') {
    msgEl.textContent = 'Uzupełnij datę, drużyny i wynik.';
    return;
  }

  const payload = {
    date,
    homeTeam,
    awayTeam,
    homeGoals: Number(homeGoalsStr),
    awayGoals: Number(awayGoalsStr),
  };

  try {
    if (id) {
      await leagueFetchJson(`/api/league-matches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Zaktualizowano mecz ligi.';
    } else {
      await leagueFetchJson('/api/league-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Dodano mecz ligi.';
    }

    resetLeagueMatchForm();
    await loadLeagueMatches();
  } catch (err) {
    console.error('Błąd przy zapisie meczu ligi:', err);
    msgEl.textContent = 'Błąd przy zapisie meczu ligi: ' + err.message;
  }
}

async function deleteLeagueMatch(id) {
  if (!id) return;
  const ok = confirm('Na pewno usunąć ten mecz ligi?');
  if (!ok) return;

  try {
    await leagueFetchJson(`/api/league-matches/${id}`, {
      method: 'DELETE',
    });
    await loadLeagueMatches();
  } catch (err) {
    console.error('Błąd przy usuwaniu meczu ligi:', err);
    alert('Błąd przy usuwaniu meczu ligi: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveLeagueMatchBtn');
  const resetBtn = document.getElementById('resetLeagueMatchFormBtn');
  const tbody = document.getElementById('adminLeagueMatchesBody');

  if (saveBtn) {
    saveBtn.addEventListener('click', saveLeagueMatch);
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', resetLeagueMatchForm);
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-league-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-league-action');
      const id = btn.getAttribute('data-id');
      if (!id) return;

      if (action === 'delete') {
        deleteLeagueMatch(id);
      } else if (action === 'edit') {
        // pobierz wszystkie i znajdź wybrany – proste, a wystarczy na projekt
        leagueFetchJson('/api/league-matches')
          .then((data) => {
            const matches = Array.isArray(data) ? data : [];
            const match = matches.find((m) => m._id === id);
            if (match) {
              fillLeagueMatchForm(match);
              const msgEl = document.getElementById('leagueMatchFormMessage');
              if (msgEl) msgEl.textContent = 'Edytujesz wybrany mecz ligi.';
            }
          })
          .catch((err) => {
            console.error('Błąd przy pobieraniu meczu ligi do edycji:', err);
          });
      }
    });
  }

  loadLeagueMatches();
});
