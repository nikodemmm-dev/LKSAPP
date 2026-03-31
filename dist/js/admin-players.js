// public/js/admin-players.js

// Helper do pobierania JSON z obsługą błędów
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} dla ${url}`);
  }
  return res.json();
}

// Wypełnienie formularza przy edycji
function fillPlayerForm(player) {
  document.getElementById('playerId').value = player._id || '';
  document.getElementById('playerFirstName').value = player.firstName || '';
  document.getElementById('playerLastName').value = player.lastName || '';
  document.getElementById('playerPosition').value = player.position || '';
  document.getElementById('playerPreferredFoot').value =
    player.preferredFoot || '';
  document.getElementById('playerShirtNumber').value =
    player.shirtNumber != null ? player.shirtNumber : '';
  document.getElementById('playerBirthDate').value = player.birthDate
    ? new Date(player.birthDate).toISOString().slice(0, 10)
    : '';
  document.getElementById('playerGoals').value =
    player.goals != null ? player.goals : '';
  document.getElementById('playerAssists').value =
    player.assists != null ? player.assists : '';
  document.getElementById('playerYellowCards').value =
    player.yellowCards != null ? player.yellowCards : '';
  document.getElementById('playerRedCards').value =
    player.redCards != null ? player.redCards : '';
}

function resetPlayerForm() {
  document.getElementById('playerId').value = '';
  document.getElementById('playerFirstName').value = '';
  document.getElementById('playerLastName').value = '';
  document.getElementById('playerPosition').value = '';
  document.getElementById('playerPreferredFoot').value = '';
  document.getElementById('playerShirtNumber').value = '';
  document.getElementById('playerBirthDate').value = '';
  document.getElementById('playerGoals').value = '';
  document.getElementById('playerAssists').value = '';
  document.getElementById('playerYellowCards').value = '';
  document.getElementById('playerRedCards').value = '';
  document.getElementById('playerFormMessage').textContent = '';
}

// Zapis (nowy / edycja)
async function savePlayer() {
  const id = document.getElementById('playerId').value.trim();
  const firstName = document.getElementById('playerFirstName').value.trim();
  const lastName = document.getElementById('playerLastName').value.trim();
  const position = document.getElementById('playerPosition').value.trim();
  const preferredFoot = document.getElementById('playerPreferredFoot').value;
  const shirtNumberRaw =
    document.getElementById('playerShirtNumber').value.trim();
  const birthDate = document.getElementById('playerBirthDate').value;

  const goalsRaw = document.getElementById('playerGoals').value.trim();
  const assistsRaw = document.getElementById('playerAssists').value.trim();
  const yellowCardsRaw =
    document.getElementById('playerYellowCards').value.trim();
  const redCardsRaw = document.getElementById('playerRedCards').value.trim();

  const msgEl = document.getElementById('playerFormMessage');
  msgEl.textContent = '';

  if (!firstName || !lastName) {
    msgEl.textContent = 'Uzupełnij imię i nazwisko.';
    return;
  }

  const shirtNumber =
    shirtNumberRaw !== '' ? Number.parseInt(shirtNumberRaw, 10) : undefined;

  const goals =
    goalsRaw !== '' ? Number.parseInt(goalsRaw, 10) : undefined;
  const assists =
    assistsRaw !== '' ? Number.parseInt(assistsRaw, 10) : undefined;
  const yellowCards =
    yellowCardsRaw !== ''
      ? Number.parseInt(yellowCardsRaw, 10)
      : undefined;
  const redCards =
    redCardsRaw !== '' ? Number.parseInt(redCardsRaw, 10) : undefined;

  const payload = {
    firstName,
    lastName,
    position,
    preferredFoot,
    shirtNumber,
    birthDate: birthDate || undefined,
    goals: goals ?? 0,
    assists: assists ?? 0,
    yellowCards: yellowCards ?? 0,
    redCards: redCards ?? 0,
  };

  try {
    if (id) {
      // edycja
      await fetchJson(`/api/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Zaktualizowano zawodnika.';
    } else {
      // nowy
      await fetchJson('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Dodano nowego zawodnika.';
    }

    resetPlayerForm();
    await loadPlayers();
  } catch (err) {
    console.error('Błąd przy zapisie zawodnika:', err);
    msgEl.textContent = 'Błąd przy zapisie zawodnika: ' + err.message;
  }
}

// Usuwanie
async function deletePlayer(id) {
  if (!id) return;
  const ok = confirm('Na pewno usunąć tego zawodnika?');
  if (!ok) return;

  try {
    await fetchJson(`/api/players/${id}`, {
      method: 'DELETE',
    });
    await loadPlayers();
  } catch (err) {
    console.error('Błąd przy usuwaniu zawodnika:', err);
    alert('Błąd przy usuwaniu zawodnika: ' + err.message);
  }
}

