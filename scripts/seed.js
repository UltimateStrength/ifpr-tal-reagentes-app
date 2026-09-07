require('dotenv').config();
const { connectDB } = require('../db/connection');
const { hashPassword } = require('../utils/password');

async function seed() {
  const db = await connectDB();
  const users = db.collection('users');

  const existing = await users.findOne({ username: 'developer' });
  if (existing) {
    console.log('Usuário developer já existe, pulando.');
    process.exit(0);
  }

  const hash = await hashPassword(process.env.ADMIN_PASS);

  await users.insertOne({
    username: 'developer',
    displayName: 'Marcos Jessé Ferreira Padilha',
    email: process.env.ADMIN_USER,
    passwordHash: hash,
    role: 'developer',
    createdAt: new Date()
  });

  console.log('Usuário developer criado com sucesso.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});