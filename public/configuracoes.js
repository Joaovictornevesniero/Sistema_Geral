const form = document.querySelector('#form-config');

// Preenche o formulário com o que já está salvo
async function carregarConfiguracoes() {
  const resposta = await fetch('/configuracoes');
  const config = await resposta.json();

  document.querySelector('#nome_loja').value = config.nome_loja;
  document.querySelector('#telefone').value = config.telefone;
  document.querySelector('#endereco').value = config.endereco;
}

carregarConfiguracoes();

// Salva as configurações e atualiza o nome no menu
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const nome_loja = document.querySelector('#nome_loja').value;
  const telefone = document.querySelector('#telefone').value;
  const endereco = document.querySelector('#endereco').value;

  const resposta = await fetch('/configuracoes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome_loja, telefone, endereco })
  });

  if (!resposta.ok) {
    const dados = await resposta.json();
    alert(dados.erro);
    return;
  }

  alert('Configurações salvas!');
  carregarMarca();
});