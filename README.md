# Sistema de Estoque

Sistema web para gerenciamento de estoque, com cadastro, edição, exclusão e listagem de produtos. Desenvolvido como projeto de aprendizado, aplicando um back-end com API REST e um front-end conectado a ela via JavaScript puro.

## Funcionalidades

- Cadastro de produtos (nome, quantidade e preço)
- Listagem de todos os produtos em estoque
- Edição de produtos existentes
- Remoção de produtos
- Validação de dados tanto no back-end quanto no front-end
- Interface responsiva (funciona em desktop e celular)

## Tecnologias utilizadas

**Back-end**
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/) — framework para criação do servidor e das rotas da API
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — biblioteca de acesso ao banco de dados SQLite

**Banco de dados**
- [SQLite](https://www.sqlite.org/) — banco de dados relacional em arquivo único

**Front-end**
- HTML5
- CSS3 (com variáveis CSS e CSS Grid para layout responsivo)
- JavaScript puro (Vanilla JS), utilizando `fetch` para consumo da API

## Como rodar o projeto localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado (versão 18 ou superior recomendada)
- [Git](https://git-scm.com/) instalado

### Passo a passo

1. Clone este repositório:
   ```bash
   git clone https://github.com/Joaovictornevesniero/Sistema_Geral.git
   ```

2. Entre na pasta do projeto:
   ```bash
   cd Sistema_Geral
   ```

3. Instale as dependências:
   ```bash
   npm install
   ```

4. Inicie o servidor:
   ```bash
   node server.js
   ```

5. Abra o navegador em:
   ```
   http://localhost:3000
   ```

O banco de dados (`estoque.db`) é criado automaticamente na primeira execução, já com a tabela de produtos configurada.

## Estrutura do projeto

```
Sistema_Geral/
├── public/
│   ├── index.html      # Estrutura da página principal
│   ├── estilo.css       # Estilos da interface
│   └── script.js        # Lógica de front-end (consumo da API, manipulação do DOM)
├── db.js                 # Conexão e configuração do banco de dados SQLite
├── server.js              # Servidor Express e definição das rotas da API
├── package.json
└── README.md
```

## Rotas da API

| Método | Rota            | Descrição                          |
|--------|-----------------|-------------------------------------|
| GET    | `/produtos`      | Lista todos os produtos             |
| GET    | `/produtos/:id`  | Busca um produto específico         |
| POST   | `/produtos`      | Cadastra um novo produto            |
| PUT    | `/produtos/:id`  | Atualiza um produto existente       |
| DELETE | `/produtos/:id`  | Remove um produto                   |

### Exemplo de corpo de requisição (POST/PUT)

```json
{
  "nome": "Caneta azul",
  "quantidade": 50,
  "preco": 1.50
}
```

## Próximos passos

Este projeto está em evolução contínua. Melhorias planejadas incluem:

- Categorização de produtos e estoque mínimo configurável
- Histórico de movimentações (entradas e saídas)
- Painel de relatórios
- Autenticação de usuários
- Deploy em produção

## Autor
Desenvolvido por João Victor Neves Niero como projeto de aprendizado em desenvolvimento web full stack.
