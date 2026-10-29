# PET Saúde Digital · UEPA — eventos e notícias

SPA em React do **PET Saúde Digital**, da Universidade do Estado do Pará. Nasceu como o site de
um único evento (o I Simpósio) e foi generalizada: agora publica **vários eventos** e
**notícias**, cadastrados no painel `/admin`, e mantém a inscrição paga com Pix.

Nomes de pessoas, datas, valores e contatos seguem **fictícios**, conforme acordado nas reuniões
de levantamento de requisitos.

---

## Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento em http://localhost:5173
npm run api      # API Express + MySQL (porta 3001) — use com o Vite
npm run build    # gera a versão de produção em dist/
npm run preview  # serve o build gerado, para conferência antes de publicar
```

### Docker (Nginx + front + API + MySQL)

Uma porta só: **http://localhost**. O Nginx encaminha `/` ao site e `/api` à API.

```bash
cp .env.example .env   # opcional — as chaves Asaas/Resend podem ficar vazias no trabalho
docker compose up --build
```

Admin: `http://localhost/admin` (padrão `admin@petsaude.local` / `admin123`). Sem `ASAAS_API_KEY`, o Pix é simulado e o comprovante vai para `server/outbox/`.

> No Windows, o `npm run dev` mantém um handle aberto em `dist/`. Se o build
> falhar com "o processo não pode acessar o arquivo", pare o dev server antes.

### Verificação automática de layout

```bash
npm run preview      # em um terminal
npm run verificar    # em outro
```

O script abre o site em Chrome headless, percorre as quatro abas em 390px, 768px
e 1440px e falha se algum elemento vazar para fora da tela, se algum painel
vier vazio ou se houver erro de JavaScript. Para salvar as capturas:

```bash
npm run verificar -- http://localhost:4173 ./capturas
```

Usa o Chrome já instalado (via `puppeteer-core`, sem baixar Chromium). Se o
caminho do Chrome for outro, defina `CHROME_PATH`.

### Medir a rolagem por aba

```bash
node scripts/medir-altura.mjs
```

Mostra, por aba e por tamanho de tela, quantas vezes o conteúdo excede a altura
visível — `1.00x` significa "coube exatamente". É o número que guia qualquer
decisão de acrescentar conteúdo a uma aba: se passar de ~1.3x no celular, o
conteúdo novo deve entrar em um item de `Sanfona`, não solto na tela.

### Compartilhar por um túnel

```bash
npm run build && npm run preview
npx cloudflared tunnel --url http://localhost:4173
```

O `preview.allowedHosts` já está liberado no `vite.config.js` para isso. O
link só funciona enquanto os dois processos estiverem rodando.

O `vite.config.js` usa `base: './'`, então a pasta `dist/` pode ser publicada tanto na raiz de
um domínio quanto em uma subpasta (ex.: `uepa.br/petsaude`) sem ajuste adicional.

---

## Decisões que vieram do cliente

| Requisito levantado na reunião | Como foi resolvido no código |
| --- | --- |
| "Não quero telas extensas com scroll; quero um menu que troque o conteúdo" | SPA de abas: `useAbas` guarda a aba ativa e `App.jsx` monta só a seção correspondente. Ticker, cabeçalho e menu ficam fixos; apenas o `<main>` rola. |
| Paleta do PET (azul fechado + laranja), e não a da UEPA | Paleta B registrada em `tailwind.config.js` como `pet.navy`, `pet.deep`, `pet.orange`, `pet.sky`, `pet.ice`. |
| Tipografia: opção de família única | IBM Plex Sans em todos os níveis — a hierarquia vem de peso, tamanho e entreletra. |
| "Tentar minimizar de tal forma que caiba tudo em uma tela" | Cada aba mostra só um núcleo sempre visível; o resto fica em `Sanfona` (um item aberto por vez), **fechada por padrão no celular** e com o primeiro item aberto no desktop. |
| "Quando a UEPA promove, a marca dela fica embaixo" | Assinatura da UEPA no rodapé, e não no cabeçalho. |
| Inscrição paga, com taxa definida pela organização | Cada evento completo tem taxa própria, definida no admin. O CTA do cabeçalho (desktop), a barra inferior (mobile) e o botão do evento abrem a inscrição no próprio site, com Pix. Sem evento com inscrição aberta, o CTA some. |
| Sistema genérico, não só de um evento | Eventos e notícias cadastrados no admin. A aba **Início** mostra o evento em destaque e as últimas notícias, e o letreiro do topo passa as manchetes. |
| Divulgação principalmente por WhatsApp | Layout mobile-first e hash na URL (`#noticias&noticia=3`) para compartilhar link direto de uma seção ou de uma notícia. |

