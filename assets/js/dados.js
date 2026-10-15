/*
 * Regras de dados do site da Thais Matos.
 * Funciona no navegador (window.TMDados) e no Node (require), para ser testado com node:test.
 * Nada aqui toca no DOM: só recebe dados e devolve dados.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.TMDados = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CHAVE = 'tm-conteudo-v1';
  const VERSAO = 1;
  const STATUS_ENCOMENDA = ['aberta', 'consulta', 'fechada'];
  const STATUS_LIVRO = ['disponivel', 'reservado', 'vendido'];
  const PREFIXO_JS = 'window.TM_CONTEUDO_PADRAO = ';

  function clonar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  function texto(valor, padrao) {
    if (typeof valor !== 'string') return padrao === undefined ? '' : padrao;
    return valor.trim();
  }

  // Aceita só https: e caminhos relativos do próprio site (assets/...) ou imagens data: do painel.
  function linkSeguro(url) {
    if (typeof url !== 'string') return '';
    const limpo = url.trim();
    if (limpo === '') return '';
    if (/^https:\/\/[^\s"'<>]+$/i.test(limpo)) return limpo;
    return '';
  }

  function imagemSegura(src) {
    if (typeof src !== 'string') return '';
    const limpo = src.trim();
    if (/^assets\/[\w\-./]+$/.test(limpo) && !limpo.includes('..')) return limpo;
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(limpo)) return limpo;
    return linkSeguro(limpo);
  }

  // Números brasileiros com DDD (10 ou 11 dígitos) ganham o 55 do país.
  function digitosWhatsapp(valor) {
    const d = String(valor || '').replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) return '55' + d;
    if (d.length >= 12 && d.length <= 13) return d;
    return '';
  }

  function preco(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = typeof valor === 'number' ? valor : Number(String(valor).replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  }

  function cor(valor, padrao) {
    return typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor.trim()) ? valor.trim() : padrao;
  }

  function normalizarObra(o, i) {
    if (!o || typeof o !== 'object') return null;
    const imagem = imagemSegura(o.imagem);
    const titulo = texto(o.titulo);
    if (!imagem || !titulo) return null;
    return {
      id: texto(o.id) || 'obra-' + (i + 1),
      titulo,
      categoria: texto(o.categoria, 'Realismo') || 'Realismo',
      tecnica: texto(o.tecnica),
      ano: texto(o.ano),
      imagem,
      esboco: imagemSegura(o.esboco),
      alt: texto(o.alt) || titulo,
      autoriaConfirmada: o.autoriaConfirmada === true,
      marcador: o.marcador === true,
      destaque: o.destaque === true,
      paleta: {
        fundo: cor(o.paleta && o.paleta.fundo, '#17141c'),
        destaque: cor(o.paleta && o.paleta.destaque, '#c9c2d4')
      }
    };
  }

  function normalizarLivro(l, i) {
    if (!l || typeof l !== 'object') return null;
    const titulo = texto(l.titulo);
    if (!titulo) return null;
    return {
      id: texto(l.id) || 'livro-' + (i + 1),
      titulo,
      autor: texto(l.autor),
      estado: texto(l.estado),
      preco: preco(l.preco),
      status: STATUS_LIVRO.includes(l.status) ? l.status : 'disponivel',
      capa: imagemSegura(l.capa),
      marcador: l.marcador === true
    };
  }

  function lista(valor, normalizador) {
    if (!Array.isArray(valor)) return null;
    return valor.map(normalizador).filter(Boolean);
  }

  /*
   * Recebe qualquer coisa (o que estava salvo, um arquivo importado) e devolve
   * conteúdo válido. O que estiver errado ou faltando vem do conteúdo padrão.
   */
  function normalizar(bruto, padrao) {
    const base = clonar(padrao);
    const b = bruto && typeof bruto === 'object' ? bruto : {};
    const perfil = b.perfil || {};
    const contato = b.contato || {};
    const enc = b.encomendas || {};
    const com = b.comunidade || {};

    const passos = Array.isArray(enc.comoFunciona)
      ? enc.comoFunciona.map((p) => texto(p)).filter(Boolean).slice(0, 6)
      : null;

    return {
      versao: VERSAO,
      perfil: {
        nome: texto(perfil.nome) || base.perfil.nome,
        bioCurta: texto(perfil.bioCurta) || base.perfil.bioCurta,
        sobre: texto(perfil.sobre) || base.perfil.sobre,
        sobreProvisorio: typeof perfil.sobreProvisorio === 'boolean' ? perfil.sobreProvisorio : base.perfil.sobreProvisorio,
        instagram: linkSeguro(perfil.instagram) || base.perfil.instagram
      },
      contato: {
        whatsapp: digitosWhatsapp(contato.whatsapp),
        mensagemPadrao: texto(contato.mensagemPadrao) || base.contato.mensagemPadrao
      },
      encomendas: {
        status: STATUS_ENCOMENDA.includes(enc.status) ? enc.status : base.encomendas.status,
        condicoes: texto(enc.condicoes) || base.encomendas.condicoes,
        comoFunciona: passos && passos.length ? passos : base.encomendas.comoFunciona,
        passosProvisorios: typeof enc.passosProvisorios === 'boolean' ? enc.passosProvisorios : base.encomendas.passosProvisorios
      },
      comunidade: {
        nome: texto(com.nome) || base.comunidade.nome,
        descricao: texto(com.descricao) || base.comunidade.descricao,
        instagram: linkSeguro(com.instagram) || base.comunidade.instagram,
        grupo: linkSeguro(com.grupo) || base.comunidade.grupo
      },
      categorias: Array.isArray(b.categorias) && b.categorias.every((c) => typeof c === 'string' && c.trim())
        ? b.categorias.map((c) => c.trim())
        : base.categorias,
      obras: lista(b.obras, normalizarObra) || base.obras,
      livros: lista(b.livros, normalizarLivro) || base.livros,
      video: {
        src: imagemSegura(b.video && b.video.src) || base.video.src,
        poster: imagemSegura(b.video && b.video.poster) || base.video.poster,
        marcador: b.video && typeof b.video.marcador === 'boolean' ? b.video.marcador : base.video.marcador
      }
    };
  }

  // Invariante 1: só obra com autoria confirmada ou marcador identificado.
  function obrasVisiveis(conteudo, categoria) {
    return conteudo.obras.filter((o) => {
      if (!(o.autoriaConfirmada || o.marcador)) return false;
      if (!categoria || categoria === 'Todas') return true;
      return o.categoria === categoria;
    });
  }

  function obraDoHero(conteudo) {
    const visiveis = obrasVisiveis(conteudo);
    return visiveis.find((o) => o.destaque && o.esboco) || visiveis.find((o) => o.esboco) || visiveis[0] || null;
  }

  const formatadorReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function formatarPreco(valor) {
    const n = preco(valor);
    if (n === null) return 'Preço sob consulta';
    // Intl usa espaço não separável entre "R$" e o número; normalizamos para espaço comum.
    return formatadorReal.format(n).replace(/ /g, ' ');
  }

  const ROTULO_STATUS_LIVRO = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' };

  function linkContato(conteudo, mensagem) {
    const numero = conteudo.contato.whatsapp;
    if (numero) {
      const msg = texto(mensagem) || conteudo.contato.mensagemPadrao;
      return { canal: 'whatsapp', href: 'https://wa.me/' + numero + '?text=' + encodeURIComponent(msg) };
    }
    return { canal: 'instagram', href: conteudo.perfil.instagram };
  }

  function ctaEncomenda(conteudo, contexto) {
    const status = conteudo.encomendas.status;
    const msg = contexto
      ? 'Olá, Thais! Vi "' + contexto + '" no seu site e quero conversar sobre uma encomenda.'
      : conteudo.contato.mensagemPadrao;
    if (status === 'fechada') {
      return {
        status,
        rotulo: 'Seguir no Instagram',
        resumo: 'Encomendas fechadas',
        descricao: 'As encomendas estão fechadas no momento. A abertura é anunciada no Instagram.',
        href: conteudo.perfil.instagram,
        canal: 'instagram'
      };
    }
    const contato = linkContato(conteudo, msg);
    if (status === 'aberta') {
      return {
        status,
        rotulo: 'Encomende seu desenho',
        resumo: 'Encomendas abertas',
        descricao: 'As encomendas estão abertas. Conte sua ideia e envie a foto de referência.',
        href: contato.href,
        canal: contato.canal
      };
    }
    return {
      status,
      rotulo: 'Consultar uma encomenda',
      resumo: 'Encomendas sob consulta',
      descricao: conteudo.encomendas.condicoes,
      href: contato.href,
      canal: contato.canal
    };
  }

  function linkInteresseLivro(conteudo, livro) {
    return linkContato(conteudo, 'Olá, Thais! Tenho interesse no livro "' + livro.titulo + '" que vi no seu site.');
  }

  /* ---------- Armazenamento (localStorage ou qualquer objeto com getItem/setItem) ---------- */

  function carregar(storage, padrao) {
    try {
      const salvo = storage && storage.getItem(CHAVE);
      if (salvo) return { conteudo: normalizar(JSON.parse(salvo), padrao), local: true };
    } catch (e) {
      // Conteúdo salvo corrompido ou storage bloqueado: usa o publicado.
    }
    return { conteudo: normalizar(padrao, padrao), local: false };
  }

  function salvar(storage, conteudo) {
    if (!storage) return { ok: false, erro: 'indisponivel' };
    const serializado = JSON.stringify(conteudo);
    try {
      storage.setItem(CHAVE, serializado);
      return { ok: true, bytes: serializado.length * 2 };
    } catch (e) {
      const cheio = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
      return { ok: false, erro: cheio ? 'cheio' : 'indisponivel' };
    }
  }

  function limpar(storage) {
    try {
      storage.removeItem(CHAVE);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Tamanho aproximado do conteúdo salvo, em bytes (UTF-16: 2 bytes por caractere).
  function tamanhoSalvo(storage) {
    try {
      const v = storage.getItem(CHAVE);
      return v ? v.length * 2 : 0;
    } catch (e) {
      return 0;
    }
  }

  /* ---------- Exportar e importar ---------- */

  function serializarParaPublicacao(conteudo) {
    return '/* Conteúdo publicado do site Thais Matos. Gerado pelo painel. */\n' +
      PREFIXO_JS + JSON.stringify(conteudo, null, 2) + ';\n' +
      "if (typeof module !== 'undefined') module.exports = window.TM_CONTEUDO_PADRAO;\n";
  }

  function lerImportacao(textoArquivo, padrao) {
    if (typeof textoArquivo !== 'string' || !textoArquivo.trim()) {
      return { ok: false, erro: 'O arquivo está vazio.' };
    }
    let corpo = textoArquivo.trim();
    const inicio = corpo.indexOf(PREFIXO_JS);
    if (inicio !== -1) {
      corpo = corpo.slice(inicio + PREFIXO_JS.length);
      const fim = corpo.lastIndexOf('};');
      if (fim === -1) return { ok: false, erro: 'O arquivo não está no formato exportado pelo painel.' };
      corpo = corpo.slice(0, fim + 1);
    }
    let dados;
    try {
      dados = JSON.parse(corpo);
    } catch (e) {
      return { ok: false, erro: 'O arquivo não está no formato exportado pelo painel.' };
    }
    if (!dados || typeof dados !== 'object' || dados.versao !== VERSAO) {
      return { ok: false, erro: 'Este arquivo é de outra versão do painel e não pode ser importado.' };
    }
    return { ok: true, conteudo: normalizar(dados, padrao) };
  }

  return {
    CHAVE,
    VERSAO,
    STATUS_ENCOMENDA,
    STATUS_LIVRO,
    ROTULO_STATUS_LIVRO,
    clonar,
    linkSeguro,
    imagemSegura,
    digitosWhatsapp,
    preco,
    normalizar,
    obrasVisiveis,
    obraDoHero,
    formatarPreco,
    linkContato,
    ctaEncomenda,
    linkInteresseLivro,
    carregar,
    salvar,
    limpar,
    tamanhoSalvo,
    serializarParaPublicacao,
    lerImportacao
  };
});
