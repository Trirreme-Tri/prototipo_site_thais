"""Gera os marcadores visuais do protótipo (obras, livros, textura e vídeo de exemplo).

Nada aqui imita o trabalho da Thais: são composições abstratas, com o aviso
"substituir" escrito na própria imagem. Determinístico (semente fixa).

Uso: python3 tools/gerar_assets.py
Requer: Pillow e ffmpeg (com libx264).
"""
import json
import math
import random
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
OBRAS = RAIZ / "assets" / "img" / "obras"
LIVROS = RAIZ / "assets" / "img" / "livros"
IMG = RAIZ / "assets" / "img"
VIDEO = RAIZ / "assets" / "video"

W, H = 800, 1000
PAPEL = "#ebe8e3"
GRAFITE = "#3d3a42"


def ler_conteudo():
    texto = (RAIZ / "assets" / "js" / "conteudo-padrao.js").read_text(encoding="utf-8")
    corpo = texto.split("window.TM_CONTEUDO_PADRAO = ", 1)[1]
    corpo = corpo[: corpo.rindex("};") + 1]
    return json.loads(corpo)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def girar_matiz(hex_cor, graus):
    import colorsys

    r, g, b = (c / 255 for c in hex_rgb(hex_cor))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb((hh + graus / 360) % 1, ll, ss)
    return "#%02x%02x%02x" % (int(r * 255), int(g * 255), int(b * 255))


def composicao(semente):
    """Formas da composição: as mesmas posições servem ao esboço e à versão em cor."""
    rnd = random.Random(semente)
    formas = []
    # Uma forma principal (o "rosto" da composição, abstrato) e satélites.
    formas.append((W * 0.5 + rnd.uniform(-40, 40), H * 0.44, rnd.uniform(210, 250), rnd.uniform(270, 310), rnd.uniform(-12, 12)))
    for _ in range(4):
        formas.append((rnd.uniform(140, 660), rnd.uniform(160, 860), rnd.uniform(70, 170), rnd.uniform(60, 160), rnd.uniform(-40, 40)))
    return formas


def rotulo_svg(linha1, linha2, cor_texto, cor_fundo):
    return f"""
  <g font-family="Georgia, 'Times New Roman', serif">
    <rect x="48" y="{H - 132}" width="{W - 96}" height="84" rx="2" fill="{cor_fundo}" fill-opacity="0.72"/>
    <text x="72" y="{H - 92}" font-size="26" fill="{cor_texto}">{linha1}</text>
    <text x="72" y="{H - 62}" font-size="18" fill="{cor_texto}" fill-opacity="0.75">{linha2}</text>
  </g>"""


def svg_obra_cor(numero, paleta, semente):
    rnd = random.Random(semente + 7)
    fundo, destaque = paleta["fundo"], paleta["destaque"]
    vizinha = girar_matiz(destaque, 48)
    oposta = girar_matiz(destaque, 175)
    formas = composicao(semente)
    defs, corpo = [], []
    for i, (cx, cy, rx, ry, ang) in enumerate(formas):
        c = [destaque, vizinha, oposta, destaque, vizinha][i % 5]
        defs.append(
            f'<radialGradient id="g{i}" cx="50%" cy="45%" r="60%">'
            f'<stop offset="0" stop-color="{c}" stop-opacity="{0.95 if i == 0 else 0.8}"/>'
            f'<stop offset="0.55" stop-color="{c}" stop-opacity="0.35"/>'
            f'<stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>'
        )
        corpo.append(
            f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx * 1.25:.0f}" ry="{ry * 1.25:.0f}" '
            f'transform="rotate({ang:.0f} {cx:.0f} {cy:.0f})" fill="url(#g{i})"/>'
        )
    # Brilho "cósmico": pontos de luz sobre a forma principal.
    cx, cy, rx, ry, _ = formas[0]
    pontos = []
    for _ in range(260):
        a = rnd.uniform(0, math.tau)
        d = rnd.random() ** 0.6
        x = cx + math.cos(a) * rx * d
        y = cy + math.sin(a) * ry * d
        r = rnd.choice([0.6, 0.8, 1.1, 1.6, 2.4])
        op = rnd.uniform(0.25, 0.95)
        pontos.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#fff" fill-opacity="{op:.2f}"/>')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Espaço para a obra {numero:02d}">
  <defs>
    {''.join(defs)}
    <filter id="grao"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="{semente}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/></filter>
  </defs>
  <rect width="{W}" height="{H}" fill="{fundo}"/>
  {''.join(corpo)}
  <g>{''.join(pontos)}</g>
  <rect width="{W}" height="{H}" filter="url(#grao)"/>
  {rotulo_svg(f"Espaço para a obra {numero:02d}", "Substituir pelo scan em alta resolução", "#f4f2ee", "#0d0c10")}
