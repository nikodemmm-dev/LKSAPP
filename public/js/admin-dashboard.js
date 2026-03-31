// public/js/admin-dashboard.js

// Prosty helper do pobierania JSON z obsługą błędu HTTP
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} dla ${url}`);
  }
  return res.json();
}

async function loadAdminDashboard() {
  const matchesEl = document.getElementById('adminTotalMatches');
  const playersEl = document.getElementById('adminTotalPlayers');
  const dutiesEl = document.getElementById('adminCurrentDuties');
  const lastMatchesBody = document.getElementById('adminLastMatchesBody');

  if (!matchesEl || !playersEl || !dutiesEl || !lastMatchesBody) {
    console.warn('Brak wymaganych elementów w admin.html – sprawdź ID.');
    return;
  }

  try {
    //
    // 1) ZAWODNICY
    //
    const playersData = await fetchJson('/api/players');
    const players = Array.isArray(playersData)
      ? playersData
      : playersData.players || [];
    playersEl.textContent = players.length;

    //
    // 2) MECZE
    //
    const matchesData = await fetchJson('/api/matches');
    const matches = Array.isArray(matchesData)
      ? matchesData
      : matchesData.matches || [];

    matchesEl.textContent = matches.length;

    // Sortujemy:
    //  - najpierw po updatedAt (jeśli jest),
    //  - jeśli nie ma updatedAt, to po dacie meczu.
    const sorted = [...matches].sort((a, b) => {
      const updatedA = a.updatedAt ? new Date(a.updatedAt) : null;
      const updatedB = b.updatedAt ? new Date(b.updatedAt) : null;

      if (updatedA && updatedB) {
        return updatedB - updatedA; // nowsze zmiany wyżej
      }
      if (updatedA && !updatedB) return -1;
      if (!updatedA && updatedB) return 1;

      const da = a.date ? new Date(a.date) : 0;
      const db = b.date ? new Date(b.date) : 0;
      return db - da; // nowsze mecze wyżej
    });

    // ❗️TUTAJ ZMIANA – BIERZEMY 4 OSTATNIE MECZE
    const lastFour = sorted.slice(0, 4);

    if (!lastFour.length) {
      lastMatchesBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-2 pr-2 text-xs text-slate-500">
            Brak meczów w bazie.
          </td>
        </tr>
      `;
    } else {
      lastMatchesBody.innerHTML = lastFour
        .map((m) => {
          const d = m.date ? new Date(m.date) : null;
          const dateStr = d ? d.toLocaleDateString('pl-PL') : '';

          const opponent = m.opponent || '';
          const homeAway = m.homeAway || '';

          // wynik – score albo z goalsFor/goalsAgainst, albo "- : -"
          let score = '- : -';
          if (m.score) {
            score = m.score;
          } else if (
            typeof m.goalsFor === 'number' &&
            typeof m.goalsAgainst === 'number'
          ) {
            score = `${m.goalsFor} : ${m.goalsAgainst}`;
          }

          const lastChange = m.updatedAt
            ? new Date(m.updatedAt).toLocaleString('pl-PL')
            : 'brak danych';

          const scoreClass =
            score === '- : -'
              ? 'text-slate-400'
              : 'font-semibold';

          return `
            <tr class="border-b last:border-0">
              <td class="py-2 pr-2">${dateStr}</td>
              <td class="py-2 pr-2">${opponent}</td>
              <td class="py-2 pr-2">${homeAway}</td>
              <td class="py-2 pr-2 ${scoreClass}">${score}</td>
              <td class="py-2 pr-2 text-slate-500">${lastChange}</td>
            </tr>
          `;
        })
        .join('');
    }

    //
    // 3) DYŻURNI
    //
    const dutiesData = await fetchJson('/api/duties');
    const duties = Array.isArray(dutiesData)
      ? dutiesData
      : dutiesData.duties || [];

    const currentDuties = duties.filter((d) => d.type === 'current');
    dutiesEl.textContent = currentDuties.length || 0;
  } catch (err) {
    console.error('Błąd przy ładowaniu dashboardu admina:', err);

    const errorText = 'Błąd';
    if (matchesEl) matchesEl.textContent = errorText;
    if (playersEl) playersEl.textContent = errorText;
    if (dutiesEl) dutiesEl.textContent = errorText;
    if (lastMatchesBody) {
      lastMatchesBody.innerHTML =
        '<tr><td colspan="5" class="py-2 text-red-500 text-xs">Nie udało się pobrać meczów.</td></tr>';
    }
  }
}

document.addEventListener('DOMContentLoaded', loadAdminDashboard);




