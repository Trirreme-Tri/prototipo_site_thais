"""Testes de ponta a ponta (spec 0001) com navegador real.

Uso: python3 tests/e2e.py
Sobe um servidor local na porta 8765, roda os critérios e salva screenshots em tests/screenshots/.
Sai com código 1 se algum critério falhar.
"""
import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "tests" / "screenshots"
PORTA = 8765
URL = f"http://localhost:{PORTA}"
TELAS = {"desktop": (1440, 900), "tablet": (834, 1112), "celular": (390, 844)}

resultados = []


def criterio(nome, ok, detalhe=""):
    resultados.append((nome, bool(ok), detalhe))
    print(("PASSOU " if ok else "FALHOU ") + nome + (f" — {detalhe}" if detalhe and not ok else ""))


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def servidor():
    manipulador = functools.partial(Silencioso, directory=str(RAIZ))
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("localhost", PORTA), manipulador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def abrir(navegador, tela, movimento="no-preference"):
    w, h = TELAS[tela]
    contexto = navegador.new_context(viewport={"width": w, "height": h}, reduced_motion=movimento)
    pagina = contexto.new_page()
    erros = []
    pagina.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
    pagina.on("pageerror", lambda e: erros.append(str(e)))
    return contexto, pagina, erros


def rolar_ate(pagina, seletor, fracao):
    """Rola até uma fração (0 a 1) do percurso de uma cena."""
    pagina.evaluate(
        """([sel, f]) => {
          const c = document.querySelector(sel);
          const topo = c.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: topo + (c.offsetHeight - innerHeight) * f, behavior: 'instant' });
        }""",
        [seletor, fracao],
    )
    pagina.wait_for_timeout(350)


