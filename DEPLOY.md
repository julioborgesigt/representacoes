# Deploy — Representações Policiais

## Pré-requisitos
- Node.js ≥ 18
- MariaDB / MySQL com banco criado previamente

## Setup local

```bash
cp .env.example .env
# edite .env com os dados do seu banco

npm install
npm run setup      # cria tabelas e popula dados iniciais
npm start          # ou: npm run dev (com hot-reload)
```

### Credenciais padrão após o setup
| Campo | Valor |
|-------|-------|
| Login | `admin` |
| Senha | `Admin@123` |

> **ALTERE a senha imediatamente no primeiro acesso.**

---

## Deploy no DomCloud

1. Faça um fork / push deste repositório no GitHub.
2. No painel do DomCloud, crie um novo serviço Node.js apontando para o repositório.
3. Na aba **Environment**, adicione as variáveis do `.env.example` com seus valores reais.
4. O DomCloud executará automaticamente `npm install` e `npm run setup` via `.domcloud.yml`.
5. Acesse a URL fornecida pelo DomCloud e faça login com `admin / Admin@123`.

---

## Estrutura de Arquivos

```
representacoes/
├── .domcloud.yml          # config de deploy automático
├── .env.example           # template de variáveis de ambiente
├── package.json
├── schema.sql             # DDL + dados iniciais (executado pelo setup)
│
├── src/
│   ├── server.js          # ponto de entrada Express
│   ├── db/
│   │   └── pool.js        # pool de conexões MySQL
│   ├── middleware/
│   │   └── auth.js        # proteção de rotas
│   ├── routes/
│   │   ├── auth.js        # login / logout
│   │   ├── dominios.js    # listas estáticas (varas, crimes…)
│   │   └── representacoes.js  # CRUD principal
│   └── utils/
│       └── setup.js       # script de inicialização do banco
│
├── public/                # arquivos estáticos servidos pelo Express
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js         # frontend vanilla JS (SPA leve)
│
└── views/                 # páginas HTML
    ├── login.html
    └── index.html
```
