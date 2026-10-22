// IMPORTANTE: isso precisa vir ANTES do require('../db').
// Faz o SQLite usar um banco só na memória, então seu estoque.db real nunca é tocado.
process.env.DB_PATH = ':memory:';

const db = require('../db');
const app = require('../server');

let servidor;
let base;

// Liga o servidor numa porta livre (porta 0 = "o sistema escolhe uma")
async function iniciar() {
  await new Promise((resolve) => {
    servidor = app.listen(0, resolve);
  });
  base = `http://localhost:${servidor.address().port}`;
}

// Desliga o servidor no fim dos testes
async function parar() {
  await new Promise((resolve) => {
    servidor.close(resolve);
    servidor.closeAllConnections();
  });
}

// Esvazia as tabelas. Roda antes de CADA teste, para um não depender do outro.
function limparBanco() {
  db.exec(`
    DELETE FROM movimentacao_itens;
    DELETE FROM movimentacoes;
    DELETE FROM produtos;
  `);
}

// Faz uma chamada à API e devolve { status, dados }
async function api(metodo, caminho, corpo) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  const dados = await resposta.json().catch(() => null);
  return { status: resposta.status, dados };
}

// Atalho para cadastrar um produto com valores padrão (você sobrescreve o que quiser)
async function criarProduto(sobrescrever = {}) {
  const { dados } = await api('POST', '/produtos', {
    nome: 'Parafuso',
    categoria: 'Peças',
    quantidade: 10,
    minimo: 2,
    preco: 5,
    ...sobrescrever
  });
  return dados;
}

module.exports = { iniciar, parar, limparBanco, api, criarProduto };