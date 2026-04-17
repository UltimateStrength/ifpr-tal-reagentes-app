const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const substancesRoutes = require('./routes/substances.routes');
const importRoutes = require('./routes/import.routes');
const backupRoutes = require('./routes/backup.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8h
}));

app.use('/api/auth', authRoutes);
app.use('/api/substances', substancesRoutes);
app.use('/api/import', importRoutes);
app.use('/api/backup', backupRoutes);

// SPA fallback — todas as rotas não-API servem o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));