</svg>
"""


def tracos_elipse(cx, cy, rx, ry, ang, rnd, passadas=3):
    """Contornos tremidos, como um esboço a grafite."""
    caminhos = []
    for p in range(passadas):
        pts = []
        inicio = rnd.uniform(0, math.tau)
        volta = rnd.uniform(0.85, 1.08)
        for k in range(64):
            t = inicio + volta * math.tau * k / 63
            jitter = 1 + rnd.uniform(-0.025, 0.025)
            x0 = math.cos(t) * rx * jitter
            y0 = math.sin(t) * ry * jitter
            a = math.radians(ang)
            x = cx + x0 * math.cos(a) - y0 * math.sin(a)
            y = cy + x0 * math.sin(a) + y0 * math.cos(a)
            pts.append(f"{x:.1f},{y:.1f}")
        largura = rnd.uniform(0.8, 1.8)
        op = rnd.uniform(0.45, 0.85) if p == 0 else rnd.uniform(0.2, 0.45)
        caminhos.append(
            f'<polyline points="{" ".join(pts)}" fill="none" stroke="{GRAFITE}" '
            f'stroke-width="{largura:.2f}" stroke-opacity="{op:.2f}" stroke-linecap="round"/>'
        )
    return caminhos


def svg_obra_esboco(numero, semente, rotulo=True):
    rnd = random.Random(semente + 11)
    formas = composicao(semente)
    traços, clips, hachuras = [], [], []
    for i, (cx, cy, rx, ry, ang) in enumerate(formas):
        traços += tracos_elipse(cx, cy, rx, ry, ang, rnd, 3 if i == 0 else 2)
        clips.append(
            f'<clipPath id="c{i}"><ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" '
            f'transform="rotate({ang:.0f} {cx:.0f} {cy:.0f})"/></clipPath>'
        )
        linhas = []
        passo = rnd.choice([9, 11, 13])
        inclinacao = rnd.uniform(0.5, 1.2)
        for k in range(-60, 60):
            x = cx + k * passo
            linhas.append(
                f'<line x1="{x - 300:.0f}" y1="{cy + 300 * inclinacao:.0f}" x2="{x + 300:.0f}" y2="{cy - 300 * inclinacao:.0f}"/>'
            )
        hachuras.append(
            f'<g clip-path="url(#c{i})" stroke="{GRAFITE}" stroke-width="0.7" stroke-opacity="{0.22 if i else 0.3}">{"".join(linhas)}</g>'
        )
    texto = rotulo_svg(f"Esboço da obra {numero:02d}", "Substituir pelo esboço real", "#26232b", "#f7f5f1") if rotulo else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Espaço para o esboço da obra {numero:02d}">
  <defs>
    {''.join(clips)}
    <filter id="papel"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="{semente}"/><feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.19  0 0 0 0 0.22  0 0 0 0.12 0"/></filter>
  </defs>
  <rect width="{W}" height="{H}" fill="{PAPEL}"/>
  <rect width="{W}" height="{H}" filter="url(#papel)"/>
  {''.join(hachuras)}
  {''.join(traços)}
  {texto}
</svg>
"""


def svg_livro(numero, cor):
    escura = girar_matiz(cor, 0)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600" role="img" aria-label="Capa do livro de exemplo {numero}">
  <defs>
    <filter id="grao"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="{numero}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0"/></filter>
    <linearGradient id="lombada" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.08" stop-color="#000" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="400" height="600" fill="{escura}"/>
  <rect width="400" height="600" fill="url(#lombada)"/>
  <rect width="400" height="600" filter="url(#grao)"/>
  <rect x="40" y="48" width="320" height="504" fill="none" stroke="#f4f1ea" stroke-opacity="0.55"/>
  <g font-family="Georgia, 'Times New Roman', serif" fill="#f4f1ea" text-anchor="middle">
    <text x="200" y="250" font-size="34">Livro de</text>
    <text x="200" y="292" font-size="34">exemplo {numero}</text>
    <text x="200" y="470" font-size="18" fill-opacity="0.75">Capa a substituir</text>
  </g>
