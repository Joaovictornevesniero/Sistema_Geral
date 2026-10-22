// Evita que caracteres como < e & quebrem a tabela ou injetem código
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatarReais(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const form = document.querySelector('#form-movimentacao');
const dialogo = document.querySelector('#dialogo');
const listaItens = document.querySelector('#lista-itens');

// Guardam o estado da janela aberta: se é entrada ou saída, e a lista de produtos
let tipoAtual = 'entrada';
let produtos = [];

// Busca o histórico (respeitando os filtros) e desenha cards e tabela
async function carregarMovimentacoes() {
  const params = new URLSearchParams();
  const de = document.querySelector('#de').value;
  const ate = document.querySelector('#ate').value;
  const tipo = document.querySelector('#filtro-tipo').value;
  if (de) params.set('de', de);
  if (ate) params.set('ate', ate);
  if (tipo) params.set('tipo', tipo);

  const resposta = await fetch(`/movimentacoes?${params}`);
  if (!resposta.ok) {
    const dados = await resposta.json();
    alert(dados.erro);
    return;
  }
  const movimentacoes = await resposta.json();

  // Cada movimentação já vem com o total de unidades somado pelo servidor
  const somar = (t) => movimentacoes
    .filter((m) => m.tipo === t)
    .reduce((soma, m) => soma + m.total_unidades, 0);
  document.querySelector('#total-entradas').textContent = somar('entrada');
  document.querySelector('#total-saidas').textContent = somar('saida');
  document.querySelector('#total-movimentacoes').textContent = movimentacoes.length;

  const tbody = document.querySelector('#tabela-movimentacoes tbody');
  tbody.innerHTML = '';

  if (movimentacoes.length === 0) {
    tbody.innerHTML = '<tr class="linha-vazia"><td colspan="6">Nenhuma movimentação encontrada.</td></tr>';
    return;
  }

  movimentacoes.forEach((m) => {
    const entrada = m.tipo === 'entrada';
    const data = new Date(m.criado_em.replace(' ', 'T')).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${data}</td>
      <td><span class="status ${entrada ? 'ok' : 'baixo'}">${entrada ? 'Entrada' : 'Saída'}</span></td>
      <td>${esc(m.itens)}</td>
      <td>${m.total_unidades} un</td>
      <td>${formatarReais(m.valor_total)}</td>
      <td>${esc(m.observacao || '')}</td>
    `;
    tbody.appendChild(linha);
  });
}

// Busca os produtos e guarda na variável "produtos" (usada nas linhas de item e no total)
async function carregarProdutos() {
  const resposta = await fetch('/produtos');
  produtos = await resposta.json();
  return produtos.length;
}

// Soma preço x quantidade de todas as linhas e mostra no rodapé da janela
function atualizarTotal() {
  let total = 0;
  listaItens.querySelectorAll('.linha-item').forEach((linha) => {
    const id = Number(linha.querySelector('.item-produto').value);
    const quantidade = Number(linha.querySelector('.item-quantidade').value) || 0;
    const produto = produtos.find((p) => p.id === id);
    if (produto) total += produto.preco * quantidade;
  });
  document.querySelector('#total-dialogo').textContent = formatarReais(total);
}

// Cria uma linha nova na janela: escolher produto + quantidade + botão de remover
function adicionarLinhaItem() {
  const opcoes = produtos
    .map((p) => `<option value="${p.id}">${esc(p.nome)} (estoque: ${p.quantidade})</option>`)
    .join('');

  const linha = document.createElement('div');
  linha.className = 'linha-item';
  linha.innerHTML = `
    <select class="item-produto" required>${opcoes}</select>
    <input type="number" class="item-quantidade" min="1" step="1" value="1" required>
    <button type="button" class="btn-remover-item" title="Remover item">✕</button>
  `;
  listaItens.appendChild(linha);
  atualizarTotal();
}

// Abre a janela já no modo certo (entrada ou saída)
async function abrirDialogo(tipo) {
  const total = await carregarProdutos();
  if (total === 0) {
    alert('Cadastre um produto antes de registrar uma movimentação.');
    return;
  }

  tipoAtual = tipo;
  form.reset();
  listaItens.innerHTML = '';
  adicionarLinhaItem();
  document.querySelector('#titulo-dialogo').textContent = tipo === 'entrada' ? 'Nova entrada' : 'Nova saída';
  dialogo.showModal();
}

carregarMovimentacoes();

document.querySelector('#btn-filtrar').addEventListener('click', carregarMovimentacoes);

document.querySelector('#btn-limpar').addEventListener('click', () => {
  document.querySelector('#de').value = '';
  document.querySelector('#ate').value = '';
  document.querySelector('#filtro-tipo').value = '';
  carregarMovimentacoes();
});

document.querySelector('#btn-entrada').addEventListener('click', () => abrirDialogo('entrada'));
document.querySelector('#btn-saida').addEventListener('click', () => abrirDialogo('saida'));

document.querySelector('#btn-add-item').addEventListener('click', adicionarLinhaItem);

document.querySelector('#btn-cancelar').addEventListener('click', () => {
  dialogo.close();
});

// Recalcula o total quando troca o produto ou muda a quantidade
listaItens.addEventListener('input', atualizarTotal);

// Remove a linha clicada (sempre mantém pelo menos uma)
listaItens.addEventListener('click', (evento) => {
  if (!evento.target.classList.contains('btn-remover-item')) return;
  if (listaItens.children.length > 1) {
    evento.target.closest('.linha-item').remove();
    atualizarTotal();
  }
});

// Monta a lista de itens e envia pro servidor, que atualiza o estoque
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const itens = [...listaItens.querySelectorAll('.linha-item')].map((linha) => ({
    produto_id: linha.querySelector('.item-produto').value,
    quantidade: linha.querySelector('.item-quantidade').value
  }));
  const observacao = document.querySelector('#observacao').value;

  const resposta = await fetch('/movimentacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: tipoAtual, itens, observacao })
  });

  if (!resposta.ok) {
    const dados = await resposta.json();
    alert(dados.erro);
    return;
  }

  dialogo.close();
  carregarMovimentacoes();
});