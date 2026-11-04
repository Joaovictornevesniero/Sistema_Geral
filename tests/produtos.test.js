const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, parar, limparBanco, api, criarProduto } = require('./helpers');

before(iniciar);      // liga o servidor uma vez
after(parar);         // desliga no fim
beforeEach(limparBanco); // banco limpo antes de cada teste

// ---------- Caminho feliz ----------

test('POST cadastra um produto e ele aparece na listagem', async () => {
  const { status, dados } = await api('POST', '/produtos', {
    nome: 'Caneta azul', categoria: 'Papelaria', quantidade: 50, minimo: 5, preco: 1.5
  });
  assert.equal(status, 200);
  assert.equal(dados.nome, 'Caneta azul');

  const lista = await api('GET', '/produtos');
  assert.equal(lista.dados.length, 1);
  assert.equal(lista.dados[0].nome, 'Caneta azul');
  assert.equal(lista.dados[0].quantidade, 50);
});

test('POST sem categoria salva como "Geral"', async () => {
  const { dados } = await api('POST', '/produtos', { nome: 'Item', quantidade: 1, preco: 1 });
  const produto = (await api('GET', `/produtos/${dados.id}`)).dados;
  assert.equal(produto.categoria, 'Geral');
});

test('PUT atualiza os campos do produto', async () => {
  const criado = await criarProduto();

  const { status } = await api('PUT', `/produtos/${criado.id}`, {
    nome: 'Parafuso M8', categoria: 'Fixação', quantidade: 99, minimo: 10, preco: 7.5
  });
  assert.equal(status, 200);

  const produto = (await api('GET', `/produtos/${criado.id}`)).dados;
  assert.equal(produto.nome, 'Parafuso M8');
  assert.equal(produto.categoria, 'Fixação');
  assert.equal(produto.quantidade, 99);
  assert.equal(produto.minimo, 10);
  assert.equal(produto.preco, 7.5);
});

// ---------- Exclusão ----------

test('DELETE remove um produto sem histórico', async () => {
  const criado = await criarProduto();

  const { status } = await api('DELETE', `/produtos/${criado.id}`);
  assert.equal(status, 200);

  const lista = await api('GET', '/produtos');
  assert.equal(lista.dados.length, 0);
});

test('DELETE de produto com movimentações some da lista, mas o histórico fica', async () => {
  const criado = await criarProduto({ nome: 'Parafuso' });
  await api('POST', '/movimentacoes', {
    tipo: 'entrada', itens: [{ produto_id: criado.id, quantidade: 1 }]
  });

  const { status } = await api('DELETE', `/produtos/${criado.id}`);
  assert.equal(status, 200);

  const lista = await api('GET', '/produtos');
  assert.equal(lista.dados.length, 0);

  const busca = await api('GET', `/produtos/${criado.id}`);
  assert.equal(busca.status, 404);

  const historico = await api('GET', '/movimentacoes');
  assert.equal(historico.dados.length, 1);
  assert.match(historico.dados[0].itens, /Parafuso x1/);
});

test('DELETE de produto inexistente devolve 404', async () => {
  const { status } = await api('DELETE', '/produtos/9999');
  assert.equal(status, 404);
});

test('PUT de produto apagado devolve 404', async () => {
  const criado = await criarProduto();
  await api('POST', '/movimentacoes', {
    tipo: 'entrada', itens: [{ produto_id: criado.id, quantidade: 1 }]
  });
  await api('DELETE', `/produtos/${criado.id}`);

  const { status } = await api('PUT', `/produtos/${criado.id}`, {
    nome: 'X', quantidade: 1, minimo: 0, preco: 1
  });
  assert.equal(status, 404);
});

// ---------- Validação (cada linha vira um teste) ----------

const invalidos = [
  ['nome vazio', { nome: '' }],
  ['nome só com espaços', { nome: '   ' }],
  ['nome que não é texto', { nome: { a: 1 } }],
  ['quantidade negativa', { quantidade: -1 }],
  ['quantidade com texto', { quantidade: 'abc' }],
  ['quantidade vazia', { quantidade: '' }],
  ['mínimo negativo', { minimo: -1 }],
  ['preço negativo', { preco: -1 }],
  ['preço com texto', { preco: 'abc' }]
];

for (const [descricao, alteracao] of invalidos) {
  test(`POST recusa ${descricao}`, async () => {
    const valido = { nome: 'Item', quantidade: 1, minimo: 0, preco: 1 };
    const { status, dados } = await api('POST', '/produtos', { ...valido, ...alteracao });
    assert.equal(status, 400);
    assert.ok(dados.erro);

    const lista = await api('GET', '/produtos');
    assert.equal(lista.dados.length, 0); // nada foi salvo
  });
}

// ---------- Produto inexistente ----------

test('GET de produto inexistente devolve 404', async () => {
  const { status } = await api('GET', '/produtos/9999');
  assert.equal(status, 404);
});

test('PUT de produto inexistente devolve 404', async () => {
  const { status } = await api('PUT', '/produtos/9999', {
    nome: 'X', quantidade: 1, minimo: 0, preco: 1
  });
  assert.equal(status, 404);
});
