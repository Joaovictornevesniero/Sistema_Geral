// Busca os produtos no banco e desenha a tabela na tela
async function carregarProdutos() {
  const resposta = await fetch('/produtos');
  const produtos = await resposta.json();

  const tbody = document.querySelector('#tabela-produtos tbody');
  tbody.innerHTML = '';

  if (produtos.length === 0) {
    tbody.innerHTML = '<tr class="linha-vazia"><td colspan="7">Nenhum produto cadastrado ainda. Use o formulário ao lado para adicionar o primeiro.</td></tr>';
    return;
  }

  produtos.forEach((produto) => {
    const baixo = produto.quantidade < produto.minimo;
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.categoria}</td>
      <td>${produto.quantidade} un</td>
      <td>${produto.minimo}</td>
      <td>${Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td><span class="status ${baixo ? 'baixo' : 'ok'}">${baixo ? 'Estoque baixo' : 'Ok'}</span></td>
      <td>
        <button class="btn-editar" data-id="${produto.id}">Editar</button>
        <button class="btn-excluir" data-id="${produto.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(linha);
  });
}

carregarProdutos();

const form = document.querySelector('#form-produto');

// Cadastra ou atualiza um produto, dependendo se está em modo edição
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const nome = document.querySelector('#nome').value;
  const categoria = document.querySelector('#categoria').value;
  const quantidade = document.querySelector('#quantidade').value;
  const minimo = document.querySelector('#minimo').value;
  const preco = document.querySelector('#preco').value;
  const editandoId = form.dataset.editandoId;

  let resposta;

  if (editandoId) {
    resposta = await fetch(`/produtos/${editandoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, categoria, quantidade, minimo, preco })
    });
  } else {
    resposta = await fetch('/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, categoria, quantidade, minimo, preco })
    });
  }

  if (!resposta.ok) {
    const dados = await resposta.json();
    alert(dados.erro);
    return;
  }

  delete form.dataset.editandoId;
  form.reset();
  carregarProdutos();
});

const tbody = document.querySelector('#tabela-produtos tbody');

// Listener no tbody (não em cada botão) porque as linhas são recriadas
// toda vez que a tabela é atualizada,  botões individuais perderiam o listener
tbody.addEventListener('click', async (evento) => {
  // Exclui o produto da linha clicada
  if (evento.target.classList.contains('btn-excluir')) {
    const id = evento.target.dataset.id;
    await fetch(`/produtos/${id}`, { method: 'DELETE' });
    carregarProdutos();
  }

    // Preenche o formulário com os dados do produto pra edição
  if (evento.target.classList.contains('btn-editar')) {
    const id = evento.target.dataset.id;
    const resposta = await fetch(`/produtos/${id}`);
    const produto = await resposta.json();

    document.querySelector('#nome').value = produto.nome;
    document.querySelector('#categoria').value = produto.categoria;
    document.querySelector('#quantidade').value = produto.quantidade;
    document.querySelector('#minimo').value = produto.minimo;
    document.querySelector('#preco').value = produto.preco;
    // Marca o formulário como "em edição", o submit usa isso pra decidir PUT ou POST
    form.dataset.editandoId = id;
  }
});
