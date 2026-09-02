const Database = require('better-sqlite3');

// Cria/Abre - o arquivo de banco de dados
const db = new Database('estoque.db');

// Cria - a tabela de produtos
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    preco REAL NOT NULL DEFAULT 0
  )
`);

module.exports = db;