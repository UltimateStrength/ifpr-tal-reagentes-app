require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const { connectDB } = require('./db/connection');

const authRoutes      = require('./routes/auth.routes');
const substancesRoutes = require('./routes/substances.routes');
const importRoutes    = require('./routes/import.routes');
const backupRoutes    = require('./routes/backup.routes');
const usersRoutes     = require('./routes/users.routes');
const historyRoutes   = require('./routes/history.routes');
const tokensRoutes    = require('./routes/tokens.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

app.set('io', { emit: () => {} }); // stub — sem Socket.IO

app.use('/api/auth',       authRoutes);
app.use('/api/substances', substancesRoutes);
app.use('/api/import',     importRoutes);
app.use('/api/backup',     backupRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/history',    historyRoutes);
app.use('/api/tokens',     tokensRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
}).catch(err => {
  console.error('Falha ao conectar ao MongoDB:', err);
  process.exit(1);
});