// Inkrementacja pola (goals / assists / yellowCards / redCards)
async function incrementStat(playerId, statName) {
  if (!playerId || !statName) return;

  const cellSpan = document.querySelector(
    `span[data-stat-value="${statName}"][data-id="${playerId}"]`
  );
  if (!cellSpan) return;

  const current = Number.parseInt(cellSpan.textContent, 10) || 0;
  const next = current + 1;

  try {
    await fetchJson(`/api/players/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [statName]: next }),
    });

    // lokalny update bez przeładowania całej tabeli
    cellSpan.textContent = String(next);
  } catch (err) {
    console.error('Błąd przy inkrementacji statystyki:', err);
    alert('Błąd przy aktualizowaniu statystyki: ' + err.message);
  }
}

// Wczytanie listy zawodników
async function loadPlayers() {
  const tbody = document.getElementById('adminPlayersBody');
  const msgEl = document.getElementById('playersTableMessage');

  if (!tbody || !msgEl) {
    console.error('Brakuje adminPlayersBody lub playersTableMessage w HTML');
    return;
  }

  msgEl.textContent = 'Ładuję zawodników...';

  try {
    const data = await fetchJson('/api/players');
    const players = Array.isArray(data) ? data : data.players || [];

    if (!players.length) {
      msgEl.textContent = 'Brak zawodników w bazie.';
      tbody.innerHTML = '';
      return;
    }

    msgEl.textContent = '';

    // sort: nazwisko, potem imię
    players.sort((a, b) => {
      const la = (a.lastName || '').localeCompare(b.lastName || 'pl-PL');
      if (la !== 0) return la;
      return (a.firstName || '').localeCompare(b.firstName || 'pl-PL');
    });

    const rowsHtml = players
      .map((p) => {
        const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
        const position = p.position || '';
        const shirtNumber =
          p.shirtNumber != null && p.shirtNumber !== ''
            ? p.shirtNumber
            : '';

        const goals = p.goals != null ? p.goals : 0;
        const assists = p.assists != null ? p.assists : 0;
        const yellowCards =
          p.yellowCards != null ? p.yellowCards : 0;
        const redCards = p.redCards != null ? p.redCards : 0;

        return `
          <tr class="border-b last:border-0">
            <td class="py-2 pr-2">${fullName}</td>
            <td class="py-2 pr-2">${position}</td>
            <td class="py-2 pr-2 text-center">${shirtNumber}</td>

            <!-- Bramki -->
            <td class="py-2 pr-2 text-center">
              <div class="inline-flex items-center gap-2">
                <span
                  data-stat-value="goals"
                  data-id="${p._id}"
                  class="min-w-[1.5rem] inline-block text-center"
                >
                  ${goals}
                </span>
                <button
                  type="button"
                  class="px-2 py-0.5 border border-slate-300 rounded text-[11px] hover:bg-slate-100"
                  data-action="inc"
                  data-stat="goals"
                  data-id="${p._id}"
                >
                  +1
                </button>
              </div>
            </td>

            <!-- Asysty -->
            <td class="py-2 pr-2 text-center">
              <div class="inline-flex items-center gap-2">
                <span
                  data-stat-value="assists"
                  data-id="${p._id}"
                  class="min-w-[1.5rem] inline-block text-center"
                >
                  ${assists}
                </span>
                <button
                  type="button"
                  class="px-2 py-0.5 border border-slate-300 rounded text-[11px] hover:bg-slate-100"
                  data-action="inc"
                  data-stat="assists"
                  data-id="${p._id}"
                >
                  +1
                </button>
              </div>
            </td>

            <!-- Żółte kartki -->
            <td class="py-2 pr-2 text-center">
              <div class="inline-flex items-center gap-2">
                <span
                  data-stat-value="yellowCards"
                  data-id="${p._id}"
                  class="min-w-[1.5rem] inline-block text-center"
                >
                  ${yellowCards}
                </span>
                <button
                  type="button"
                  class="px-2 py-0.5 border border-slate-300 rounded text-[11px] hover:bg-slate-100"
                  data-action="inc"
                  data-stat="yellowCards"
                  data-id="${p._id}"
                >
                  +1
                </button>
              </div>
            </td>

            <!-- Czerwone kartki -->
            <td class="py-2 pr-2 text-center">
              <div class="inline-flex items-center gap-2">
                <span
                  data-stat-value="redCards"
                  data-id="${p._id}"
                  class="min-w-[1.5rem] inline-block text-center"
                >
                  ${redCards}
                </span>
                <button
                  type="button"
                  class="px-2 py-0.5 border border-slate-300 rounded text-[11px] hover:bg-slate-100"
                  data-action="inc"
                  data-stat="redCards"
                  data-id="${p._id}"
                >
                  +1
                </button>
              </div>
            </td>

            <td class="py-2 pr-2 text-right whitespace-nowrap">
              <button
                type="button"
                class="text-xs text-green-700 hover:underline mr-3"
                data-action="edit"
                data-id="${p._id}"
              >
                Edytuj
              </button>
              <button
                type="button"
                class="text-xs text-red-600 hover:underline"
                data-action="delete"
                data-id="${p._id}"
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
    console.error('Błąd przy pobieraniu /api/players:', err);
    msgEl.textContent = 'Błąd przy pobieraniu zawodników: ' + err.message;
    tbody.innerHTML = '';
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('savePlayerBtn');
  const resetBtn = document.getElementById('resetPlayerFormBtn');
  const tbody = document.getElementById('adminPlayersBody');

  if (saveBtn) {
    saveBtn.addEventListener('click', savePlayer);
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', resetPlayerForm);
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!id) return;

      if (action === 'delete') {
        deletePlayer(id);
      } else if (action === 'edit') {
        // szukamy zawodnika i wypełniamy formularz
        fetchJson('/api/players')
          .then((data) => {
            const players = Array.isArray(data) ? data : data.players || [];
            const player = players.find((p) => p._id === id);
            if (player) {
              fillPlayerForm(player);
              document.getElementById('playerFormMessage').textContent =
                'Edytujesz wybranego zawodnika.';
            }
          })
          .catch((err) => {
            console.error('Błąd przy pobieraniu zawodnika do edycji:', err);
          });
      } else if (action === 'inc') {
        const stat = btn.getAttribute('data-stat');
        incrementStat(id, stat);
      }
    });
  }

  loadPlayers();
});




