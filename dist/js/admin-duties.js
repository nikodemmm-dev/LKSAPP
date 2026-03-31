// public/js/admin-duties.js

let ALL_PLAYERS = [];

// prosty helper
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} dla ${url}`);
  }
  return res.json();
}

function parsePlayersInput(value) {
  return value
    .split(/[,;\n]/)        // przecinki, średniki, nowe linie
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDateRange(from, to) {
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;
  const fStr = f ? f.toLocaleDateString('pl-PL') : '';
  const tStr = t ? t.toLocaleDateString('pl-PL') : '';
  if (fStr && tStr) return `${fStr} – ${tStr}`;
  if (fStr) return fStr;
  if (tStr) return tStr;
  return '';
}

function resetDutyForm() {
  document.getElementById('dutyId').value = '';
  document.getElementById('dutyType').value = '';
  document.getElementById('dutyFrom').value = '';
  document.getElementById('dutyTo').value = '';
  document.getElementById('dutyPlayers').value = '';
  document.getElementById('dutyFormMessage').textContent = '';
}

// wypełnij formularz wartościami wybranego wpisu (do edycji)
function fillDutyForm(duty) {
  document.getElementById('dutyId').value = duty._id || '';
  document.getElementById('dutyType').value = duty.type || '';
  document.getElementById('dutyFrom').value = duty.from
    ? new Date(duty.from).toISOString().slice(0, 10)
    : '';
  document.getElementById('dutyTo').value = duty.to
    ? new Date(duty.to).toISOString().slice(0, 10)
    : '';
  document.getElementById('dutyPlayers').value = Array.isArray(duty.players)
    ? duty.players.join(', ')
    : '';
}

// render tabeli dyżurnych
async function loadDuties() {
  const tbody = document.getElementById('adminDutiesBody');
  const msgEl = document.getElementById('dutiesTableMessage');

  if (!tbody || !msgEl) {
    console.error('Brakuje adminDutiesBody lub dutiesTableMessage w HTML');
    return;
  }

  msgEl.textContent = 'Ładuję dyżurnych...';

  try {
    const data = await fetchJson('/api/duties');
    const duties = Array.isArray(data) ? data : (data.duties || []);

    if (!duties.length) {
      msgEl.textContent = 'Brak dyżurnych w bazie.';
      tbody.innerHTML = '';
      return;
    }

    msgEl.textContent = '';

    const rowsHtml = duties
      .sort((a, b) => {
        const da = a.from ? new Date(a.from) : 0;
        const db = b.from ? new Date(b.from) : 0;
        return da - db;
      })
      .map((d) => {
        const typeLabel =
          d.type === 'current'
            ? 'Aktualni'
            : d.type === 'next'
            ? 'Przyszli'
            : d.type || '';

        const rangeStr = formatDateRange(d.from, d.to);
        const playersStr = Array.isArray(d.players)
          ? d.players.join(', ')
          : '';

        return `
          <tr class="border-b last:border-0">
            <td class="py-2 pr-2">${typeLabel}</td>
            <td class="py-2 pr-2">${rangeStr}</td>
            <td class="py-2 pr-2">${playersStr}</td>
            <td class="py-2 pr-2 text-right">
              <button
                type="button"
                class="text-xs text-green-700 hover:underline mr-2"
                data-action="edit"
                data-id="${d._id}"
              >
                Edytuj
              </button>
              <button
                type="button"
                class="text-xs text-red-600 hover:underline"
                data-action="delete"
                data-id="${d._id}"
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
    console.error('Błąd przy pobieraniu /api/duties:', err);
    msgEl.textContent = 'Błąd przy pobieraniu dyżurnych: ' + err.message;
    tbody.innerHTML = '';
  }
}

