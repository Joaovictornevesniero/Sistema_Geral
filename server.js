const express = require('express');
const db= require('./db');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const PORT = 3000;

// Rota de teste: confirma que o servidor está no ar
app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

// Lista todos os produtos cadastrados
app.get('/produtos', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos').all();
  res.json(produtos);
});

// Busca um produto específico pelo id
app.get('/produtos/:id', (req, res) => {
  const { id } = req.params;
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
  res.json(produto);
});

// Cadastra um novo produto
app.post('/produtos', (req, res) => {
  const { nome, quantidade, preco } = req.body;

  // ? evita SQL Injection - nunca concatenar valor do usuário direto no SQL
  const resultado = db.prepare(
    'INSERT INTO produtos (nome, quantidade, preco) VALUES (?, ?, ?)'
  ).run(nome, quantidade, preco);
  res.json({ id: resultado.lastInsertRowid, nome, quantidade, preco });
});

// Atualiza um produto existente pelo id
app.put('/produtos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, quantidade, preco } = req.body;
  db.prepare(
    'UPDATE produtos SET nome = ?, quantidade = ?, preco = ? WHERE id = ?'
  ).run(nome, quantidade, preco, id);
  res.json({ id: Number(id), nome, quantidade, preco });
});

// Remove um produto pelo id
app.delete('/produtos/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
  res.json({ mensagem: 'Produto removido com sucesso' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});