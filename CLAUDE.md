# Contexto do projeto — Site Thais Matos

Fatos operacionais curtos. O mapa do produto está em `docs/design.md`; decisões em `docs/adr/`; features em `docs/specs/`.

## Projeto

- Cliente: Thais Matos (@thaismatosart), desenhista. Empresa: TRIRREME.
- Site estático sem build. Painel local salva em `localStorage` (chave `tm-conteudo-v1`).
- Conteúdo publicado: `assets/js/conteudo-padrao.js`. O painel exporta um arquivo no mesmo formato.

## Comandos

- Servir: `python3 -m http.server 8080`
- Testes de dados: `npm test`
- E2E + screenshots: `npm run e2e` (sobe servidor próprio na porta 8765)
- Regenerar marcadores e vídeo: `python3 tools/gerar_assets.py`

## Regras que nunca mudam (invariantes do design)

1. Só exibir obra com `autoriaConfirmada: true` ou marcador identificado (`marcador: true`).
2. Nunca gerar imagem por IA apresentada como obra da Thais.
3. Não inventar preço, prazo, forma de pagamento, WhatsApp ou link.
4. Botão de encomenda segue o status real (`aberta`, `consulta`, `fechada`).
5. Sem dados pessoais da Thais sem aprovação (religião, time, família ficam fora).
6. Conteúdo legível sem animação; `prefers-reduced-motion` respeitado; sem rolagem horizontal acidental.

## Ambientes

- Só local por enquanto. Deploy (GitHub Pages) é R2: pedir autorização ao Wellington.

## Git

- `main` protegida após o bootstrap; trabalho em `feat/<slug>` com PR. Merge é humano.
- Commits em Conventional Commits, em inglês.