</svg>
"""


def textura_grao():
    rnd = random.Random(42)
    tam = 256
    img = Image.new("L", (tam, tam))
    img.putdata([int(rnd.gauss(128, 40)) for _ in range(tam * tam)])
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    rgba = Image.new("RGBA", (tam, tam), (255, 255, 255, 0))
    rgba.putalpha(img.point(lambda v: max(0, min(255, (v - 100) * 2)) // 6))
    rgba.save(IMG / "grao.png", optimize=True)


def video_exemplo(semente):
    """Timelapse falso e assumido: o esboço é traçado e a cor entra por camadas."""
    largura, altura, fps, segundos = 540, 676, 24, 6
    quadros = fps * segundos
    escala = largura / W
    rnd = random.Random(semente)
    formas = composicao(semente)
    cor = Image.open(tempfile_png_da_obra(1)).convert("RGB").resize((largura, altura))
    papel = Image.new("RGB", (largura, altura), PAPEL)
    fonte = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    tmp = Path(tempfile.mkdtemp())
    # Pré-calcula os traços.
    tracos = []
    for i, (cx, cy, rx, ry, ang) in enumerate(formas):
        for p in range(2):
            pts = []
            ini = rnd.uniform(0, math.tau)
            for k in range(80):
                t = ini + math.tau * k / 79
                j = 1 + rnd.uniform(-0.02, 0.02)
                x0, y0 = math.cos(t) * rx * j, math.sin(t) * ry * j
                a = math.radians(ang)
                pts.append(((cx + x0 * math.cos(a) - y0 * math.sin(a)) * escala, (cy + x0 * math.sin(a) + y0 * math.cos(a)) * escala))
            tracos.append(pts)
    for q in range(quadros):
        t = q / (quadros - 1)
        quadro = papel.copy()
        d = ImageDraw.Draw(quadro)
        fase_traco = min(1, t / 0.4)
        total = len(tracos)
        for idx, pts in enumerate(tracos):
            prog = max(0, min(1, fase_traco * total - idx))
            if prog <= 0:
                continue
            n = max(2, int(len(pts) * prog))
            d.line(pts[:n], fill=hex_rgb(GRAFITE), width=2 if idx % 2 == 0 else 1)
        fase_cor = max(0, min(1, (t - 0.38) / 0.5))
        if fase_cor > 0:
            mascara = Image.new("L", (largura, altura), 0)
            md = ImageDraw.Draw(mascara)
            limite = altura * (1 - fase_cor * 1.15)
            md.rectangle([0, limite, largura, altura], fill=255)
            mascara = mascara.filter(ImageFilter.GaussianBlur(28))
            quadro = Image.composite(cor, quadro, mascara)
            d = ImageDraw.Draw(quadro)
        d.rectangle([0, altura - 44, largura, altura], fill=(13, 12, 16))
        d.text((16, altura - 32), "Vídeo de exemplo. Substituir pelo timelapse da Thais.", font=fonte, fill=(244, 242, 238))
        quadro.save(tmp / f"q{q:04d}.png")
    VIDEO.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(tmp / "q%04d.png"),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow", "-movflags", "+faststart",
         "-an", str(VIDEO / "processo-exemplo.mp4")],
        check=True,
    )
    Image.open(tmp / f"q{quadros - 1:04d}.png").convert("RGB").save(VIDEO / "processo-exemplo.jpg", quality=78)
    shutil.rmtree(tmp)


def tempfile_png_da_obra(numero):
    """Rasteriza a obra em cor (sem o rótulo) para usar no vídeo, via o Chromium do Playwright."""
    svg = (OBRAS / f"obra-{numero:02d}.svg").read_text(encoding="utf-8")
    svg = re.sub(r"\n  <g font-family=.*?</g>", "", svg, flags=re.S)
    destino = Path(tempfile.mkdtemp()) / "obra.png"
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        nav = p.chromium.launch()
        pagina = nav.new_page(viewport={"width": W, "height": H})
        pagina.set_content(f"<body style='margin:0'>{svg}</body>")
        pagina.screenshot(path=str(destino))
        nav.close()
    return destino


def main():
    conteudo = ler_conteudo()
    OBRAS.mkdir(parents=True, exist_ok=True)
    LIVROS.mkdir(parents=True, exist_ok=True)
    for i, obra in enumerate(conteudo["obras"], start=1):
        semente = 100 + i
        if obra["categoria"] == "Esboços":
            svg = svg_obra_esboco(i, semente)
        else:
            svg = svg_obra_cor(i, obra["paleta"], semente)
        (OBRAS / f"obra-{i:02d}.svg").write_text(svg, encoding="utf-8")
        if obra.get("esboco"):
            (OBRAS / f"obra-{i:02d}-esboco.svg").write_text(svg_obra_esboco(i, semente), encoding="utf-8")
    cores = ["#5b2333", "#24405a", "#3c4a2c", "#4a3a5e"]
    for i, c in enumerate(cores, start=1):
        (LIVROS / f"livro-{i:02d}.svg").write_text(svg_livro(i, c), encoding="utf-8")
    textura_grao()
    video_exemplo(101)
    print("Marcadores, textura e vídeo de exemplo gerados.")


if __name__ == "__main__":
    main()
