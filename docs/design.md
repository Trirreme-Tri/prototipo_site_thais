# Site Thais Matos — Documento de Design

Aprovado por Wellington (TRIRREME) em 15/10/2026. Versão editável e comentável: [documento no Claude](https://claude.ai/code/artifact/c16d54a2-e13e-42c2-aa99-b6034cdb68ea). Este arquivo é a cópia de referência do repositório; se divergir, vale a versão mais recente aprovada.

## Contexto e objetivo

O site deve preparar o retorno da Thais Matos às encomendas, mostrando o portfólio como uma exposição e apresentando os livros usados que ela vende.

- **Cliente:** Thais Matos (@thaismatosart), desenhista. Realismo com lápis de cor; também grafite, pastel oleoso e pintura. Temas: retratos, terror, games e cinema, anime e mangá.
- **Comunidade:** administradora da Vanguard Nexus (@vanguard_nexus.ofc), comunidade de arte com collabs temáticas.
- **Situação comercial:** parou de trabalhar com encomendas e pensa em voltar; ainda aceita algumas, dependendo do pedido e de onde a pessoa mora.
- **Público:** chega principalmente pelo Instagram, no celular.

Objetivos, em ordem: (1) mostrar a qualidade técnica e o processo; (2) transformar interesse em pedidos de encomenda quando estiverem abertas; (3) apresentar os livros usados; (4) divulgar a Vanguard Nexus.

## Fronteira e fora de escopo

O site é uma vitrine pública: mostra, explica e leva ao contato. Não vende nem recebe pagamento.

**Dentro:** apresentação, processo, galeria por categorias, sobre; encomendas (status, como funciona, contato); estante de livros com "tenho interesse"; Vanguard Nexus com link do grupo; celular como experiência principal; painel local.

**Fora:** pagamento online, carrinho, estoque automático; login de visitantes; formulário que guarde dados de visitantes; obra gerada por IA apresentada como da Thais; preços, prazos, prêmios ou exposições inventados; informações pessoais sem pedido dela; painel com servidor e login.

## Papéis

| Papel | Faz | Não faz |
| --- | --- | --- |
| Visitante | Navega, vê obras e livros, entra em contato | Login ou pagamento |
| Thais | Fornece obras e textos, confirma autoria, aprova, abre e fecha encomendas, edita pelo painel | Mexer em código |
| TRIRREME | Projeta, desenvolve, publica e mantém | Publicar obra ou texto sem aprovação dela |

## Jornada do visitante

Link na bio → hero (esboço vira cor) → processo e galeria → encomendas abertas? Sim: contato para encomenda. Não: seguir no Instagram. A estante de livros segue o mesmo princípio ("tenho interesse" leva ao contato).

## Mapa de funcionalidades

| # | Funcionalidade | Prioridade |
| --- | --- | --- |
| F1 | Hero "do esboço à cor" | MVP |
| F2 | Processo e técnica: antes/depois, lupa, materiais | MVP |
| F3 | Galeria por categorias com ampliação e ficha técnica | MVP |
| F4 | Sobre a artista | MVP |
| F5 | Vanguard Nexus e link da comunidade | MVP |
| F6 | Encomendas: status, como funciona, contato | MVP |
| F7 | Estante de livros usados | MVP |
| F8 | Painel da Thais (versão local, salva no navegador) | MVP |
| F9 | Vídeos de processo reais | Depois (exemplo no protótipo) |
| F10 | Domínio próprio e hospedagem | Depois |

## Direção visual e movimento

Conceito "do esboço à vida": linha → esboço → camadas de cor → realismo, conduzido pelo scroll. As obras são sempre a estrela.

- Fundo escuro de grafite; o fundo muda conforme a paleta de cada obra.
- Serif editorial + sans moderna (escolhidas no protótipo: Bodoni Moda e Schibsted Grotesk, auto-hospedadas).
- Texturas de papel e grafite; nada de clip-art de pincéis, paletas ou respingos.
- Parallax em camadas, mask reveal, seções fixas, sequência horizontal na galeria, lupa.
- Livros com a mesma identidade, ritmo mais calmo ("Desenhista/Leitora").
- `prefers-reduced-motion`: todo o conteúdo sem animação.
- Referência edolus.com: **não verificada** (bloqueada no ambiente de trabalho).

## Modelo de conteúdo

| Conteúdo | Campos principais |
| --- | --- |
| Obra | título, categoria, técnica, ano, imagem, esboço (opcional), texto alternativo, autoria confirmada, marcador |
| Livro | título, autor, capa, estado de conservação, preço (definido no painel), status: disponível, reservado, vendido |
| Encomendas | status: aberta, sob consulta, fechada; como funciona; condições |
| Perfil e contatos | bio, Instagram, WhatsApp (a definir), comunidade |

## Decisões técnicas

Opção A (site estático) com painel que salva no navegador; Firebase no futuro (ADR 0001). Limite aceito: alterações do painel aparecem só no navegador de quem as fez, até a TRIRREME publicar o arquivo exportado. Animações sem biblioteca externa (ADR 0002).

## Invariantes

1. Só aparece obra com autoria confirmada pela Thais (marcadores identificados são a exceção do protótipo).
2. Nenhuma imagem gerada por IA apresentada como obra dela.
3. Nenhum preço, prazo, forma de pagamento ou link inventado.
4. O botão de encomenda reflete o status real.
5. Nenhum dado pessoal da Thais sem aprovação.
6. Conteúdo legível sem animação; sem rolagem horizontal acidental.
7. Imagens publicadas em resolução para web.

## Autoria, dados pessoais e direitos de imagem

- A Thais confirma a autoria obra por obra (há reposts e obras de outros artistas nos prints recebidos).
- Retratados autorizaram a exibição (confirmado em 15/10/2026).
- Fan art exibida como portfólio, sem logos ou marcas oficiais das franquias.
- Link do grupo da Vanguard Nexus pode ser público (confirmado em 15/10/2026).

## Perguntas abertas (bloqueiam a publicação, não o protótipo)

- Obras com autoria confirmada e originais em alta, incluindo o par esboço + final para o hero.
- Canal de contato para encomendas e livros.
