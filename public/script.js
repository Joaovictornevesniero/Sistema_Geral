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
      <td></td>
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

  await fetch('/produtos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, quantidade, preco })
  });

  form.reset();
  carregarProdutos();
});
    