---

## Eventos e notícias — desenvolvimento incremental

Pedido da universidade: o sistema deixa de servir a **um único evento** e passa a aceitar o
cadastro de **vários eventos** e de **notícias**. As abas que existiam só para o simpósio
(Programação, Palestrantes, Submissão, Local e Apoiadores) foram removidas, e o site ficou com
**01 Início**, **02 Eventos**, **03 Notícias** e **04 Contato**. A mudança foi entregue seguindo o modelo de
processo **Incremental**: cada incremento passa por análise → projeto → código → teste e termina
utilizável sozinho, e o seguinte se apoia no que o anterior entregou.

| Incremento | Entrega | Onde está |
| --- | --- | --- |
| **1 · Cadastro de eventos** | Tabela `eventos` (o I Simpósio entra como exemplo quando a tabela está vazia), CRUD no admin com publicar/ocultar, rota pública `GET /api/eventos` e aba **02 Eventos** no site, ordenada por situação (acontecendo → em breve → encerrados). O primeiro da lista aparece em destaque na aba Início. | `server/sql/001_schema.sql`, `server/rotas/admin.js`, `src/components/admin/GestaoEventos.jsx`, `src/components/sections/Eventos.jsx` |
| **2 · Cadastro de notícias** | Tabela `noticias` com vínculo **opcional** a um evento do incremento 1 (`ON DELETE SET NULL`: apagar o evento não apaga a notícia), CRUD no admin com rascunho/publicada, `GET /api/noticias`, aba **03 Notícias**, últimas notícias na aba Início e manchetes no letreiro do topo. | `server/sql/001_schema.sql`, `server/rotas/admin.js`, `src/components/admin/GestaoNoticias.jsx`, `src/components/sections/Noticias.jsx` |
| **3 · Eventos completos e inscrição por evento** | Dois tipos de evento: **simples** (só divulgação) e **completo** (taxa, inscrições abertas/fechadas e atividades próprias). `atividades` e `inscricoes` passam a ter `evento_id`. A conta do participante vale para todos os eventos, com **uma inscrição por evento** (`UNIQUE (participante_id, evento_id)`): quem já tem conta se inscreve em outro evento sem repetir o cadastro. As atividades avulsas do simpósio foram removidas. Na aba Eventos, o evento completo mostra a programação por dia e o botão de inscrição. | `server/sql/001_schema.sql`, `server/rotas/participante.js`, `server/rotas/admin.js`, `src/components/admin/GestaoAtividades.jsx`, `src/components/inscricao/ModalInscricao.jsx`, `src/paginas/MinhaInscricao.jsx` |

Rotas do admin (exigem login): `GET/POST /api/admin/eventos`, `PUT/DELETE /api/admin/eventos/:id`,
o mesmo par para `/api/admin/noticias`, `GET/POST /api/admin/eventos/:id/atividades` e
`PUT/DELETE /api/admin/atividades/:id`. Inscritos e resumo aceitam `?evento=ID`. A validação fica em
`server/lib/validar.js` (`validarEvento`, `validarNoticia`, `validarAtividade`).

