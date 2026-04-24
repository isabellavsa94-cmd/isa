# myplatform

Plataforma pessoal de referências — salva links, seleções, notas e mídia numa base Supabase, e puxa como arquivos markdown pra usar de contexto no Claude Code.

## Arquitetura

```
Chrome Extension  →  Supabase (Postgres + Storage)  →  CLI (refs)  →  .refs/*.md  →  Claude Code
   [fase 2]          [schema em supabase/]            [src/]          contexto local
```

## Setup (primeira vez)

### 1. Criar projeto no Supabase

1. Entrar em https://supabase.com → New project
2. Copiar **Project URL** e **service_role key** (Settings → API)
3. SQL Editor → colar o conteúdo de `supabase/migrations/0001_init.sql` → Run

### 2. Configurar local

```bash
cp .env.example .env
# editar .env com as credenciais do Supabase
npm install
```

### 3. Testar

```bash
npm run refs -- collections
npm run refs -- add --title "Primeiro ref" --notes "teste" -c inbox
npm run refs -- list
npm run refs -- pull -c inbox
ls .refs/
```

## Uso

Todos os comandos aceitam `--help`.

```bash
# Listar collections + contagem
npm run refs -- collections

# Criar collection
npm run refs -- create-collection marketing -d "Refs de copy e growth"

# Listar refs (filtros opcionais)
npm run refs -- list
npm run refs -- list -c marketing
npm run refs -- list -t copywriting -n 20

# Puxar pra markdown local (default: ./.refs/)
npm run refs -- pull -c marketing
npm run refs -- pull -t copywriting -o ./context/

# Busca full-text (ILIKE em title/content/notes)
npm run refs -- search "hook" -o ./.refs/

# Adicionar ref manualmente
npm run refs -- add \
  --title "Hook do Gary Vee" \
  --url "https://..." \
  --notes "usar como referência pra reels" \
  -c marketing \
  -t hooks,reels
```

### Atalho global (opcional)

```bash
npm run link:local
# agora roda de qualquer lugar:
refs list
refs pull -c marketing
```

## Integração com Claude Code

No projeto onde você está trabalhando, rode:

```bash
refs pull -c marketing -o ./.refs/
```

Depois, na conversa com o Claude Code:
> "Olha as referências em `.refs/marketing/` e cria 5 variações de hook baseado nesses padrões"

O Claude vai ler os markdown e usar como contexto.

## Próximas fases

- [ ] **Extensão Chrome** — botão + menu de contexto + atalho pra salvar página/seleção/screenshot direto no Supabase
- [ ] **Web UI (Next.js)** — navegar, taguear e organizar visualmente
- [ ] **Busca semântica** — pgvector + embeddings quando tiver volume

## Estrutura

```
myplatform/
├── src/
│   ├── index.ts              # CLI entrypoint (commander)
│   ├── supabase.ts           # client + tipos
│   ├── util.ts               # slugify, serialização markdown
│   └── commands/
│       ├── list.ts
│       ├── pull.ts
│       ├── search.ts
│       ├── collections.ts
│       └── add.ts
├── supabase/
│   └── migrations/
│       └── 0001_init.sql     # schema + seed
├── bin/
│   └── refs.js               # wrapper pra usar globalmente
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```
