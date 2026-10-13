const Database = require('better-sqlite3');

// Cria/Abre - o arquivo de banco de dados
const db = new Database('estoque.db');

// Cria - a tabela de produtos
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Geral',
    quantidade INTEGER NOT NULL DEFAULT 0,
    minimo INTEGER NOT NULL DEFAULT 0,
    preco REAL NOT NULL DEFAULT 0
  )
`);

// Adiciona as colunas novas sem apagar os produtos que já existem
const colunas = db.prepare('PRAGMA table_info(produtos)').all().map((c) => c.name);

if (!colunas.includes('categoria')) {
  db.exec("ALTER TABLE produtos ADD COLUMN categoria TEXT NOT NULL DEFAULT 'Geral'");
}
if (!colunas.includes('minimo')) {
  db.exec('ALTER TABLE produtos ADD COLUMN minimo INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;