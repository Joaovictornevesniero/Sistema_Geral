const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, parar, limparBanco, api, criarProduto } = require('./helpers');

before(iniciar);
after(parar);
beforeEach(limparBanco);

// Atalhos para deixar os testes curtos
const mover = (tipo, itens, observacao) =>
  api('POST', '/movimentacoes', { tipo, itens, observacao });

const estoqueDe = async (id) => (await api('GET', `/produtos/${id}`)).dados.quantidade;

// ---------- Regras de estoque ----------

test('entrada soma no estoque', async () => {
  const p = await criarProduto({ quantidade: 10 });
  const { status } = await mover('entrada', [{ produto_id: p.id, quantidade: 5 }]);
  assert.equal(status, 200);
  assert.equal(await estoqueDe(p.id), 15);
});

test('saída subtrai do estoque', async () => {
  const p = await criarProduto({ quantidade: 10 });
  const { status } = await mover('saida', [{ produto_id: p.id, quantidade: 4 }]);
  assert.equal(status, 200);
  assert.equal(await estoqueDe(p.id), 6);
});

test('saída maior que o estoque é recusada e o estoque não muda', async () => {
  const p = await criarProduto({ quantidade: 3 });
  const { status, dados } = await mover('saida', [{ produto_id: p.id, quantidade: 4 }]);
  assert.equal(status, 400);
  assert.match(dados.erro, /Estoque insuficiente/);
  assert.equal(await estoqueDe(p.id), 3);
});

test('saída exatamente igual ao estoque funciona e deixa em 0', async () => {
  const p = await criarProduto({ quantidade: 5 });
  const { status } = await mover('saida', [{ produto_id: p.id, quantidade: 5 }]);
  assert.equal(status, 200);
  assert.equal(await estoqueDe(p.id), 0);
});

test('vários itens atualizam todos os produtos', async () => {
  const a = await criarProduto({ nome: 'A', quantidade: 10 });
  const b = await criarProduto({ nome: 'B', quantidade: 20 });
  await mover('saida', [
    { produto_id: a.id, quantidade: 2 },
    { produto_id: b.id, quantidade: 5 }
  ]);
  assert.equal(await estoqueDe(a.id), 8);
  assert.equal(await estoqueDe(b.id), 15);
});

test('mesmo produto em duas linhas soma antes de conferir o estoque', async () => {
  const p = await criarProduto({ quantidade: 5 });
  // cada linha sozinha (3) cabe no estoque, mas juntas (6) não
  const { status } = await mover('saida', [
    { produto_id: p.id, quantidade: 3 },
    { produto_id: p.id, quantidade: 3 }
  ]);
  assert.equal(status, 400);
  assert.equal(await estoqueDe(p.id), 5);
});

test('se um item não tem estoque, nenhum item é aplicado', async () => {
  const a = await criarProduto({ nome: 'A', quantidade: 10 });
  const b = await criarProduto({ nome: 'B', quantidade: 1 });
  const { status } = await mover('saida', [
    { produto_id: a.id, quantidade: 2 },
    { produto_id: b.id, quantidade: 5 } // este não tem estoque
  ]);
  assert.equal(status, 400);
  assert.equal(await estoqueDe(a.id), 10); // o primeiro NÃO foi descontado

  const historico = await api('GET', '/movimentacoes');
  assert.equal(historico.dados.length, 0); // e nada ficou no histórico
});

test('o preço fica congelado no histórico mesmo se o produto mudar de preço', async () => {
  const p = await criarProduto({ quantidade: 10, preco: 10 });
  await mover('saida', [{ produto_id: p.id, quantidade: 2 }]);

  await api('PUT', `/produtos/${p.id}`, {
    nome: 'Parafuso', categoria: 'Peças', quantidade: 8, minimo: 2, preco: 99
  });

  const historico = await api('GET', '/movimentacoes');
  assert.equal(historico.dados[0].valor_total, 20); // 2 x R$ 10, não 2 x R$ 99
});

// ---------- Validação ----------

