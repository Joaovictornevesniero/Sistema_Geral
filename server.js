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
  if (isNaN(minimo) || Number(minimo) < 0) {
    return 'Estoque mínimo deve ser um número maior ou igual a zero';
  }
  if (isNaN(preco) || Number(preco) < 0) {
    return 'Preço deve ser um número maior ou igual a zero';
  }
  return null;
}

function validarMovimentacao(dados) {
  const { produto_id, tipo, quantidade, origem = 'manual' } = dados;

  if (!produto_id) {
    return 'Produto é obrigatório';
  }
  if (tipo !== 'entrada' && tipo !== 'saida') {
    return 'Tipo deve ser entrada ou saida';
  }
  if (!Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
    return 'Quantidade deve ser um número inteiro maior que zero';
  }
  if (origem !== 'manual' && origem !== 'ajuste') {
    return 'Origem inválida';
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

// Remove um produto pelo id (bloqueia se ele já tem histórico de movimentações)
app.delete('/produtos/:id', (req, res) => {
  const { id } = req.params;

  const historico = db.prepare('SELECT COUNT(*) AS total FROM movimentacoes WHERE produto_id = ?').get(id);
  if (historico.total > 0) {
    return res.status(400).json({ erro: 'Este produto tem movimentações registradas e não pode ser excluído.' });
  }

  db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
  res.json({ mensagem: 'Produto removido com sucesso' });
});

// Lista as movimentações (as mais recentes primeiro), com o nome do produto
app.get('/movimentacoes', (req, res) => {
  const movimentacoes = db.prepare(`
    SELECT m.*, p.nome AS produto_nome
    FROM movimentacoes m
    JOIN produtos p ON p.id = m.produto_id
    ORDER BY m.id DESC
  `).all();
  res.json(movimentacoes);
});

// Registra uma entrada ou saída e atualiza o estoque do produto
app.post('/movimentacoes', (req, res) => {
  const erro = validarMovimentacao(req.body);
  if (erro) {
    return res.status(400).json({ erro });
  }

  const { produto_id, tipo, observacao = '', origem = 'manual' } = req.body;
  const quantidade = Number(req.body.quantidade);

  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id);
  if (!produto) {
    return res.status(404).json({ erro: 'Produto não encontrado' });
  }
  if (tipo === 'saida' && quantidade > produto.quantidade) {
    return res.status(400).json({ erro: `Estoque insuficiente. Disponível: ${produto.quantidade}` });
  }

  const variacao = tipo === 'entrada' ? quantidade : -quantidade;

  // Transação: ou grava o histórico e o estoque juntos, ou não grava nada
  const registrar = db.transaction(() => {
    db.prepare(
      'INSERT INTO movimentacoes (produto_id, tipo, quantidade, origem, observacao) VALUES (?, ?, ?, ?, ?)'
    ).run(produto_id, tipo, quantidade, origem, observacao);
    db.prepare('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?').run(variacao, produto_id);
  });
  registrar();

  res.json({ mensagem: 'Movimentação registrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});