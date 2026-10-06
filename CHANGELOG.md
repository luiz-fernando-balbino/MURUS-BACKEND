# Changelog

## 0.2.0

### Quebras de compatibilidade (o app móvel precisa de ajuste)

- `GET /media/list` agora retorna um objeto `{ total, limit, offset, items }` em vez de um array. Leia `items`.
- `uploadedAt` passou a ser data/hora ISO 8601 (antes era `YYYY-MM`). O antigo valor está em `period`.
- A listagem inclui vídeos e outros formatos (antes só `.jpg`, `.jpeg`, `.png`). Use `?type=image` para o comportamento anterior.
- O caminho de armazenamento deixou de ser fixo no código: configure `STORAGE_PATH` no `.env`.

### Adicionado

- `GET /media/file/:ano/:mes/:arquivo` com suporte a `Range` (antes não havia como baixar/visualizar as mídias).
- `GET /health`.
- Autenticação por token (`API_TOKEN`) e limite de requisições.
- Validação de extensão, `Content-Type`, tamanho e magic bytes no upload.
- Paginação e filtro por tipo na listagem.
- Configuração por `.env` com validação na inicialização.
- Proteção opcional contra disco desmontado (`REQUIRE_STORAGE_MARKER`).
- Testes unitários, `ecosystem.config.js` (PM2), `.gitignore` reorganizado, `.gitattributes`, `.editorconfig`.

### Corrigido

- `MediaService` era instanciado manualmente com `new` dentro do controller; agora usa injeção de dependência.
- Listagem síncrona (`readdirSync`/`statSync`) bloqueava o servidor; agora é assíncrona.
- A ordem "mais recentes primeiro" dentro de um mês era aleatória (nomes são UUIDs); agora ordena pela data de gravação.
- O nome/extensão do arquivo enviado vinha do cliente sem validação.

### Removido

- Dependência `uuid` (substituída por `crypto.randomUUID()` nativo do Node) e `@nestjs/mapped-types` (não usada).
- Script `test:e2e` (apontava para uma configuração inexistente).
- `tsconfig.build.tsbuildinfo` do repositório (agora ignorado pelo Git).
