/*
 * Painel da Thais: edita um rascunho do conteúdo e salva no navegador (ADR 0001).
 * Nada é enviado para servidor nenhum.
 */
(function () {
  'use strict';

  const D = window.TMDados;
  const PADRAO = window.TM_CONTEUDO_PADRAO;
  const LIMITE_APROX = 5 * 1024 * 1024; // a maioria dos navegadores dá ~5 MB por site

  let storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }

  let rascunho = D.carregar(storage, PADRAO).conteudo;
  let alterado = false;
  let proximoId = 0;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function el(tag, attrs, filhos) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'texto') n.textContent = v;
        else if (k === 'classe') n.className = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else if (k === 'valor') n.value = v;
        else if (k === 'marcado') n.checked = v;
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    (filhos || []).forEach((f) => f && n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f));
    return n;
  }

  function novoId(prefixo) {
    proximoId += 1;
    return prefixo + '-' + proximoId;
  }

  /* ---------- Estado de salvamento ---------- */

  const estado = $('[data-estado]');
  const espaco = $('[data-espaco]');
  const botaoSalvar = $('[data-salvar]');

  function mostrarEstado(texto, tipo) {
    estado.textContent = texto;
    estado.dataset.tipo = tipo || '';
  }

  function atualizarEspaco() {
    const usado = storage ? D.tamanhoSalvo(storage) : 0;
    const pct = Math.min(100, Math.round((usado / LIMITE_APROX) * 100));
    espaco.textContent = 'Espaço usado no navegador: ' + (usado / 1024 / 1024).toFixed(2) + ' MB (cerca de ' + pct + '% do limite)';
  }

  function marcarAlterado() {
    alterado = true;
    mostrarEstado('Alterações não salvas.', 'pendente');
  }

  window.addEventListener('beforeunload', (e) => {
    if (alterado) { e.preventDefault(); e.returnValue = ''; }
  });

  botaoSalvar.addEventListener('click', salvar);

  function salvar() {
    const antes = { livros: rascunho.livros.length, obras: rascunho.obras.length };
    const recusados = D.linksRecusados(rascunho);
    const normalizado = D.normalizar(rascunho, PADRAO);
    const r = D.salvar(storage, normalizado);
    if (!r.ok) {
      mostrarEstado(
        r.erro === 'cheio'
          ? 'Não foi possível salvar: o espaço do navegador acabou. Remova ou troque algumas imagens e tente de novo. O que já estava salvo continua lá.'
          : 'Não foi possível salvar: este navegador bloqueou o armazenamento (por exemplo, em janela anônima).',
        'erro'
      );
      return;
    }
    const ignorados = [];
    if (normalizado.livros.length < antes.livros) ignorados.push((antes.livros - normalizado.livros.length) + ' livro(s) sem título');
    if (normalizado.obras.length < antes.obras) ignorados.push((antes.obras - normalizado.obras.length) + ' obra(s) sem título ou imagem');
    if (recusados.length) ignorados.push('o que foi digitado em ' + recusados.join(', ') + ' (links precisam começar com https:// e o WhatsApp precisa ter DDD)');
    rascunho = normalizado;
    alterado = false;
    mostrarEstado(
      ignorados.length
        ? 'Salvo. Ficaram de fora: ' + ignorados.join(' e ') + '.'
        : 'Salvo neste navegador. Abra o site para conferir.',
      ignorados.length ? 'pendente' : 'ok'
    );
    atualizarEspaco();
    renderizarTudo();
  }

  /* ---------- Campos reutilizáveis ---------- */

  function campoTexto(rotulo, valor, aoMudar, opcoes) {
    const o = opcoes || {};
    const id = novoId('c');
    const input = el(o.multilinha ? 'textarea' : 'input', {
      id,
      type: o.multilinha ? null : (o.tipo || 'text'),
      valor: valor === null || valor === undefined ? '' : String(valor),
      placeholder: o.placeholder || null,
      inputmode: o.inputmode || null,
      autocomplete: 'off',
      'aria-describedby': o.ajuda ? id + '-ajuda' : null,
      oninput: (e) => { aoMudar(e.target.value); marcarAlterado(); }
    });
    return el('div', { classe: 'campo' + (o.largo ? ' campo--largo' : '') }, [
      el('label', { for: id, texto: rotulo }),
      input,
      o.ajuda ? el('p', { classe: 'ajuda', id: id + '-ajuda', texto: o.ajuda }) : null
    ]);
  }

  function campoSelecao(rotulo, valor, opcoes, aoMudar) {
    const id = novoId('s');
    const select = el('select', { id, onchange: (e) => { aoMudar(e.target.value); marcarAlterado(); } },
      opcoes.map(([v, t]) => el('option', { value: v, texto: t, selected: v === valor ? true : null })));
    return el('div', { classe: 'campo' }, [el('label', { for: id, texto: rotulo }), select]);
  }

  function campoMarcar(rotulo, marcado, aoMudar, ajuda) {
    const id = novoId('m');
    return el('div', { classe: 'campo campo--largo' }, [
      el('label', { classe: 'marcar', for: id }, [
        el('input', { type: 'checkbox', id, marcado, onchange: (e) => { aoMudar(e.target.checked); marcarAlterado(); } }),
        el('span', null, [rotulo, ajuda ? el('span', { classe: 'ajuda', texto: ' ' + ajuda }) : null])
      ])
    ]);
  }

  // Lê a imagem escolhida e reduz o tamanho para caber no navegador.
  function lerImagem(arquivo, ladoMaximo, qualidade) {
    return new Promise((resolve, reject) => {
      if (!arquivo || !/^image\/(png|jpeg|webp)$/.test(arquivo.type)) {
        reject(new Error('Escolha uma imagem JPG, PNG ou WebP.'));
        return;
      }
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
        img.onload = () => {
          const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', qualidade));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function campoImagem(rotulo, src, classeMini, ladoMaximo, aoMudar) {
    const id = novoId('i');
    const mini = el('img', { classe: 'miniatura ' + (classeMini || ''), alt: '', src: src || null });
    const ajuda = el('p', { classe: 'ajuda', texto: 'JPG, PNG ou WebP. A imagem é reduzida para caber no navegador.' });
    const input = el('input', {
      type: 'file',
      id,
      accept: 'image/jpeg,image/png,image/webp',
      classe: 'arquivo-input',
      onchange: async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;
        try {
          const dados = await lerImagem(arquivo, ladoMaximo, 0.82);
          mini.src = dados;
          aoMudar(dados);
          marcarAlterado();
          ajuda.textContent = 'Imagem pronta. Clique em "Salvar alterações".';
        } catch (erro) {
          ajuda.textContent = erro.message;
        }
      }
    });
    return el('div', { classe: 'campos campos--imagem campo--largo' }, [
      mini,
      el('div', { classe: 'campo' }, [el('label', { for: id, texto: rotulo }), input, ajuda])
    ]);
  }

  /* ---------- Aba: Encomendas ---------- */

  function renderEncomendas(p) {
    const descricoes = {
      aberta: ['Abertas', 'O botão principal vira "Encomende seu desenho" e leva ao seu contato.'],
      consulta: ['Sob consulta', 'O botão vira "Consultar uma encomenda", com o texto de condições abaixo.'],
      fechada: ['Fechadas', 'O botão vira "Seguir no Instagram" e o site avisa que estão fechadas.']
    };
    const nome = novoId('status');
    const grupo = el('fieldset', { classe: 'opcoes-status' }, [el('legend', { classe: 'bloco__titulo', texto: 'Status das encomendas' })]);
    D.STATUS_ENCOMENDA.forEach((s) => {
      grupo.appendChild(el('label', { classe: 'opcao-status' }, [
        el('input', {
          type: 'radio',
          name: nome,
          value: s,
          marcado: rascunho.encomendas.status === s,
          onchange: () => { rascunho.encomendas.status = s; marcarAlterado(); }
        }),
        el('div', null, [el('strong', { texto: descricoes[s][0] }), el('span', { texto: descricoes[s][1] })])
      ]));
    });
    p.append(
      el('h2', { texto: 'Encomendas' }),
      el('p', { classe: 'intro', texto: 'Escolha se as encomendas estão abertas, sob consulta ou fechadas. O site muda o botão e o aviso sozinho.' }),
      el('div', { classe: 'bloco' }, [grupo]),
      el('div', { classe: 'bloco' }, [
        el('div', { classe: 'campos' }, [
          campoTexto('Condições', rascunho.encomendas.condicoes, (v) => { rascunho.encomendas.condicoes = v; }, {
            multilinha: true, largo: true, ajuda: 'Aparece quando as encomendas estão sob consulta. Ex.: regiões atendidas.'
          }),
          campoTexto('Como funciona (um passo por linha)', rascunho.encomendas.comoFunciona.join('\n'), (v) => {
            rascunho.encomendas.comoFunciona = v.split('\n');
          }, { multilinha: true, largo: true, ajuda: 'Até 6 passos. Não coloque preços aqui se ainda não quiser divulgar.' }),
          campoMarcar('Marcar os passos como provisórios', rascunho.encomendas.passosProvisorios, (v) => { rascunho.encomendas.passosProvisorios = v; },
            'Mostra um aviso no site enquanto o texto não estiver final.')
        ])
      ])
    );
  }

  /* ---------- Aba: Livros ---------- */

  function renderLivros(p) {
    p.append(
      el('h2', { texto: 'Livros' }),
      el('p', { classe: 'intro', texto: 'Os livros usados que aparecem na estante do site. Sem preço, o site mostra "Preço sob consulta".' })
    );
    rascunho.livros.forEach((livro, i) => {
      const statusOpcoes = D.STATUS_LIVRO.map((s) => [s, D.ROTULO_STATUS_LIVRO[s]]);
      p.appendChild(el('div', { classe: 'bloco' }, [
        el('div', { classe: 'bloco__topo' }, [
          el('h3', { classe: 'bloco__titulo', texto: livro.titulo || 'Livro sem título' }),
          livro.marcador ? el('span', { classe: 'selo selo--marcador', texto: 'Exemplo' }) : null
        ]),
        el('div', { classe: 'campos' }, [
          campoTexto('Título', livro.titulo, (v) => { livro.titulo = v; }),
          campoTexto('Autor', livro.autor, (v) => { livro.autor = v; }),
          campoTexto('Estado de conservação', livro.estado, (v) => { livro.estado = v; }, { placeholder: 'Ex.: ótimo estado, sem marcas' }),
          campoTexto('Preço (R$)', livro.preco === null ? '' : String(livro.preco).replace('.', ','), (v) => { livro.preco = v; }, {
            inputmode: 'decimal', placeholder: 'Ex.: 35,00', ajuda: 'Deixe vazio para "Preço sob consulta".'
          }),
          campoSelecao('Situação', livro.status, statusOpcoes, (v) => { livro.status = v; }),
          campoImagem('Foto da capa', livro.capa, 'miniatura--livro', 600, (v) => { livro.capa = v; livro.marcador = false; }),
          el('div', { classe: 'acoes campo--largo' }, [
            el('button', {
              type: 'button',
              classe: 'botao botao--perigo botao--pequeno',
              texto: 'Remover livro',
              onclick: () => { rascunho.livros.splice(i, 1); marcarAlterado(); renderizarAba('livros'); }
            })
          ])
        ])
      ]));
    });
    p.appendChild(el('button', {
      type: 'button',
      classe: 'botao botao--escuro',
      texto: 'Adicionar livro',
      onclick: () => {
        rascunho.livros.push({ id: 'livro-' + Date.now(), titulo: '', autor: '', estado: '', preco: null, status: 'disponivel', capa: '', marcador: false });
        marcarAlterado();
        renderizarAba('livros');
        const ultimo = $$('[data-painel="livros"] .bloco').pop();
        if (ultimo) $('input[type="text"]', ultimo).focus();
      }
    }));
  }

  /* ---------- Aba: Obras ---------- */

  function renderObras(p) {
    p.append(
      el('h2', { texto: 'Obras' }),
      el('p', { classe: 'intro', texto: 'Só aparecem no site as obras marcadas como suas ("Confirmo que esta obra é minha"). Os exemplos com o selo "Marcador" serão trocados pelos seus scans.' })
    );
    const categorias = rascunho.categorias.map((c) => [c, c]);
    rascunho.obras.forEach((obra, i) => {
      p.appendChild(el('div', { classe: 'bloco' }, [
        el('div', { classe: 'bloco__topo' }, [
          el('h3', { classe: 'bloco__titulo', texto: obra.titulo || 'Obra sem título' }),
          obra.marcador ? el('span', { classe: 'selo selo--marcador', texto: 'Marcador' }) : null
        ]),
        el('div', { classe: 'campos' }, [
          campoTexto('Título', obra.titulo, (v) => { obra.titulo = v; }),
          campoSelecao('Categoria', obra.categoria, categorias, (v) => { obra.categoria = v; }),
          campoTexto('Técnica', obra.tecnica, (v) => { obra.tecnica = v; }, { placeholder: 'Ex.: lápis de cor sobre papel' }),
          campoTexto('Ano', obra.ano, (v) => { obra.ano = v; }, { inputmode: 'numeric' }),
          campoTexto('Descrição da imagem (para leitores de tela)', obra.alt, (v) => { obra.alt = v; }, {
            largo: true, ajuda: 'Descreva o que aparece na obra em uma frase.'
          }),
          campoImagem('Imagem da obra', obra.imagem, '', 1400, (v) => {
            // Trocar a imagem de um marcador também descarta o esboço de exemplo.
            if (obra.marcador && /^assets\/img\/obras\//.test(obra.esboco)) obra.esboco = '';
            obra.imagem = v;
            obra.marcador = false;
          }),
          campoImagem('Esboço da mesma obra (opcional)', obra.esboco, '', 1400, (v) => { obra.esboco = v; }),
          campoMarcar('Confirmo que esta obra é minha', obra.autoriaConfirmada, (v) => { obra.autoriaConfirmada = v; },
            'Obras de outros artistas e reposts não devem entrar.'),
          campoMarcar('Usar na abertura do site (precisa ter esboço)', obra.destaque, (v) => {
            rascunho.obras.forEach((o) => { o.destaque = false; });
            obra.destaque = v;
            renderizarAba('obras');
          }),
          el('div', { classe: 'acoes campo--largo' }, [
            el('button', {
              type: 'button',
              classe: 'botao botao--perigo botao--pequeno',
              texto: 'Remover obra',
              onclick: () => { rascunho.obras.splice(i, 1); marcarAlterado(); renderizarAba('obras'); }
            })
          ])
        ])
      ]));
    });
    p.appendChild(el('p', { classe: 'intro', texto: 'Para adicionar uma obra nova, escolha a imagem abaixo. Ela entra no fim da lista.' }));
    p.appendChild(campoImagem('Nova obra', '', '', 1400, (v) => {
      rascunho.obras.push({
        id: 'obra-' + Date.now(), titulo: 'Nova obra', categoria: rascunho.categorias[0], tecnica: '', ano: '',
        imagem: v, esboco: '', alt: '', autoriaConfirmada: false, marcador: false, destaque: false,
        paleta: { fundo: '#17141c', destaque: '#c9c2d4' }
      });
      renderizarAba('obras');
    }));
  }

  /* ---------- Aba: Contatos e textos ---------- */

  function renderTextos(p) {
    p.append(
      el('h2', { texto: 'Contatos e textos' }),
      el('p', { classe: 'intro', texto: 'Sem WhatsApp preenchido, os botões de contato levam ao seu Instagram.' }),
      el('div', { classe: 'bloco' }, [
        el('h3', { classe: 'bloco__titulo', texto: 'Contato' }),
        el('div', { classe: 'campos' }, [
          campoTexto('WhatsApp', rascunho.contato.whatsapp, (v) => { rascunho.contato.whatsapp = v; }, {
            tipo: 'tel', inputmode: 'tel', placeholder: '(69) 99999-0000', ajuda: 'Com DDD. Só aparece no site como botão, não como número escrito.'
          }),
          campoTexto('Instagram (link)', rascunho.perfil.instagram, (v) => { rascunho.perfil.instagram = v; }, { tipo: 'url' }),
          campoTexto('Mensagem que já vem escrita no WhatsApp', rascunho.contato.mensagemPadrao, (v) => { rascunho.contato.mensagemPadrao = v; }, { largo: true })
        ])
      ]),
      el('div', { classe: 'bloco' }, [
        el('h3', { classe: 'bloco__titulo', texto: 'Sobre você' }),
        el('div', { classe: 'campos' }, [
          campoTexto('Frase curta da abertura', rascunho.perfil.bioCurta, (v) => { rascunho.perfil.bioCurta = v; }, { largo: true }),
          campoTexto('Texto "A artista"', rascunho.perfil.sobre, (v) => { rascunho.perfil.sobre = v; }, { multilinha: true, largo: true }),
          campoMarcar('Marcar o texto como provisório', rascunho.perfil.sobreProvisorio, (v) => { rascunho.perfil.sobreProvisorio = v; })
        ])
      ]),
      el('div', { classe: 'bloco' }, [
        el('h3', { classe: 'bloco__titulo', texto: 'Vanguard Nexus' }),
        el('div', { classe: 'campos' }, [
          campoTexto('Descrição', rascunho.comunidade.descricao, (v) => { rascunho.comunidade.descricao = v; }, { largo: true }),
          campoTexto('Link do grupo do WhatsApp', rascunho.comunidade.grupo, (v) => { rascunho.comunidade.grupo = v; }, { tipo: 'url' }),
          campoTexto('Instagram da comunidade', rascunho.comunidade.instagram, (v) => { rascunho.comunidade.instagram = v; }, { tipo: 'url' })
        ])
      ])
    );
  }

  /* ---------- Aba: Arquivo ---------- */

  function baixar(nome, texto) {
    const blob = new Blob([texto], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderArquivo(p) {
    const avisoImportar = el('p', { classe: 'ajuda', role: 'status' });
    const idImportar = novoId('imp');
    p.append(
      el('h2', { texto: 'Arquivo' }),
      el('p', { classe: 'intro', texto: 'Use estas opções para levar suas alterações para o site publicado ou para outro computador.' }),
      el('div', { classe: 'bloco' }, [
        el('h3', { classe: 'bloco__titulo', texto: 'Exportar' }),
        el('p', { classe: 'intro', texto: 'Baixa um arquivo com tudo o que está no painel. Envie para a TRIRREME publicar no site.' }),
        el('button', {
          type: 'button',
          classe: 'botao botao--escuro',
          texto: 'Exportar arquivo',
          'data-exportar': true,
          onclick: () => baixar('conteudo-padrao.js', D.serializarParaPublicacao(D.normalizar(rascunho, PADRAO)))
        })
      ]),
      el('div', { classe: 'bloco' }, [
        el('h3', { classe: 'bloco__titulo', texto: 'Importar' }),
        el('div', { classe: 'campo' }, [
          el('label', { for: idImportar, texto: 'Arquivo exportado pelo painel' }),
          el('input', {
            type: 'file',
            id: idImportar,
            accept: '.js,.json,text/javascript,application/json',
            classe: 'arquivo-input',
            'data-importar': true,
            onchange: (e) => {
              const arquivo = e.target.files[0];
              if (!arquivo) return;
              arquivo.text().then((texto) => {
                const r = D.lerImportacao(texto, PADRAO);
                if (!r.ok) { avisoImportar.textContent = r.erro; return; }
                rascunho = r.conteudo;
                ['encomendas', 'livros', 'obras', 'textos'].forEach(renderizarAba);
                marcarAlterado();
                avisoImportar.textContent = 'Arquivo carregado. Confira as abas e clique em "Salvar alterações".';
              });
            }
          }),
          avisoImportar
        ])
      ]),
      el('div', { classe: 'bloco' }, [
        el('h3', { classe: 'bloco__titulo', texto: 'Restaurar conteúdo publicado' }),
        el('p', { classe: 'intro', texto: 'Apaga as alterações salvas neste navegador e volta ao que está publicado no site.' }),
        el('button', {
          type: 'button',
          classe: 'botao botao--perigo',
          texto: 'Restaurar conteúdo publicado',
          'data-restaurar': true,
          onclick: () => {
            if (!window.confirm('Apagar as alterações salvas neste navegador? Isso não pode ser desfeito.')) return;
            D.limpar(storage);
            rascunho = D.carregar(storage, PADRAO).conteudo;
            alterado = false;
            renderizarTudo();
            mostrarEstado('Alterações apagadas. O painel mostra o conteúdo publicado.', 'ok');
            atualizarEspaco();
          }
        })
      ])
    );
  }

  /* ---------- Abas ---------- */

  const renderizadores = { encomendas: renderEncomendas, livros: renderLivros, obras: renderObras, textos: renderTextos, arquivo: renderArquivo };
  const abas = $$('[data-abas] [role="tab"]');

  function renderizarAba(nome) {
    const p = $('[data-painel="' + nome + '"]');
    p.replaceChildren();
    renderizadores[nome](p);
  }
  function renderizarTudo() { Object.keys(renderizadores).forEach(renderizarAba); }

  function ativarAba(aba) {
    abas.forEach((a) => {
      const ativa = a === aba;
      a.setAttribute('aria-selected', String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      $('#' + a.getAttribute('aria-controls')).hidden = !ativa;
    });
  }
  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => ativarAba(aba));
    aba.addEventListener('keydown', (e) => {
      let proxima = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') proxima = abas[(i + 1) % abas.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') proxima = abas[(i - 1 + abas.length) % abas.length];
      if (e.key === 'Home') proxima = abas[0];
      if (e.key === 'End') proxima = abas[abas.length - 1];
      if (!proxima) return;
      e.preventDefault();
      ativarAba(proxima);
      proxima.focus();
    });
  });

  if (!storage) mostrarEstado('Este navegador bloqueou o armazenamento. O painel não conseguirá salvar.', 'erro');
  renderizarTudo();
  atualizarEspaco();
})();