// zapis dyżurnych (nowy lub edycja)
async function saveDuty() {
  const id = document.getElementById('dutyId').value.trim();
  const type = document.getElementById('dutyType').value;
  const fromStr = document.getElementById('dutyFrom').value;
  const toStr = document.getElementById('dutyTo').value;
  const playersRaw = document.getElementById('dutyPlayers').value;
  const msgEl = document.getElementById('dutyFormMessage');

  msgEl.textContent = '';

  if (!type || !fromStr || !toStr) {
    msgEl.textContent = 'Uzupełnij typ oraz zakres dat.';
    return;
  }

  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  if (fromDate > toDate) {
    msgEl.textContent = 'Data "Od" nie może być późniejsza niż "Do".';
    return;
  }

  const players = parsePlayersInput(playersRaw);

  const payload = {
    type,
    from: fromStr, // backend (Mongoose) zinterpretuje jako datę
    to: toStr,
    players,
  };

  try {
    if (id) {
      // edycja
      await fetchJson(`/api/duties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Zaktualizowano dyżurnych.';
    } else {
      // nowy wpis
      await fetchJson('/api/duties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      msgEl.textContent = 'Dodano dyżurnych.';
    }

    resetDutyForm();
    await loadDuties();
  } catch (err) {
    console.error('Błąd przy zapisie dyżurnych:', err);
    msgEl.textContent = 'Błąd przy zapisie dyżurnych: ' + err.message;
  }
}

// usuwanie
async function deleteDuty(id) {
  if (!id) return;
  const ok = confirm('Na pewno usunąć tych dyżurnych?');
  if (!ok) return;

  try {
    await fetchJson(`/api/duties/${id}`, {
      method: 'DELETE',
    });
    await loadDuties();
  } catch (err) {
    console.error('Błąd przy usuwaniu dyżurnych:', err);
    alert('Błąd przy usuwaniu dyżurnych: ' + err.message);
  }
}

async function loadPlayersForDuties() {
  try {
    const res = await fetch('/api/players');
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }
    const data = await res.json();
    ALL_PLAYERS = Array.isArray(data) ? data : (data.players || []);
    console.log('Zawodnicy do podpowiedzi (dyżurni):', ALL_PLAYERS);
  } catch (err) {
    console.error('Błąd przy pobieraniu zawodników do dyżurnych:', err);
    ALL_PLAYERS = [];
  }
}

function setupPlayersAutocomplete() {
  const input = document.getElementById('dutyPlayers');
  const box = document.getElementById('dutyPlayersSuggestions');
  if (!input || !box) return;

  input.addEventListener('input', () => {
    const query = input.value.split(',').pop().trim().toLowerCase(); 
    // bierzemy tylko ostatni fragment po przecinku

    if (!query) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }

    const matches = ALL_PLAYERS.filter(p => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      return fullName.includes(query);
    }).slice(0, 10); // max 10 wyników

    if (!matches.length) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }

    // 🔹 TUTAJ: tylko imię + nazwisko, bez pozycji
    box.innerHTML = matches.map(p => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      return `
        <button
          type="button"
          class="w-full text-left px-2 py-1 hover:bg-slate-100"
          data-player-name="${fullName}"
        >
          ${fullName}
        </button>
      `;
    }).join('');

    box.classList.remove('hidden');

    // kliknięcie w podpowiedź → dodaj do inputa
    box.querySelectorAll('button[data-player-name]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-player-name');
        const current = input.value;

        // 🔹 Rozbij na fragmenty po przecinku
        let rawParts = current.split(',');
        // wszystko oprócz ostatniego (czyli tego "nor", "pa", itd.)
        let baseParts = rawParts
          .slice(0, rawParts.length - 1)
          .map(s => s.trim())
          .filter(Boolean);

        // jeśli jeszcze nie ma tej osoby na liście – dodaj
        if (!baseParts.includes(name)) {
          baseParts.push(name);
        }

        // złożenie z powrotem w postaci "Imię Nazwisko, Kolejny Zawodnik, "
        input.value = baseParts.join(', ') + ', ';
        box.classList.add('hidden');
        box.innerHTML = '';
        input.focus();
      });
    });
  });

  // schowaj box przy kliknięciu poza
  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && e.target !== input) {
      box.classList.add('hidden');
    }
  });
}

// ⬇️ start
document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn = document.getElementById('saveDutyBtn');
  const resetBtn = document.getElementById('resetDutyFormBtn');
  const tbody = document.getElementById('adminDutiesBody');

  // najpierw pobierz zawodników i ustaw autocomplete
  await loadPlayersForDuties();
  setupPlayersAutocomplete();

  if (saveBtn) {
    saveBtn.addEventListener('click', saveDuty);
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', resetDutyForm);
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (!id) return;

      if (action === 'delete') {
        deleteDuty(id);
      } else if (action === 'edit') {
        // pobierz dane jednego wpisu z /api/duties i wypełnij formularz
        fetchJson('/api/duties')
          .then((data) => {
            const duties = Array.isArray(data) ? data : (data.duties || []);
            const duty = duties.find((d) => d._id === id);
            if (duty) {
              fillDutyForm(duty);
              document
                .getElementById('dutyFormMessage')
                .textContent = 'Edytujesz wybranych dyżurnych.';
            }
          })
          .catch((err) => {
            console.error('Błąd przy pobieraniu dyżurnego do edycji:', err);
          });
      }
    });
  }

  loadDuties();
});

