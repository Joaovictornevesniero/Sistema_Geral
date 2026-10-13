const express = require('express');
const db= require('./db');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const PORT = 3000;

function validarProduto(dados) {
  const { nome, quantidade, minimo = 0, preco } = dados;

  if (!nome || nome.trim() === '') {
    return 'Nome é obrigatório';
  }
  if (isNaN(quantidade) || Number(quantidade) < 0) {
    return 'Quantidade deve ser um número maior ou igual a zero';
  }
  if (isNaN(preco) || Number(preco) < 0) {
    return 'Preço deve ser um número maior ou igual a zero';
  }
    if (isNaN(minimo) || Number(minimo) < 0) {
    return 'Estoque mínimo deve ser um número maior ou igual a zero';
  }
  return null;
}

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
  const { nome, quantidade, minimo = 0, preco } = req.body;
  const categoria = req.body.categoria || 'Geral';

  const erro = validarProduto(req.body);
  if (erro) {
    return res.status(400).json({ erro });
  }
  const resultado = db.prepare(
    'INSERT INTO produtos (nome, categoria, quantidade, minimo, preco) VALUES (?, ?, ?, ?, ?)'
  ).run(nome, categoria, quantidade, minimo, preco);
  res.json({ id: resultado.lastInsertRowid, nome, categoria, quantidade, minimo, preco });
});

// Atualiza um produto existente pelo id
app.put('/produtos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, quantidade, minimo = 0, preco } = req.body;
  const categoria = req.body.categoria || 'Geral';

  const erro = validarProduto(req.body);
  if (erro) {
    return res.status(400).json({ erro });
  }

  db.prepare(
    'UPDATE produtos SET nome = ?, categoria = ?, quantidade = ?, minimo = ?, preco = ? WHERE id = ?'
  ).run(nome, categoria, quantidade, minimo, preco, id);
  res.json({ id: Number(id), nome, categoria, quantidade, minimo, preco });
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