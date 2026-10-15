'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.window = globalThis.window || {};
const PADRAO = require('../assets/js/conteudo-padrao.js');
const D = require('../assets/js/dados.js');

function storageFalso(opcoes = {}) {
  const mapa = new Map();
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => {
      if (opcoes.limite && v.length > opcoes.limite) {
        const e = new Error('cheio');
        e.name = 'QuotaExceededError';
        throw e;
      }
      mapa.set(k, String(v));
    },
    removeItem: (k) => mapa.delete(k),
    _mapa: mapa
  };
}

function conteudo(alteracoes = {}) {
  const base = D.normalizar(PADRAO, PADRAO);
  return D.normalizar({ ...base, ...alteracoes }, PADRAO);
}

test('o conteúdo padrão já é válido (normalizar não muda nada)', () => {
  const n = D.normalizar(PADRAO, PADRAO);
  assert.deepEqual(n, D.normalizar(n, PADRAO));
  assert.equal(n.obras.length, PADRAO.obras.length);
  assert.equal(n.livros.length, PADRAO.livros.length);
});

test('critério 5: obra sem autoria confirmada e sem marcador não aparece', () => {
  const c = conteudo({
    obras: [
      { titulo: 'Real confirmada', imagem: 'assets/a.png', autoriaConfirmada: true },
      { titulo: 'Repost', imagem: 'assets/b.png' },
      { titulo: 'Marcador', imagem: 'assets/c.svg', marcador: true }
    ]
  });
  const titulos = D.obrasVisiveis(c).map((o) => o.titulo);
  assert.deepEqual(titulos, ['Real confirmada', 'Marcador']);
});

test('filtro por categoria e "Todas"', () => {
  const c = conteudo();
  assert.ok(D.obrasVisiveis(c, 'Terror').every((o) => o.categoria === 'Terror'));
  assert.equal(D.obrasVisiveis(c, 'Terror').length, 2);
  assert.equal(D.obrasVisiveis(c, 'Todas').length, D.obrasVisiveis(c).length);
});

test('hero usa a obra em destaque que tem esboço', () => {
  const hero = D.obraDoHero(conteudo());
  assert.equal(hero.id, 'obra-01');
  assert.ok(hero.esboco);
});

test('critério 8: botão de encomenda muda com o status', () => {
  const aberta = D.ctaEncomenda(conteudo({ encomendas: { status: 'aberta' } }));
  const consulta = D.ctaEncomenda(conteudo({ encomendas: { status: 'consulta' } }));
  const fechada = D.ctaEncomenda(conteudo({ encomendas: { status: 'fechada' } }));
  assert.equal(aberta.rotulo, 'Encomende seu desenho');
  assert.equal(consulta.rotulo, 'Consultar uma encomenda');
  assert.equal(fechada.rotulo, 'Seguir no Instagram');
  assert.equal(fechada.href, 'https://instagram.com/thaismatosart');
});

test('status desconhecido volta para o padrão', () => {
  assert.equal(conteudo({ encomendas: { status: 'talvez' } }).encomendas.status, 'consulta');
});

test('critério 9: sem WhatsApp o contato vai para o Instagram; com número vai para wa.me', () => {
  const sem = D.ctaEncomenda(conteudo({ encomendas: { status: 'aberta' } }));
  assert.equal(sem.canal, 'instagram');
  const com = D.ctaEncomenda(conteudo({ encomendas: { status: 'aberta' }, contato: { whatsapp: '(69) 99999-0000' } }));
  assert.equal(com.canal, 'whatsapp');
  assert.match(com.href, /^https:\/\/wa\.me\/5569999990000\?text=/);
});

test('número de WhatsApp inválido é descartado', () => {
  assert.equal(D.digitosWhatsapp('123'), '');
  assert.equal(D.digitosWhatsapp('69 3535-0000'), '556935350000');
  assert.equal(D.digitosWhatsapp('+55 69 99999-0000'), '5569999990000');
});

