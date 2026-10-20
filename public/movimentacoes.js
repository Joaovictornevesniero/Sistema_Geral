// Evita que caracteres como < e & quebrem a tabela ou injetem código
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const form = document.querySelector('#form-movimentacao');
const dialogo = document.querySelector('#dialogo');

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

  // Totais do que está sendo mostrado
  const somar = (t) => movimentacoes.filter((m) => m.tipo === t).reduce((soma, m) => soma + m.quantidade, 0);
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
      <td>${esc(m.produto_nome)}</td>
      <td><span class="status ${entrada ? 'ok' : 'baixo'}">${entrada ? 'Entrada' : 'Saída'}</span></td>
      <td>${m.quantidade} un</td>
      <td>${m.origem === 'ajuste' ? 'Ajuste' : 'Manual'}</td>
      <td>${esc(m.observacao || '')}</td>
    `;
    tbody.appendChild(linha);
  });
}

// Preenche a lista de produtos da janela, mostrando o estoque atual de cada um
async function carregarProdutosNoSelect() {
  const resposta = await fetch('/produtos');
  const produtos = await resposta.json();

  document.querySelector('#produto_id').innerHTML = produtos
    .map((p) => `<option value="${p.id}">${esc(p.nome)} (estoque: ${p.quantidade})</option>`)
    .join('');

  return produtos.length;
}

carregarMovimentacoes();

document.querySelector('#btn-filtrar').addEventListener('click', carregarMovimentacoes);

document.querySelector('#btn-limpar').addEventListener('click', () => {
  document.querySelector('#de').value = '';
  document.querySelector('#ate').value = '';
  document.querySelector('#filtro-tipo').value = '';
  carregarMovimentacoes();
});

document.querySelector('#btn-novo').addEventListener('click', async () => {
  const total = await carregarProdutosNoSelect();
  if (total === 0) {
    alert('Cadastre um produto antes de registrar uma movimentação.');
    return;
  }
  form.reset();
  dialogo.showModal();
});

document.querySelector('#btn-cancelar').addEventListener('click', () => {
  dialogo.close();
});

// Envia a movimentação pro servidor, que atualiza o estoque do produto
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const produto_id = document.querySelector('#produto_id').value;
  const tipo = document.querySelector('#tipo').value;
  const quantidade = document.querySelector('#quantidade').value;
  const observacao = document.querySelector('#observacao').value;

  const resposta = await fetch('/movimentacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ produto_id, tipo, quantidade, observacao })
  });

  if (!resposta.ok) {
    const dados = await resposta.json();
    alert(dados.erro);
    return;
  }

  dialogo.close();
  carregarMovimentacoes();
});