test('recusa tipo inválido', async () => {
  const p = await criarProduto();
  const { status } = await mover('troca', [{ produto_id: p.id, quantidade: 1 }]);
  assert.equal(status, 400);
});

test('recusa lista de itens vazia', async () => {
  const { status } = await mover('entrada', []);
  assert.equal(status, 400);
});

test('recusa quando itens não é enviado', async () => {
  const { status } = await api('POST', '/movimentacoes', { tipo: 'entrada' });
  assert.equal(status, 400);
});

test('recusa item sem produto_id', async () => {
  const { status } = await mover('entrada', [{ quantidade: 1 }]);
  assert.equal(status, 400);
});

for (const [descricao, quantidade] of [['zero', 0], ['negativa', -1], ['decimal', 1.5]]) {
  test(`recusa quantidade ${descricao}`, async () => {
    const p = await criarProduto();
    const { status } = await mover('entrada', [{ produto_id: p.id, quantidade }]);
    assert.equal(status, 400);
    assert.equal(await estoqueDe(p.id), 10);
  });
}

test('produto que não existe devolve 404', async () => {
  const { status } = await mover('entrada', [{ produto_id: 9999, quantidade: 1 }]);
  assert.equal(status, 404);
});

// ---------- Histórico ----------

test('histórico devolve itens, total de unidades e valor corretos', async () => {
  const a = await criarProduto({ nome: 'Parafuso', quantidade: 10, preco: 2 });
  const b = await criarProduto({ nome: 'Porca', quantidade: 10, preco: 3 });
  await mover('saida', [
    { produto_id: a.id, quantidade: 3 },
    { produto_id: b.id, quantidade: 2 }
  ], 'Cliente João');

  const { dados } = await api('GET', '/movimentacoes');
  assert.equal(dados.length, 1);
  assert.equal(dados[0].tipo, 'saida');
  assert.equal(dados[0].total_unidades, 5);
  assert.equal(dados[0].valor_total, 12); // 3x2 + 2x3
  assert.equal(dados[0].observacao, 'Cliente João');
  assert.match(dados[0].itens, /Parafuso x3/);
  assert.match(dados[0].itens, /Porca x2/);
});

test('histórico vem da mais recente para a mais antiga', async () => {
  const p = await criarProduto({ quantidade: 10 });
  await mover('entrada', [{ produto_id: p.id, quantidade: 1 }], 'primeira');
  await mover('entrada', [{ produto_id: p.id, quantidade: 1 }], 'segunda');

  const { dados } = await api('GET', '/movimentacoes');
  assert.equal(dados[0].observacao, 'segunda');
  assert.equal(dados[1].observacao, 'primeira');
});

test('filtro por tipo funciona', async () => {
  const p = await criarProduto({ quantidade: 10 });
  await mover('entrada', [{ produto_id: p.id, quantidade: 1 }]);
  await mover('saida', [{ produto_id: p.id, quantidade: 1 }]);

  const entradas = await api('GET', '/movimentacoes?tipo=entrada');
  assert.equal(entradas.dados.length, 1);
  assert.equal(entradas.dados[0].tipo, 'entrada');
});

test('filtro por período inclui o dia de hoje', async () => {
  const p = await criarProduto({ quantidade: 10 });
  await mover('entrada', [{ produto_id: p.id, quantidade: 1 }]);

  const hoje = new Date().toLocaleDateString('sv-SE'); // formato AAAA-MM-DD, no seu fuso
  const dentro = await api('GET', `/movimentacoes?de=${hoje}&ate=${hoje}`);
  assert.equal(dentro.dados.length, 1);

  const fora = await api('GET', '/movimentacoes?de=2000-01-01&ate=2000-01-02');
  assert.equal(fora.dados.length, 0);
});

test('recusa datas em formato inválido', async () => {
  const { status } = await api('GET', '/movimentacoes?de=abc');
  assert.equal(status, 400);
});

test('recusa data inicial maior que a final', async () => {
  const { status } = await api('GET', '/movimentacoes?de=2026-12-31&ate=2026-01-01');
  assert.equal(status, 400);
});