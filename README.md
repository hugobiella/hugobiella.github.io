# Hugo Biella — Portfolio

Landing page temporária do futuro portfólio pessoal de Hugo Biella.

## Desenvolvimento

Requer Node.js 24 ou superior.

```bash
npm install
npm run dev
```

Validações disponíveis:

```bash
npm run lint
npm run typecheck
npm run build
```

O resultado de produção é gerado em `dist/`.

## GitHub Pages

O workflow `.github/workflows/deploy.yml` valida e compila o projeto após cada push para
`main`. Somente o conteúdo gerado em `dist/` é publicado na branch órfã `gh-pages`.

Após a primeira execução do workflow, configure o repositório em **Settings → Pages → Build
and deployment** com **Deploy from a branch**, branch **gh-pages** e diretório **/(root)**.
