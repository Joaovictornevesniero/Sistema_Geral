// Mostra o nome da loja (das Configurações) no topo do menu lateral
async function carregarMarca() {
  const resposta = await fetch('/configuracoes');
  const config = await resposta.json();

  const ponto = document.createElement('span');
  ponto.className = 'ponto';
  document.querySelector('.marca').replaceChildren(ponto, config.nome_loja);
}

carregarMarca();