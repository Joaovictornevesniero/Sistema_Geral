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