test('critério 10: preço vazio, preço em reais e vendido', () => {
  assert.equal(D.formatarPreco(null), 'Preço sob consulta');
  assert.equal(D.formatarPreco(''), 'Preço sob consulta');
  assert.equal(D.formatarPreco(35), 'R$ 35,00');
  assert.equal(D.formatarPreco('35,5'), 'R$ 35,50');
  assert.equal(D.formatarPreco(-1), 'Preço sob consulta');
  const c = conteudo({ livros: [{ titulo: 'X', status: 'vendido', preco: '20' }] });
  assert.equal(c.livros[0].status, 'vendido');
  assert.equal(c.livros[0].preco, 20);
  assert.equal(D.ROTULO_STATUS_LIVRO[c.livros[0].status], 'Vendido');
});

test('links: só https; javascript: e http: são recusados', () => {
  assert.equal(D.linkSeguro('javascript:alert(1)'), '');
  assert.equal(D.linkSeguro('http://exemplo.com'), '');
  assert.equal(D.linkSeguro('https://instagram.com/x'), 'https://instagram.com/x');
  assert.equal(D.imagemSegura('assets/../segredo'), '');
  assert.equal(D.imagemSegura('data:image/svg+xml;base64,AAA'), '');
  assert.equal(D.imagemSegura('data:image/jpeg;base64,AAAA'), 'data:image/jpeg;base64,AAAA');
});

test('salvar e carregar devolvem o mesmo conteúdo, marcado como local', () => {
  const s = storageFalso();
  const c = conteudo({ encomendas: { status: 'fechada' } });
  assert.equal(D.salvar(s, c).ok, true);
  const lido = D.carregar(s, PADRAO);
  assert.equal(lido.local, true);
  assert.deepEqual(lido.conteudo, c);
});

test('sem nada salvo, carrega o publicado', () => {
  const lido = D.carregar(storageFalso(), PADRAO);
  assert.equal(lido.local, false);
  assert.equal(lido.conteudo.encomendas.status, 'consulta');
});

test('conteúdo salvo corrompido cai para o publicado', () => {
  const s = storageFalso();
  s.setItem(D.CHAVE, '{quebrado');
  assert.equal(D.carregar(s, PADRAO).local, false);
});

test('critério 15: armazenamento cheio devolve erro e mantém o que já estava salvo', () => {
  const s = storageFalso({ limite: 60000 });
  const pequeno = conteudo({ encomendas: { status: 'aberta' } });
  assert.equal(D.salvar(s, pequeno).ok, true);
  const grande = conteudo({ livros: [{ titulo: 'Grande', capa: 'data:image/jpeg;base64,' + 'A'.repeat(80000) }] });
  const r = D.salvar(s, grande);
  assert.deepEqual(r, { ok: false, erro: 'cheio' });
  assert.equal(D.carregar(s, PADRAO).conteudo.encomendas.status, 'aberta');
});

test('critério 13: exportar e importar reproduz o mesmo conteúdo', () => {
  const c = conteudo({ encomendas: { status: 'aberta' }, livros: [{ titulo: 'Dom Casmurro', preco: 25 }] });
  const arquivo = D.serializarParaPublicacao(c);
  const r = D.lerImportacao(arquivo, PADRAO);
  assert.equal(r.ok, true);
  assert.deepEqual(r.conteudo, c);
  // O arquivo exportado também roda como o conteúdo publicado.
  const sandbox = { window: {}, module: { exports: {} } };
  new Function('window', 'module', arquivo)(sandbox.window, sandbox.module);
  assert.deepEqual(sandbox.window.TM_CONTEUDO_PADRAO, c);
});

test('importar aceita JSON puro e recusa arquivos inválidos', () => {
  const c = conteudo();
  assert.equal(D.lerImportacao(JSON.stringify(c), PADRAO).ok, true);
  assert.equal(D.lerImportacao('', PADRAO).ok, false);
  assert.equal(D.lerImportacao('isso não é json', PADRAO).ok, false);
  assert.equal(D.lerImportacao(JSON.stringify({ versao: 99 }), PADRAO).ok, false);
});

test('limpar remove as alterações locais', () => {
  const s = storageFalso();
  D.salvar(s, conteudo());
  assert.equal(D.limpar(s), true);
  assert.equal(D.carregar(s, PADRAO).local, false);
});