def main():
    FOTOS.mkdir(parents=True, exist_ok=True)
    srv = servidor()
    with sync_playwright() as p:
        nav = p.chromium.launch()

        # Critérios 1, 2 e 16 + screenshots em 3 tamanhos.
        for tela in TELAS:
            ctx, pg, erros = abrir(nav, tela)
            pg.goto(URL + "/index.html")
            pg.wait_for_load_state("networkidle")
            altura = pg.evaluate("document.documentElement.scrollHeight")
            excesso = []
            for i, f in enumerate([0, 0.06, 0.12, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1]):
                pg.evaluate(f"window.scrollTo({{ top: {int(f * altura)}, behavior: 'instant' }})")
                pg.wait_for_timeout(450)
                largura = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
                if largura[0] > largura[1]:
                    excesso.append((f, largura))
                pg.screenshot(path=str(FOTOS / f"{tela}-{i:02d}.png"))
            criterio(f"1. sem erros no console ({tela})", not erros, "; ".join(erros[:3]))
            criterio(f"2. sem rolagem horizontal ({tela})", not excesso, str(excesso[:2]))
            # alt vazio só vale para imagem decorativa (dentro de aria-hidden ou marcada como decorativa).
            sem_alt = pg.evaluate("""Array.from(document.images).filter(i =>
              !i.hasAttribute('alt') ||
              (i.getAttribute('alt').trim() === '' && !i.closest('[aria-hidden="true"]') && !i.hasAttribute('data-decorativa') && !i.closest('dialog:not([open])'))
            ).map(i => i.className || i.src)""")
            criterio(f"16. toda imagem tem alt ({tela})", not sem_alt, str(sem_alt[:3]))
            ctx.close()

        # Critério 3: a camada colorida do hero começa oculta e termina visível.
        ctx, pg, _ = abrir(nav, "desktop")
        pg.goto(URL + "/index.html")
        pg.wait_for_load_state("networkidle")
        rolar_ate(pg, '[data-cena="hero"]', 0)
        inicio = float(pg.evaluate("getComputedStyle(document.querySelector('.cena-hero')).getPropertyValue('--pc')"))
        rolar_ate(pg, '[data-cena="hero"]', 1)
        fim = float(pg.evaluate("getComputedStyle(document.querySelector('.cena-hero')).getPropertyValue('--pc')"))
        criterio("3. hero: cor oculta no início e completa no fim", inicio == 0 and fim == 1, f"início={inicio} fim={fim}")

        # Processo: as 4 etapas aparecem em sequência.
        etapas = []
        for f in (0.05, 0.3, 0.55, 0.95):
            rolar_ate(pg, '[data-cena="processo"]', f)
            etapas.append(pg.get_attribute(".processo", "data-etapa"))
        criterio("processo: etapas 0→3 seguem o scroll", etapas == ["0", "1", "2", "3"], str(etapas))

        # Critério 6: filtros.
        pg.evaluate("document.querySelector('#obras').scrollIntoView()")
        pg.click(".filtro >> text=Terror")
        pg.wait_for_timeout(200)
        cats = pg.eval_on_selector_all(".obra-cartao__categoria", "els => els.map(e => e.textContent)")
        criterio("6. filtro Terror mostra só Terror", cats and all(c == "Terror" for c in cats), str(cats))
        pg.click(".filtro >> text=Todas")
        pg.wait_for_timeout(200)
        total = pg.eval_on_selector_all(".obra-cartao", "els => els.length")
        criterio("6. 'Todas' mostra todas as obras visíveis", total == 8, f"{total} obras")

        # Critério 7: visor abre com ficha e fecha com Esc.
        pg.locator(".obra-cartao button").first.click()
        pg.wait_for_timeout(300)
        aberto = pg.evaluate("document.querySelector('[data-visor]').open")
        alt_visor = pg.get_attribute("[data-visor-img]", "alt")
        titulo = pg.text_content("[data-visor-titulo]")
        tecnica = pg.text_content("[data-visor-tecnica]")
        categoria = pg.text_content("[data-visor-categoria]")
        cta = pg.text_content("[data-visor-cta]")
        pg.screenshot(path=str(FOTOS / "visor-desktop.png"))
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(200)
        fechado = not pg.evaluate("document.querySelector('[data-visor]').open")
        criterio("7. visor abre com título, técnica, categoria e botão; Esc fecha", aberto and titulo and tecnica and categoria and cta and alt_visor and fechado,
                 f"aberto={aberto} titulo={titulo!r} fechado={fechado}")
        ctx.close()

        # Critério 4: menos movimento.
        ctx, pg, erros = abrir(nav, "celular", movimento="reduce")
        pg.goto(URL + "/index.html")
        pg.wait_for_load_state("networkidle")
        fixas = pg.evaluate("Array.from(document.querySelectorAll('.palco')).filter(e => getComputedStyle(e).position === 'sticky').length")
        etapa = pg.get_attribute(".processo", "data-etapa")
        pc = pg.evaluate("getComputedStyle(document.querySelector('.cena-hero')).getPropertyValue('--pc').trim()")
        pg.screenshot(path=str(FOTOS / "menos-movimento-celular.png"), full_page=True)
        criterio("4. menos movimento: sem seções fixas e estado final", fixas == 0 and etapa == "3" and pc == "1",
                 f"fixas={fixas} etapa={etapa} pc={pc}")
        ctx.close()

        # Critérios 11, 12 e 14: painel → site no mesmo navegador.
        ctx, pg, erros = abrir(nav, "desktop")
        pg.goto(URL + "/painel.html")
        pg.wait_for_load_state("networkidle")
        pg.check('input[type=radio][value="aberta"]')
        pg.click("#aba-livros")
        pg.click("text=Adicionar livro")
        bloco = pg.locator('[data-painel="livros"] .bloco').last
        bloco.locator("input[type=text]").nth(0).fill("Dom Casmurro")
        bloco.locator("input[type=text]").nth(1).fill("Machado de Assis")
        bloco.locator("input[type=text]").nth(3).fill("35,00")
        pg.click("#aba-textos")
        pg.fill('input[type=tel]', "(69) 99999-0000")
        pg.click("[data-salvar]")
        estado = pg.text_content("[data-estado]")
        pg.screenshot(path=str(FOTOS / "painel-livros.png"), full_page=True)

        site = ctx.new_page()
        site.goto(URL + "/index.html")
        site.wait_for_load_state("networkidle")
        botao = site.text_content('[data-cta-encomenda="externo"]')
        livros = site.eval_on_selector_all(".livro", "els => els.map(e => e.innerText)")
        tem_livro = any("Dom Casmurro" in l and "R$ 35,00" in l for l in livros)
        selo = site.is_visible("[data-selo-local]")
        criterio("11. status 'aberta' no painel muda o botão do site", botao == "Encomende seu desenho", f"botão={botao!r} estado={estado!r}")
        criterio("12. livro novo com preço aparece no site", tem_livro, str(livros[-1:]))
        criterio("selo de alterações locais aparece", selo)
        contato = site.get_attribute("[data-contato]", "href") or ""
        interesse = site.get_attribute(".livro a.botao", "href") or ""
        criterio("9. com WhatsApp preenchido, contato e 'Tenho interesse' vão para wa.me",
                 contato.startswith("https://wa.me/5569999990000") and interesse.startswith("https://wa.me/5569999990000"),
                 f"contato={contato[:40]} interesse={interesse[:40]}")

        # Teclado na coleção fixa: focar um cartão do fim deixa o cartão visível.
        site.evaluate("document.querySelector('#obras').scrollIntoView({behavior: 'instant'})")
        site.locator(".obra-cartao button").nth(6).focus()
        site.wait_for_timeout(400)
        caixa = site.locator(".obra-cartao button").nth(6).bounding_box()
        janela = site.evaluate("document.querySelector('[data-colecao-janela]').scrollLeft")
        criterio("foco por teclado na coleção mostra o cartão", caixa and 0 <= caixa["x"] < 1440 - caixa["width"] / 2 and janela == 0,
                 f"x={caixa and caixa['x']} scrollLeft={janela}")

        pg.on("dialog", lambda d: d.accept())
        pg.click("#aba-arquivo")
        pg.click("[data-restaurar]")
        site.reload()
        site.wait_for_load_state("networkidle")
        botao2 = site.text_content('[data-cta-encomenda="externo"]')
        criterio("14. restaurar apaga as alterações locais", botao2 == "Consultar uma encomenda" and not site.is_visible("[data-selo-local]"), f"botão={botao2!r}")

        # Celular: painel utilizável.
        ctx.close()
        ctx, pg, erros = abrir(nav, "celular")
        pg.goto(URL + "/painel.html")
        pg.wait_for_load_state("networkidle")
        pg.screenshot(path=str(FOTOS / "painel-celular.png"), full_page=True)
        largura = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
        criterio("painel no celular sem rolagem horizontal e sem erros", largura[0] <= largura[1] and not erros, f"{largura} {erros[:2]}")
        ctx.close()
        nav.close()
    srv.shutdown()

    falhas = [r for r in resultados if not r[1]]
    print(f"\n{len(resultados) - len(falhas)}/{len(resultados)} critérios passaram. Screenshots em {FOTOS}")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
