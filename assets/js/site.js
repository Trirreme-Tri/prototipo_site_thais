/*
 * Site Thais Matos: monta o conteúdo e controla as cenas de scroll.
 * Todo texto vindo do painel entra com textContent (nunca como HTML).
 */
(function () {
  'use strict';

  const D = window.TMDados;
  const PADRAO = window.TM_CONTEUDO_PADRAO;
  const raiz = document.documentElement;
  const semMovimento = raiz.classList.contains('sem-movimento');

  let storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }
  const { conteudo, local } = D.carregar(storage, PADRAO);

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function el(tag, attrs, filhos) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'texto') n.textContent = v;
        else if (k === 'classe') n.className = v;
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    (filhos || []).forEach((f) => f && n.appendChild(f));
    return n;
  }

  function valorEm(caminho) {
    return caminho.split('.').reduce((o, k) => (o ? o[k] : undefined), conteudo);
  }

  /* ---------- Textos e links simples ---------- */

  $$('[data-texto]').forEach((n) => {
    const v = valorEm(n.dataset.texto);
    if (typeof v === 'string' && v) n.textContent = v;
  });
  $$('[data-link]').forEach((n) => {
    const v = valorEm(n.dataset.link);
    if (v) n.href = v;
    else n.remove();
  });
  $('[data-aviso-sobre]').hidden = !conteudo.perfil.sobreProvisorio;
  $('[data-selo-local]').hidden = !local;

  /* ---------- Encomendas ---------- */

  const cta = D.ctaEncomenda(conteudo);
  $$('[data-cta-encomenda]').forEach((a) => {
    a.textContent = cta.rotulo;
    a.dataset.status = cta.status;
    // Hero leva à seção de encomendas; o botão da seção abre o contato.
    // Com encomendas fechadas, todos levam ao Instagram, para o rótulo bater com o destino.
    if (a.dataset.ctaEncomenda === 'externo' || cta.status === 'fechada') {
      a.href = cta.href;
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
  const status = $('[data-status]');
  status.dataset.valor = cta.status;
  $('[data-status-texto]').textContent = cta.resumo;
  $('[data-status-descricao]').textContent = cta.descricao;
  const contato = D.linkContato(conteudo);
  const linkContato = $('[data-contato]');
  linkContato.href = contato.href;
  linkContato.textContent = contato.canal === 'whatsapp' ? 'Falar com a Thais no WhatsApp' : 'Falar com a Thais pelo Instagram';
  if (cta.status === 'fechada') linkContato.remove();

  const passos = $('[data-passos]');
  conteudo.encomendas.comoFunciona.forEach((p) => passos.appendChild(el('li', { texto: p })));
  $('[data-aviso-passos]').hidden = !conteudo.encomendas.passosProvisorios;

  /* ---------- Estante de livros ---------- */

  const estante = $('[data-estante]');
  conteudo.livros.forEach((livro) => {
    const vendido = livro.status === 'vendido';
    const capa = el('div', { classe: 'livro__capa' }, [
      livro.capa
        ? el('img', { src: livro.capa, alt: 'Capa de ' + livro.titulo, loading: 'lazy', decoding: 'async', width: 400, height: 600 })
        : null,
      livro.status !== 'disponivel' ? el('span', { classe: 'livro__selo', texto: D.ROTULO_STATUS_LIVRO[livro.status] }) : null
    ]);
    const botao = vendido
      ? el('span', { classe: 'botao botao--linha', 'aria-disabled': 'true', texto: 'Vendido' })
      : el('a', {
        classe: 'botao botao--linha',
        href: D.linkInteresseLivro(conteudo, livro).href,
        target: '_blank',
        rel: 'noopener',
        texto: 'Tenho interesse'
      });
    estante.appendChild(el('li', { classe: 'livro' + (vendido ? ' livro--vendido' : '') }, [
      capa,
      el('h3', { classe: 'livro__titulo', texto: livro.titulo }),
      livro.autor ? el('p', { classe: 'livro__autor', texto: livro.autor }) : null,
      livro.estado ? el('p', { classe: 'livro__estado', texto: livro.estado }) : null,
      vendido ? null : el('p', { classe: 'livro__preco', texto: D.formatarPreco(livro.preco) }),
      botao
    ]));
  });
  if (!conteudo.livros.length) {
    estante.appendChild(el('li', { classe: 'texto-apoio', texto: 'Nenhum livro à venda no momento.' }));
  }
  $('[data-aviso-livros]').hidden = !conteudo.livros.some((l) => l.marcador);

  /* ---------- Hero, processo, comparação, vídeo ---------- */

  const hero = D.obraDoHero(conteudo);
  if (hero) {
    const esboco = hero.esboco || hero.imagem;
    $('[data-hero-esboco]').src = esboco;
    $('[data-hero-cor]').src = hero.imagem;
    $('[data-hero-cor]').alt = hero.alt;
    $('[data-hero-legenda]').textContent = hero.marcador
      ? 'Marcador: a obra de abertura será um scan real da Thais.'
      : hero.titulo;
    $('[data-proc-esboco]').src = esboco;
    $('[data-proc-cor]').src = hero.imagem;
    $('[data-comparar-antes]').src = esboco;
    $('[data-comparar-antes]').alt = 'Esboço: ' + hero.alt;
    $('[data-comparar-depois]').src = hero.imagem;
    $('[data-comparar-depois]').alt = 'Finalizada: ' + hero.alt;
    raiz.style.setProperty('--acento', hero.paleta.destaque);
  }

  const video = $('[data-video]');
  video.poster = conteudo.video.poster;
  video.appendChild(el('source', { src: conteudo.video.src, type: 'video/mp4' }));
  video.setAttribute('aria-label', 'Timelapse do processo de desenho');
  if (conteudo.video.marcador) {
    $('[data-video-legenda]').textContent = 'Vídeo de exemplo. Será trocado pelo timelapse real da Thais.';
  }
  // Toca só quando aparece na tela, e nunca com "menos movimento".
  if ('IntersectionObserver' in window && !semMovimento) {
    new IntersectionObserver((itens) => {
      itens.forEach((i) => {
        if (i.isIntersecting) { video.preload = 'auto'; video.play().catch(() => {}); } else video.pause();
      });
    }, { threshold: 0.35 }).observe(video);
  } else {
    video.controls = true;
  }

  // Comparação antes/depois com controle deslizante.
  const area = $('.comparar__area');
  const range = $('[data-comparar-range]');
  range.addEventListener('input', () => area.style.setProperty('--corte', range.value + '%'));

  // Lupa: segue o cursor; no toque, aparece onde a pessoa tocar.
  const lupa = $('[data-lupa]');
  const ZOOM = 2.6;
  function moverLupa(evento) {
    const r = area.getBoundingClientRect();
    const x = Math.min(Math.max(evento.clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(evento.clientY - r.top, 0), r.height);
    const corte = (parseFloat(range.value) / 100) * r.width;
    const src = x < corte ? $('[data-comparar-antes]').src : $('[data-comparar-depois]').src;
    lupa.style.backgroundImage = 'url("' + src + '")';
    lupa.style.backgroundSize = r.width * ZOOM + 'px ' + r.height * ZOOM + 'px';
    lupa.style.backgroundPosition = (-x * ZOOM + 85) + 'px ' + (-y * ZOOM + 85) + 'px';
    lupa.style.left = x + 'px';
    lupa.style.top = y + 'px';
    lupa.classList.add('esta-visivel');
  }
  area.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') moverLupa(e); });
  area.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') lupa.classList.remove('esta-visivel'); });
  area.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    if (lupa.classList.contains('esta-visivel') && e.target === area) lupa.classList.remove('esta-visivel');
    else moverLupa(e);
  });

  /* ---------- Coleção ---------- */

  const filtros = $('[data-filtros]');
  const trilho = $('[data-colecao-trilho]');
  const cenaColecao = $('[data-cena="colecao"]');
  let obrasAtuais = [];
  let categoriaAtual = 'Todas';

  const categoriasComObra = ['Todas'].concat(
    conteudo.categorias.filter((c) => D.obrasVisiveis(conteudo, c).length > 0)
  );
  categoriasComObra.forEach((c) => {
    const b = el('button', { type: 'button', classe: 'filtro', 'aria-pressed': c === 'Todas' ? 'true' : 'false', texto: c });
    b.addEventListener('click', () => {
      categoriaAtual = c;
      $$('.filtro', filtros).forEach((f) => f.setAttribute('aria-pressed', f === b ? 'true' : 'false'));
      montarColecao();
    });
    filtros.appendChild(b);
  });

  function montarColecao() {
    obrasAtuais = D.obrasVisiveis(conteudo, categoriaAtual);
    trilho.replaceChildren();
    if (!obrasAtuais.length) {
      trilho.appendChild(el('li', { classe: 'colecao__vazio', texto: 'Nenhuma obra nesta categoria ainda.' }));
    }
    obrasAtuais.forEach((obra, i) => {
      const botao = el('button', { type: 'button', 'aria-label': 'Ampliar ' + obra.titulo }, [
        el('div', { classe: 'obra-cartao__imagem' }, [
          el('img', { src: obra.imagem, alt: obra.alt, loading: 'lazy', decoding: 'async', width: 800, height: 1000 })
        ]),
        el('div', { classe: 'obra-cartao__legenda' }, [
          el('span', { classe: 'obra-cartao__titulo', texto: obra.titulo }),
          el('span', { classe: 'obra-cartao__categoria', texto: obra.categoria })
        ])
      ]);
      botao.addEventListener('click', () => abrirVisor(i));
      trilho.appendChild(el('li', { classe: 'obra-cartao', 'data-indice': String(i) }, [botao]));
    });
    const janela = $('[data-colecao-janela]');
    janela.scrollLeft = 0;
    medirColecao();
    atualizarCenas();
  }

  /* ---------- Visor ---------- */

  const visor = $('[data-visor]');
  let indiceVisor = 0;
  function preencherVisor() {
    const obra = obrasAtuais[indiceVisor];
    if (!obra) return;
    const img = $('[data-visor-img]');
    img.src = obra.imagem;
    img.alt = obra.alt;
    $('[data-visor-categoria]').textContent = obra.categoria;
    $('[data-visor-titulo]').textContent = obra.titulo;
    $('[data-visor-tecnica]').textContent = obra.tecnica || 'Não informada';
    $('[data-visor-ano]').textContent = obra.ano;
    $('[data-visor-ano-linha]').hidden = !obra.ano;
    $('[data-visor-aviso]').hidden = !obra.marcador;
    const ctaObra = D.ctaEncomenda(conteudo, obra.marcador ? '' : obra.titulo);
    const botao = $('[data-visor-cta]');
    botao.href = ctaObra.href;
    botao.textContent = ctaObra.status === 'fechada' ? ctaObra.rotulo : 'Quero um desenho assim';
    visor.style.setProperty('--visor-fundo', obra.paleta.fundo);
    const so = obrasAtuais.length < 2;
    $('[data-visor-anterior]').hidden = so;
    $('[data-visor-proxima]').hidden = so;
  }
  function abrirVisor(i) {
    indiceVisor = i;
    preencherVisor();
    if (typeof visor.showModal === 'function') visor.showModal();
    else visor.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }
  visor.addEventListener('close', () => { document.body.style.overflow = ''; });
  $('[data-visor-fechar]').addEventListener('click', () => visor.close());
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });
  $('[data-visor-anterior]').addEventListener('click', () => {
    indiceVisor = (indiceVisor - 1 + obrasAtuais.length) % obrasAtuais.length;
    preencherVisor();
  });
  $('[data-visor-proxima]').addEventListener('click', () => {
    indiceVisor = (indiceVisor + 1) % obrasAtuais.length;
    preencherVisor();
  });
  visor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') $('[data-visor-proxima]').click();
    if (e.key === 'ArrowLeft') $('[data-visor-anterior]').click();
  });

  /* ---------- Menu no celular ---------- */

  const menuBotao = $('[data-menu]');
  const menu = $('#menu-secoes');
  function fecharMenu() {
    menu.classList.remove('esta-aberto');
    menuBotao.setAttribute('aria-expanded', 'false');
    menuBotao.textContent = 'Menu';
  }
  menuBotao.addEventListener('click', () => {
    const abrir = !menu.classList.contains('esta-aberto');
    menu.classList.toggle('esta-aberto', abrir);
    menuBotao.setAttribute('aria-expanded', String(abrir));
    menuBotao.textContent = abrir ? 'Fechar' : 'Menu';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', fecharMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenu(); });

  /* ---------- Motor das cenas (ADR 0002) ---------- */

  const cenas = $$('[data-cena]');
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
  const faixa = (p, ini, fim) => limitar((p - ini) / (fim - ini), 0, 1);
  const etapas = $$('[data-etapas] .etapa');
  const processo = $('.processo');
  let colecaoFixa = false;

  function medirColecao() {
    const largo = window.matchMedia('(min-width: 721px)').matches;
    colecaoFixa = largo && !semMovimento;
    if (!colecaoFixa) {
      cenaColecao.style.height = '';
      cenaColecao.style.setProperty('--trilho-desloca', '0px');
      return;
    }
    const desloca = Math.max(0, trilho.scrollWidth - window.innerWidth);
    cenaColecao.style.setProperty('--trilho-desloca', desloca + 'px');
    cenaColecao.style.height = 'calc(100vh + ' + desloca + 'px)';
  }

  function progressoDe(cena) {
    const r = cena.getBoundingClientRect();
    const total = cena.offsetHeight - window.innerHeight;
    if (total <= 0) return r.top <= 0 ? 1 : 0;
    return limitar(-r.top / total, 0, 1);
  }

  function atualizarHero(cena, p) {
    cena.style.setProperty('--pl', faixa(p, 0, 0.14).toFixed(4));
    cena.style.setProperty('--pc', faixa(p, 0.12, 0.66).toFixed(4));
    const pf = faixa(p, 0.7, 0.95);
    cena.style.setProperty('--pf', pf.toFixed(4));
    if (pf > 0.02) cena.dataset.final = '';
    else delete cena.dataset.final;
  }

  function atualizarProcesso(p) {
    const etapa = Math.min(3, Math.floor(p * 4.0001));
    if (processo.dataset.etapa !== String(etapa)) {
      processo.dataset.etapa = String(etapa);
      etapas.forEach((li, i) => li.classList.toggle('esta-ativa', i === etapa));
    }
  }

  function atualizarColecao(p) {
    if (!obrasAtuais.length) return;
    let indice = 0;
    if (colecaoFixa) indice = Math.round(p * (obrasAtuais.length - 1));
    else {
      const janela = $('[data-colecao-janela]');
      const cartoes = $$('.obra-cartao', trilho);
      const centro = janela.scrollLeft + janela.clientWidth / 2;
      let melhor = Infinity;
      cartoes.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centro);
        if (d < melhor) { melhor = d; indice = i; }
      });
    }
    const obra = obrasAtuais[limitar(indice, 0, obrasAtuais.length - 1)];
    cenaColecao.style.setProperty('--fundo-colecao', obra.paleta.fundo);
  }

  let agendado = false;
  function atualizarCenas() {
    agendado = false;
    const vh = window.innerHeight;
    cenas.forEach((cena) => {
      const r = cena.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = semMovimento ? 1 : progressoDe(cena);
      cena.style.setProperty('--p', p.toFixed(4));
      const tipo = cena.dataset.cena;
      if (tipo === 'hero' && !semMovimento) atualizarHero(cena, p);
      if (tipo === 'processo') atualizarProcesso(p);
      if (tipo === 'colecao') atualizarColecao(p);
    });
  }
  function agendar() {
    if (!agendado) { agendado = true; requestAnimationFrame(atualizarCenas); }
  }

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', () => { medirColecao(); agendar(); });
  $('[data-colecao-janela]').addEventListener('scroll', agendar, { passive: true });

  // Teclado na coleção fixa: o foco não pode rolar a janela por dentro (ela é movida pelo scroll da página).
  // Levamos a página até o ponto em que o cartão focado aparece.
  $('[data-colecao-janela]').addEventListener('focusin', (e) => {
    if (!colecaoFixa) return;
    const janela = $('[data-colecao-janela]');
    janela.scrollLeft = 0;
    const cartao = e.target.closest('.obra-cartao');
    const desloca = Math.max(0, trilho.scrollWidth - window.innerWidth);
    if (!cartao || !desloca) return;
    const alvo = limitar((cartao.offsetLeft + cartao.offsetWidth / 2 - window.innerWidth / 2) / desloca, 0, 1);
    const topo = cenaColecao.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: topo + (cenaColecao.offsetHeight - window.innerHeight) * alvo, behavior: 'instant' });
  });
  window.addEventListener('load', () => { medirColecao(); agendar(); });

  if (semMovimento) {
    processo.dataset.etapa = '3';
    etapas.forEach((li) => li.classList.add('esta-ativa'));
  }
  montarColecao();
})();