Rotas do participante: `POST /api/inscricoes` cria a conta e a primeira inscrição;
`POST /api/inscricoes/eventos` inscreve quem já tem conta; `GET/PATCH /api/inscricoes/eu` traz a conta
com todas as inscrições e corrige os dados pessoais; `PATCH /api/inscricoes/:id/atividades` e
`POST /api/inscricoes/:id/{pix,gratuidade,cancelar,reenviar}` agem sobre uma inscrição.

Regras que o servidor garante: só evento completo, publicado, com inscrições abertas e não
encerrado aceita inscrição; a data da atividade fica dentro do período do evento; evento com
inscritos não pode ser apagado nem virar simples; evento gratuito sem extras é confirmado na
hora, sem Pix. Bancos do formato antigo (atividades sem evento) têm as tabelas `atividades`,
`inscricoes` e `inscricao_atividades` recriadas ao subir a API — as contas dos participantes ficam.

Datas trafegam como texto `AAAA-MM-DD` (o banco devolve com `DATE_FORMAT`) e são formatadas em
`src/lib/datas.js` sem `new Date(...)`, para o fuso do navegador não deslocar o dia.

---

## Estrutura

```
src/
├── App.jsx                    estrutura da SPA e troca de abas
├── main.jsx                   ponto de entrada
├── index.css                  base do Tailwind + utilitários do projeto
│
├── config/
│   └── abas.js                registro das quatro abas (id, número, rótulo)
│
├── data/
│   └── programa.js            dados do programa: contatos, objetivos, coordenação
│
├── hooks/
│   ├── useAbas.js             aba ativa, hash da URL (e `parametroHash`), setas do teclado
│   ├── useListaApi.js         listas públicas da API (eventos, notícias)
│   └── useEventosComInscricao.js  eventos com inscrição aberta agora
│
├── lib/
│   ├── motion.js              variantes de animação compartilhadas
│   ├── dinheiro.js            valores em reais e rótulo da taxa
│   └── datas.js               formatação de datas, situação e ordem dos eventos
│
└── components/
    ├── layout/                Ticker, Cabecalho, MenuAbas, Rodape, BarraInscricao
    ├── ui/                    TituloSecao, Monograma, BlocoAcao, Sanfona, AvisoLista, Paragrafos
    ├── admin/                 GestaoEventos, GestaoAtividades, GestaoNoticias
    └── sections/              uma seção por aba (Inicio, Eventos, Noticias, Contato)
```

### Para atualizar o conteúdo

Nada em `components/` precisa ser tocado para trocar conteúdo:

- **eventos e notícias** → painel `/admin`, abas *Eventos* e *Notícias* (ficam no banco)
- **tipo do evento, taxa, inscrições abertas e atividades** → painel `/admin`, aba *Eventos*
- **Pix, prazo de cancelamento, chave geral de inscrições** → painel `/admin`, aba *Config*
- **contatos, objetivos, coordenação** → `src/data/programa.js`

---

## Detalhes de implementação

- **Navegação por teclado** — setas ← e → trocam de aba.
- **Link direto** — a aba ativa é gravada no hash (`#eventos`), então dá para mandar no
  WhatsApp um link que abre direto na seção certa.
- **Sem biblioteca de ícones** — as poucas setas são SVG inline, o que evita 300 kB de
  dependência para meia dúzia de traços.
- **Fotos e logos** — enquanto as imagens não chegam, `Monograma` ocupa o lugar delas sem
  quebrar o layout. Substituir por `<img>` quando os arquivos forem enviados.
- **`prefers-reduced-motion`** — as animações são desligadas para quem configurou o sistema
  para reduzir movimento.

---

## Pendências do inventário de conteúdo

Itens que dependem de terceiros e ainda não chegaram:

- [ ] Logos da UEPA e do PET Saúde em vetor (SVG/AI/EPS)
- [ ] Fotografia da coordenadora geral + autorização de uso de imagem
- [ ] E-mail e Instagram institucionais reais
