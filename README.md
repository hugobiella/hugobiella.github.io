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

O workflow `.github/workflows/deploy.yml` faz build e publica o conteúdo de `dist/`
automaticamente após cada push para `main`. Nas configurações do repositório, em
**Settings → Pages → Build and deployment**, selecione **GitHub Actions** como source.
