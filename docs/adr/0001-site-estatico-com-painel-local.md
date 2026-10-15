# ADR 0001 — Site estático com painel que salva no navegador

**Status:** aceito (15/10/2026, Wellington)

## Contexto

A Thais precisa atualizar livros (preço, vendido) e o status das encomendas. A TRIRREME ainda não definiu hospedagem, banco padrão nem mensalidade. O projeto está em fase de protótipo.

## Opções

| Opção | A favor | Contra |
| --- | --- | --- |
| A. Site estático, conteúdo em arquivo | Custo zero, simples, sem login | Cada mudança exige a TRIRREME publicar |
| A + painel local (localStorage) | Ela vê e testa mudanças sozinha; zero infraestrutura | Mudanças ficam só no navegador dela até serem exportadas e publicadas |
| B. Next.js + TypeScript + Firebase | Ela publica sozinha, para todos | Mais horas, login, regras de segurança, custo mensal |

## Decisão

A + painel local. O painel salva em `localStorage` e exporta o arquivo `conteudo-padrao.js`, que a TRIRREME publica.

## Razões

Menor solução que entrega o que foi pedido agora. O modelo de dados já é o mesmo que irá para o Firebase.

## Trade-offs aceitos

- Visitantes não veem as mudanças do painel até a publicação.
- `localStorage` tem limite de alguns MB por site (o valor varia por navegador): imagens enviadas pelo painel são reduzidas, e o painel mostra quanto espaço resta.
- O painel não tem senha: ele só altera o navegador de quem o abre, então não há dado a proteger. Fica fora dos buscadores (`noindex`).

## Gatilhos para revisitar

- A Thais quer publicar sem depender da TRIRREME.
- Mais de algumas atualizações por semana.
- Contrato e mensalidade definidos (migrar para Firebase, como no site da Bru).
