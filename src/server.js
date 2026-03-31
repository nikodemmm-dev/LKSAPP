const express = require('express');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const playerRoutes = require('./routes/playerRoutes');
const Player = require('./models/Player');
const matchRoutes = require('./routes/matchRoutes');
const Match = require('./models/Match');
const statsRoutes = require('./routes/statsRoutes');
const Duty = require('./models/Duty');
const dutyRoutes = require('./routes/dutyRoutes');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const leagueMatchRoutes = require('./routes/leagueMatchRoutes');


const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(express.json());
app.use(session({
  secret: 'lks-wilamowiczanka-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/duties', dutyRoutes);
app.use('/api', statsRoutes);
app.use('/api/league-matches', leagueMatchRoutes);



app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LKS backend działa 💚' });
});

// --- demo login
const USERS = [
  { username: 'admin',  password: '1234',  role: 'admin'  },
  { username: 'trener', password: 'trener', role: 'coach' },
];

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ ok: false, message: 'Nieprawidłowy login lub hasło' });
  }

  // zapis użytkownika w sesji
  req.session.user = {
    username: user.username,
    role: user.role
  };

  res.json({
    ok: true,
    username: user.username,
    role: user.role,
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ ok: false });
    }

    res.clearCookie('connect.sid');

    res.json({
      ok: true,
      message: 'Wylogowano'
    });
  });
});

// --- seed zawodników ---
app.get('/api/debug/seed-players', async (req, res) => {
  try {
    const count = await Player.countDocuments();
    if (count > 0) {
      return res.json({
        ok: true,
        message: 'Zawodnicy już istnieją w bazie, seed pomijamy.',
      });
    }

    const players = [
      {
        firstName: 'Nikodem',
        lastName: 'Marcinkiewicz',
        position: 'Pomocnik/Boczny obrońca',
        preferredFoot: 'lewa',
        birthDate: new Date('2001-08-05'),
        shirtNumber: 21,
      },
      {
        firstName: 'Norbert',
        lastName: 'Foks',
        position: 'Napastnik',
        preferredFoot: 'prawa',
        birthDate: new Date('2001-01-01'),
        shirtNumber: 7
      },
      {
        firstName: 'Paweł',
        lastName: 'Mika',
        position: 'Pomocnik',
        preferredFoot: 'prawa',
        birthDate: new Date('2001-08-02'),
        shirtNumber: 8,
      },
    ];

    await Player.insertMany(players);
    res.json({ ok: true, message: 'Dodano przykładowych zawodników do bazy.', inserted: players.length });
  } catch (err) {
    console.error('Błąd seedowania zawodników:', err);
    res.status(500).json({ ok: false, error: 'Błąd seedowania zawodników' });
  }
});

// --- seed użytkowników ---
app.get('/api/debug/seed-users', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return res.json({
        ok: true,
        message: 'Użytkownicy już istnieją w bazie, seed pomijamy.',
      });
    }

    const adminPasswordHash = await bcrypt.hash('admin', 10);
    const coachPasswordHash = await bcrypt.hash('trener', 10);

    const users = [
      {
        username: 'admin',
        passwordHash: adminPasswordHash,
        role: 'admin',
      },
      {
        username: 'trener',
        passwordHash: coachPasswordHash,
        role: 'coach',
      },
    ];

    await User.insertMany(users);

    res.json({
      ok: true,
      message: 'Dodano użytkowników admin i trener do bazy.',
      users: users.map(u => ({ username: u.username, role: u.role })),
    });
  } catch (err) {
    console.error('Błąd seedowania użytkowników:', err);
    res.status(500).json({ ok: false, error: 'Błąd seedowania użytkowników' });
  }
});

// --- seed meczów ---
app.get('/api/debug/seed-matches', async (req, res) => {
  try {
    const count = await Match.countDocuments();
    if (count > 0) {
      return res.json({ ok: true, message: "Mecze już istnieją" });
    }

    const matches = [
      {
        date: new Date('2025-04-12T15:00:00'),
        time: '15:00',
        opponent: 'Sokół Hecznarowice',
        homeAway: 'Dom',
        type: 'Liga',
        score: '2 : 1',
      },
      {
        date: new Date('2025-04-19T16:30:00'),
        time: '16:30',
        opponent: 'Pionier Pisarzowice',
        homeAway: 'Wyjazd',
        type: 'Liga',
        score: '3 : 0',
      },
      {
        date: new Date('2025-04-26T14:00:00'),
        time: '14:00',
        opponent: 'Spartans FC',
        homeAway: 'Dom',
        type: 'Liga',
        score: '- : -',
      },
    ];

    await Match.insertMany(matches);

    res.json({
      ok: true,
      message: 'Dodano przykładowe mecze do bazy.',
      inserted: matches.length,
    });
  } catch (err) {
    console.error('Błąd seedowania meczów:', err);
    res.status(500).json({ ok: false, error: 'Błąd seedowania meczów' });
  }
});

// 🔁 reset zawodników
app.get('/api/debug/reset-players', async (req, res) => {
  try {
    const result = await Player.deleteMany({});
    res.json({
      ok: true,
      message: 'Wyczyszczono kolekcję zawodników.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Błąd czyszczenia zawodników:', err);
    res.status(500).json({ ok: false, error: 'Błąd czyszczenia zawodników' });
  }
});

// 🔁 reset meczów
app.get('/api/debug/reset-matches', async (req, res) => {
  try {
    const result = await Match.deleteMany({});
    res.json({
      ok: true,
      message: 'Wyczyszczono kolekcję meczów.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Błąd czyszczenia meczów:', err);
    res.status(500).json({ ok: false, error: 'Błąd czyszczenia meczów' });
  }
});

// --- seed dyżurnych ---
app.get('/api/debug/seed-duties', async (req, res) => {
  try {
    await Duty.deleteMany({});

    const duties = [
      {
        type: 'current',
        from: new Date('2025-04-08'),
        to: new Date('2025-04-14'),
        players: ['Nikodem Marcinkiewicz', 'Paweł Mika'],
      },
      {
        type: 'next',
        from: new Date('2025-04-15'),
        to: new Date('2025-04-21'),
        players: ['Adam Nowak', 'Jan Kowalski'],
      },
    ];

    await Duty.insertMany(duties);

    res.json({
      ok: true,
      message: 'Dodano przykładowych dyżurnych do bazy.',
      inserted: duties.length,
    });
  } catch (err) {
    console.error('Błąd seedowania dyżurnych:', err);
    res.status(500).json({ ok: false, error: 'Błąd seedowania dyżurnych' });
  }
});

app.listen(PORT, () => {
  console.log(`Server działa na http://localhost:${PORT}`);
});