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

test('DELETE remove um produto sem histórico', async () => {
  const criado = await criarProduto();

  const { status } = await api('DELETE', `/produtos/${criado.id}`);
  assert.equal(status, 200);

  const lista = await api('GET', '/produtos');
  assert.equal(lista.dados.length, 0);
});

test('DELETE bloqueia produto que já tem movimentações', async () => {
  const criado = await criarProduto();
  await api('POST', '/movimentacoes', {
    tipo: 'entrada', itens: [{ produto_id: criado.id, quantidade: 1 }]
  });

  const { status, dados } = await api('DELETE', `/produtos/${criado.id}`);
  assert.equal(status, 400);
  assert.ok(dados.erro);

  // o produto continua existindo
  const lista = await api('GET', '/produtos');
  assert.equal(lista.dados.length, 1);
});

// ---------- Validação (cada linha vira um teste) ----------

const invalidos = [
  ['nome vazio', { nome: '' }],
  ['nome só com espaços', { nome: '   ' }],
  ['quantidade negativa', { quantidade: -1 }],
  ['quantidade com texto', { quantidade: 'abc' }],
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

// ---------- Problemas conhecidos (hoje falham; são os passos 4.2 e 4.4) ----------
// "todo" = o teste roda, mas a falha NÃO derruba a suíte.
// Quando você consertar o código, apague o { todo: ... } e ele vira um teste normal.

test('GET de produto inexistente devolve 404', { todo: 'passo 4.2' }, async () => {
  const { status } = await api('GET', '/produtos/9999');
  assert.equal(status, 404);
});

test('PUT de produto inexistente devolve 404', { todo: 'passo 4.2' }, async () => {
  const { status } = await api('PUT', '/produtos/9999', {
    nome: 'X', quantidade: 1, minimo: 0, preco: 1
  });
  assert.equal(status, 404);
});

test('POST recusa quantidade decimal (2.5)', { todo: 'passo 4.4' }, async () => {
  const { status } = await api('POST', '/produtos', { nome: 'Item', quantidade: 2.5, preco: 1 });
  assert.equal(status, 400);
});

test('POST recusa quantidade vazia ("")', { todo: 'passo 4.4' }, async () => {
  const { status } = await api('POST', '/produtos', { nome: 'Item', quantidade: '', preco: 1 });
  assert.equal(status, 400);
});