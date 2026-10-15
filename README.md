# Site Thais Matos — protótipo

Site-portfólio da artista Thais Matos ([@thaismatosart](https://instagram.com/thaismatosart)), desenvolvido pela TRIRREME.

O site é estático (HTML, CSS e JavaScript, sem etapa de build) e tem um painel para a Thais editar livros, encomendas, obras e contatos. O painel salva no navegador de quem o usa; a migração para Firebase está prevista para depois (ver `docs/adr/0001`).

## Como abrir

Qualquer servidor de arquivos estáticos funciona. Na pasta do projeto:

```bash
python3 -m http.server 8080
```

Depois abra:

- Site: <http://localhost:8080/>
- Painel: <http://localhost:8080/painel.html>

## Como verificar

```bash
npm test          # testes da camada de dados (node:test, sem dependências)
npm run e2e       # testes de ponta a ponta e screenshots (precisa de Python + Playwright)
```

## Onde está cada coisa

| Caminho | O que é |
| --- | --- |
| `index.html`, `assets/css/site.css`, `assets/js/site.js` | Site público |
| `painel.html`, `assets/css/painel.css`, `assets/js/painel.js` | Painel da Thais |
| `assets/js/conteudo-padrao.js` | Conteúdo publicado (o que todo visitante vê) |
| `assets/js/dados.js` | Regras de dados: carregar, validar, salvar, formatar |
| `assets/img/`, `assets/video/` | Marcadores de obras, livros e vídeo de exemplo |
| `tools/gerar_assets.py` | Gera os marcadores e o vídeo de exemplo |
| `docs/` | Design, decisões (ADRs) e specs |

## Importante

- As obras exibidas são **marcadores identificados**. Elas serão trocadas pelos scans reais enviados pela Thais.
- O vídeo de processo é um **exemplo** gerado pela TRIRREME, só para mostrar como ficará.
- Preços, prazos e WhatsApp não são inventados: ficam vazios até serem preenchidos no painel.
