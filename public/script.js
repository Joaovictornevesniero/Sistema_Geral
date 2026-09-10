async function carregarProdutos() {
  const resposta = await fetch('/produtos');
  const produtos = await resposta.json();

  const tbody = document.querySelector('#tabela-produtos tbody');
  tbody.innerHTML = '';

  produtos.forEach((produto) => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${produto.id}</td>
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.preco}</td>
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

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const nome = document.querySelector('#nome').value;
  const quantidade = document.querySelector('#quantidade').value;
  const preco = document.querySelector('#preco').value;
  const editandoId = form.dataset.editandoId;

  if (editandoId) {
    await fetch(`/produtos/${editandoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, quantidade, preco })
    });
    delete form.dataset.editandoId;
  } else {
    await fetch('/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, quantidade, preco })
    });
  }

  form.reset();
  carregarProdutos();
});

const tbody = document.querySelector('#tabela-produtos tbody');

tbody.addEventListener('click', async (evento) => {
  if (evento.target.classList.contains('btn-excluir')) {
    const id = evento.target.dataset.id;
    await fetch(`/produtos/${id}`, { method: 'DELETE' });
    carregarProdutos();
  }
  if (evento.target.classList.contains('btn-editar')) {
    const id = evento.target.dataset.id;
    const resposta = await fetch(`/produtos/${id}`);
    const produto = await resposta.json();

    document.querySelector('#nome').value = produto.nome;
    document.querySelector('#quantidade').value = produto.quantidade;
    document.querySelector('#preco').value = produto.preco;

    form.dataset.editandoId = id;
  }
});
