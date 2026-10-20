const express = require('express');
const db= require('./db');
const app = express();

app.use(express.json());

// Garante que req.body sempre exista, mesmo se o pedido vier sem corpo
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

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

function validarMovimentacao({ tipo, itens }) {
  if (tipo !== 'entrada' && tipo !== 'saida') {
    return 'Tipo deve ser entrada ou saida';
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return 'Adicione pelo menos um item';
  }
  for (const item of itens) {
    if (!item.produto_id) {
      return 'Escolha o produto em todos os itens';
    }
    if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) <= 0) {
      return 'Quantidade deve ser um número inteiro maior que zero';
    }
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

  const historico = db.prepare('SELECT COUNT(*) AS total FROM movimentacao_itens WHERE produto_id = ?').get(id);
  if (historico.total > 0) {
    return res.status(400).json({ erro: 'Este produto tem movimentações registradas e não pode ser excluído.' });
  }

  db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
  res.json({ mensagem: 'Produto removido com sucesso' });
});

// Lista as movimentações (mais recentes primeiro), com filtros opcionais de período e tipo
app.get('/movimentacoes', (req, res) => {
  const { de = '0000-01-01', ate = '9999-12-31', tipo = '' } = req.query;

  const formatoData = /^\d{4}-\d{2}-\d{2}$/;
  if (!formatoData.test(de) || !formatoData.test(ate)) {
    return res.status(400).json({ erro: 'Datas inválidas' });
  }
  if (de > ate) {
    return res.status(400).json({ erro: 'A data inicial não pode ser maior que a final' });
  }

  const movimentacoes = db.prepare(`
    SELECT m.id, m.tipo, m.observacao, m.criado_em,
      SUM(i.quantidade) AS total_unidades,
      SUM(i.quantidade * i.preco_unitario) AS valor_total,
      group_concat(p.nome || ' x' || i.quantidade, ', ') AS itens
    FROM movimentacoes m
    JOIN movimentacao_itens i ON i.movimentacao_id = m.id
    JOIN produtos p ON p.id = i.produto_id
    WHERE date(m.criado_em) BETWEEN ? AND ?
      AND (? = '' OR m.tipo = ?)
    GROUP BY m.id
    ORDER BY m.id DESC
  `).all(de, ate, tipo, tipo);
  res.json(movimentacoes);
});

// Registra uma entrada ou saída com vários itens e atualiza o estoque
app.post('/movimentacoes', (req, res) => {
  const erro = validarMovimentacao(req.body);
  if (erro) {
    return res.status(400).json({ erro });
  }

  const { tipo, observacao = '' } = req.body;

  // Soma itens repetidos do mesmo produto antes de conferir o estoque
  const totais = {};
  req.body.itens.forEach((i) => {
    totais[i.produto_id] = (totais[i.produto_id] || 0) + Number(i.quantidade);
  });

  const buscar = db.prepare('SELECT * FROM produtos WHERE id = ?');
  const itens = [];
  for (const [produto_id, quantidade] of Object.entries(totais)) {
    const produto = buscar.get(produto_id);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }
    if (tipo === 'saida' && quantidade > produto.quantidade) {
      return res.status(400).json({ erro: `Estoque insuficiente de "${produto.nome}". Disponível: ${produto.quantidade}` });
    }
    itens.push({ produto_id: produto.id, quantidade, preco: produto.preco });
  }

  // Transação: ou grava a movimentação, os itens e o estoque juntos, ou não grava nada
  const registrar = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO movimentacoes (tipo, observacao) VALUES (?, ?)'
    ).run(tipo, observacao);
    const inserirItem = db.prepare(
      'INSERT INTO movimentacao_itens (movimentacao_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
    );
    const atualizar = db.prepare('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?');
    const sinal = tipo === 'entrada' ? 1 : -1;

    itens.forEach((i) => {
      inserirItem.run(lastInsertRowid, i.produto_id, i.quantidade, i.preco);
      atualizar.run(sinal * i.quantidade, i.produto_id);
    });
  });
  registrar();

  res.json({ mensagem: 'Movimentação registrada' });
});

// Lista as configurações da loja (com valores padrão se ainda não foram salvas)
app.get('/configuracoes', (req, res) => {
  const linhas = db.prepare('SELECT chave, valor FROM configuracoes').all();
  const config = { nome_loja: 'Estoque+', telefone: '', endereco: '' };
  linhas.forEach((l) => { config[l.chave] = l.valor; });
  res.json(config);
});

// Salva as configurações da loja
app.put('/configuracoes', (req, res) => {
  const { nome_loja, telefone = '', endereco = '' } = req.body;

  if (!nome_loja || String(nome_loja).trim() === '') {
    return res.status(400).json({ erro: 'Nome da loja é obrigatório' });
  }

  // Se a chave já existe, atualiza o valor; se não, cria
  const salvar = db.prepare(
    'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
  );
  const salvarTudo = db.transaction(() => {
    salvar.run('nome_loja', String(nome_loja).trim());
    salvar.run('telefone', String(telefone).trim());
    salvar.run('endereco', String(endereco).trim());
  });
  salvarTudo();

  res.json({ mensagem: 'Configurações salvas' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});