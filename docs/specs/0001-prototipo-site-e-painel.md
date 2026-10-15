# Spec 0001 — Protótipo do site e painel local

**Status:** aprovada por Wellington (15/10/2026). Cobre F1–F8 do `docs/design.md`.

## Problema

A Thais precisa de um site que mostre a qualidade e o processo das obras, apresente os livros usados e prepare o retorno às encomendas. Ela precisa ver e alterar o conteúdo sem mexer em código.

## Jornada

1. Visitante chega pelo link na bio, no celular.
2. Hero: a obra começa em grafite e ganha cor conforme o scroll.
3. Processo: linha, esboço, camadas, realismo; vídeo de processo; lupa nos detalhes.
4. Coleção: categorias, ampliação em tela cheia com ficha técnica e botão de encomenda.
5. Artista, Vanguard Nexus, estante de livros, encomendas, rodapé.
6. A Thais abre `painel.html`, altera e clica em salvar; ao abrir o site no mesmo navegador, vê as mudanças.

## Escopo

**Dentro:** `index.html` (site), `painel.html` (painel), camada de dados com testes, marcadores identificados de obras e livros, vídeo de exemplo, exportar/importar conteúdo no painel.

**Fora:** Firebase, login, deploy, domínio, imagens reais (ainda não enviadas), formulários que enviem dados.

## Critérios de aceite (binários)

1. O site abre sem erros no console em 1440×900, 834×1112 e 390×844.
2. Em nenhuma dessas larguras a página tem rolagem horizontal (`scrollWidth <= innerWidth`).
3. No hero, a camada colorida começa oculta (progresso 0) e fica totalmente visível no fim da cena (progresso 1).
4. Com `prefers-reduced-motion: reduce`, as cenas mostram o estado final e nenhuma seção fica fixa.
5. Toda obra exibida tem `marcador: true` (com aviso visível de substituição) ou `autoriaConfirmada: true`; obra sem nenhum dos dois não aparece.
6. Os filtros de categoria mostram só as obras daquela categoria; "Todas" mostra todas as visíveis.
7. Clicar numa obra abre a ampliação com título, técnica, categoria e botão de encomenda; `Esc` fecha.
8. O botão principal de encomenda muda de texto e destino conforme o status: `aberta`, `consulta`, `fechada`.
9. Com WhatsApp vazio, os botões de contato levam ao Instagram da Thais; com número preenchido, levam a `wa.me` com mensagem.
10. Preço de livro vazio aparece como "Preço sob consulta"; preenchido aparece em reais (ex.: "R$ 35,00"); livro vendido aparece marcado como vendido.
11. No painel: alterar o status das encomendas, salvar e recarregar o site muda o botão de encomenda.
12. No painel: adicionar um livro com preço, salvar e recarregar o site mostra o livro com o preço.
13. Exportar gera um arquivo que, importado de volta, reproduz o mesmo conteúdo.
14. "Restaurar conteúdo publicado" apaga as alterações locais.
15. Se o armazenamento do navegador estiver cheio, o painel mostra uma mensagem clara e não perde o que já estava salvo.
16. Toda imagem tem texto alternativo.

## Invariantes

As do `docs/design.md`, em especial: nada inventado (preço, prazo, WhatsApp), nada gerado por IA como obra dela, botão de encomenda fiel ao status.

## Dados

Chave `tm-conteudo-v1` no `localStorage`, com o mesmo formato de `assets/js/conteudo-padrao.js`. Nenhum dado de visitante é coletado.

## Segurança

- Texto vindo do painel é inserido com `textContent`, nunca como HTML.
- Links editáveis aceitam só `https:`; o WhatsApp é montado a partir dos dígitos.
- Importação valida o formato antes de salvar.

## Plano de verificação

- `npm test`: regras de dados (critérios 5, 8, 9, 10, 13, 15).
- `npm run e2e`: navegador real (critérios 1–4, 6, 7, 11, 12, 14, 16) e screenshots em 3 larguras.
- Revisão independente do diff antes do PR.

## Rollout / rollback

Sem deploy nesta spec. Entrega por branch `feat/prototipo-site-painel` e PR; merge é humano. Rollback: reverter o merge.

## Perguntas abertas (não bloqueantes para o protótipo)

- Canal de contato definitivo (WhatsApp, DM ou e-mail).
- Obras reais com autoria confirmada e o par esboço + final do hero.
