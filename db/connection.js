const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

let client;
let db;

async function connectDB() {
  if (db) return db; // singleton — reutiliza conexão existente

  client = new MongoClient(uri);
  await client.connect();
  db = client.db('reagentes');
  console.log('MongoDB conectado.');
  return db;
}

function getDB() {
  if (!db) throw new Error('Banco não inicializado. Chame connectDB() primeiro.');
  return db;
}

module.exports = { connectDB, getDB };