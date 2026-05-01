require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const { connectDB } = require('./db/connection');

const authRoutes       = require('./routes/auth.routes');
const substancesRoutes = require('./routes/substances.routes');
const importRoutes     = require('./routes/import.routes');
const backupRoutes     = require('./routes/backup.routes');
const usersRoutes      = require('./routes/users.routes');
const historyRoutes    = require('./routes/history.routes');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
});

app.use(sessionMiddleware);

// Compartilha session com Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Expõe o io pra controllers usarem
app.set('io', io);

app.use('/api/auth',       authRoutes);
app.use('/api/substances', substancesRoutes);
app.use('/api/import',     importRoutes);
app.use('/api/backup',     backupRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/history',    historyRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  const sess = socket.request.session;
  if (sess?.authenticated) {
    console.log(`Socket conectado: ${sess.username}`);
  }

  socket.on('disconnect', () => {});
});

// Inicia só depois de conectar ao banco
connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
}).catch(err => {
  console.error('Falha ao conectar ao MongoDB:', err);
  process.exit(1);
});