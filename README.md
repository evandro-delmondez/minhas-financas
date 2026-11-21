# Minhas Finanças

Orçamento do mês, caixinhas e meta de R$ 50 mil, renda projetada pelos plantões do Meu Plantão, importação de extratos (Nubank fatura, Nubank conta, BB conta), raio-X, calendário do dinheiro e milhas. Instala como app no iPhone e abre sem internet.

## Duas versões, o mesmo código

- `dist/site/`: PWA para o GitHub Pages. Salva no aparelho e, com a chave do GitHub em Ajustes, no arquivo `minhas-financas.json` de um repositório **privado** (pode ser o mesmo da nuvem do Meu Plantão). Lê os plantões do `meus-padroes.json` desse repositório.
- `dist/claude/financas.html`: painel no Claude, salvo na nuvem do próprio artefato.

O código não tem dados pessoais. O plano entra pela nuvem ou por Ajustes → Importar backup.

## Comandos

```bash
npm run build   # gera dist/
npm test        # build + testes do núcleo + teste das telas no Chromium (celular e computador)
npm run serve   # http://localhost:4174
```

## Publicar o site

Settings → Pages → Source: GitHub Actions. Cada push na `main` roda os testes e publica.
