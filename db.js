const Database = require('better-sqlite3');

// Cria/Abre - o arquivo de banco de dados
const db = new Database(process.env.DB_PATH || 'estoque.db');

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

// Cria - o cabeçalho da movimentação (uma entrada ou uma venda inteira)
db.exec(`
  CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    origem TEXT NOT NULL DEFAULT 'manual',
    observacao TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// Cria - os itens de cada movimentação (guarda o preço do momento)
db.exec(`
  CREATE TABLE IF NOT EXISTS movimentacao_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movimentacao_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (movimentacao_id) REFERENCES movimentacoes(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
  )
`);

// Cria - a tabela de configurações da loja (uma linha por configuração)
db.exec(`
  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  )
`);

module.exports = db;