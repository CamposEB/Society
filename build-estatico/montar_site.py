#!/usr/bin/env python3
"""montar_site.py — monta a versão estática (GitHub Pages) do site antigo.

Uso, na raiz do repositório:
    python build-estatico/montar_site.py
Lê  : site-antigo/   (o antigo static/)
Gera: docs/          (Settings > Pages > Deploy from a branch > main > /docs)

Não altera nada em site-antigo/. Pode rodar de novo sempre que quiser.
"""
import argparse
import re
import shutil
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent

# Páginas já montadas (o shell.js usa isto para navegar). Novas etapas entram aqui.
PAGES = {"home": "index.html", "heroes": "herois.html", "hero": "heroi.html"}

# CSS do site antigo que não faz sentido sem servidor
CSS_FORA = {
    "login.css", "admin-v2.css", "moderation.css", "lfg.css", "profile.css",
    "profile-lite.css", "tournaments.css", "lobby.css", "quiz.css",
    "command-palette.css", "sidebar-hover.css",
}

# Imagem do CDN: o proxy /api/img vira um caminho local (img/cdn/<host>/<caminho>)
IMG_LOCAL = ("return 'img/cdn/' + new URL(f).hostname + "
             "decodeURIComponent(new URL(f).pathname);")
PROXY = "return '/api/img?url=' + encodeURIComponent(f);"
RAIZ_STATIC = ("if (f.charAt(0) === '/') return f;",
               "if (f.charAt(0) === '/') return f.replace(/^\\/static\\//, '');")

PATCHES = {
    "hero-official.js": [
        ("var BASE = '/static/data/official/';", "var BASE = 'data/official/';"),
        (PROXY, IMG_LOCAL),
        RAIZ_STATIC,
        ("if (src) i.src = cdnUrl(src);",
         r"""if (src) { i.src = cdnUrl(src); i.onerror = function () { i.onerror = null; if (/^https?:\/\//i.test(String(src))) i.src = String(src); }; }"""),
    ],
    "hero-catalog.js": [
        ("'/static/data/official/index.json',", "'data/official/index.json',"),
        ("'/static/img/icons/herois/'", "'img/icons/herois/'"),
        (PROXY, IMG_LOCAL),
        RAIZ_STATIC,
    ],
    "heroes-catalog.js": [
        ("'/static/data/official/index.json'", "'data/official/index.json'"),
        ("a.href = '#/heroi/' + h.slug;", "a.href = 'heroi.html#' + h.slug;"),
        ("img.src = imgUrl(h.wallpaper || h.head || h.square);",
         r"""var orig = h.wallpaper || h.head || h.square; img.src = imgUrl(orig); img.onerror = function () { img.onerror = null; if (/^https?:\/\//i.test(String(orig || ''))) img.src = orig; };"""),
    ],
}

TOPBAR = """<header id="topbar" class="tb">
  <button id="topbarBrand" type="button" data-shortcut="home" aria-label="Society MLBB, início">
    <span class="logo"><img src="img/logo.png" alt=""></span>
    <span class="tb-wordmark" aria-hidden="true">Society <b>MLBB</b></span>
  </button>
  <nav id="topbarNav" class="tb-nav" aria-label="Seções do site">
    <button type="button" class="tb-link" data-shortcut="home">Início</button>
    <button type="button" class="tb-link" data-shortcut="heroes">Heróis</button>
    <button type="button" class="tb-link" data-shortcut="meta">Meta</button>
    <button type="button" class="tb-link" data-shortcut="builds">Builds</button>
    <button type="button" class="tb-link" data-shortcut="guide">Guia</button>
    <button type="button" class="tb-link" data-shortcut="winrate">Win rate</button>
  </nav>
  <a id="topbarDiscord" class="tb-icon-link" href="https://discord.gg/pXdxDDJWdk" target="_blank" rel="noopener noreferrer" aria-label="Entrar no Discord da comunidade">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M6 6.2C7.6 5.2 9.2 4.7 10.3 4.6l.4.9a11 11 0 0 1 2.6 0l.4-.9c1.1.1 2.7.6 4.3 1.6 1.7 2.4 2.5 5.1 2.2 8.3-1.2.9-2.5 1.5-3.8 1.9l-.9-1.5c.5-.2 1-.4 1.4-.7l-.3-.3a9 9 0 0 1-7.2 0l-.3.3c.4.3.9.5 1.4.7l-.9 1.5c-1.3-.4-2.6-1-3.8-1.9-.3-3.2.5-5.9 2.2-8.3ZM9.2 11a1.5 1.6 0 1 0 0 3.2 1.5 1.6 0 0 0 0-3.2Zm5.6 0a1.5 1.6 0 1 0 0 3.2 1.5 1.6 0 0 0 0-3.2Z"/></svg>
  </a>
</header>"""

PAGINA = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@@TITULO@@ · Society MLBB</title>
<meta name="description" content="Society MLBB: comunidade de Mobile Legends com catálogo de heróis, meta, builds e ferramentas.">
<meta name="theme-color" content="#0a0a0b">
<meta name="referrer" content="no-referrer">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
@@CSS@@
</head>
<body class="is-static is-guest">
@@SPRITE@@
<div id="game">
@@TOPBAR@@
<section id="tab-@@TAB@@" class="tab on">
@@CONTEUDO@@
</section>
</div>
<script src="js/pages-config.js"></script>
@@SCRIPTS@@
</body>
</html>
"""


def ler(p):
    return Path(p).read_text(encoding="utf-8-sig")  # tira BOM e normaliza quebras de linha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origem", default="site-antigo")
    ap.add_argument("--saida", default="docs")
    a = ap.parse_args()
    SRC, OUT = Path(a.origem), Path(a.saida)

    if not (SRC / "index.html").exists():
        sys.exit(f"Não achei {SRC}/index.html. Rode na raiz do repositório.")
    avisos = []

    # 1) pastas de dados, estilos e imagens
    for pasta in ("css", "data", "img", "icons", "assets"):
        if (SRC / pasta).exists():
            shutil.copytree(SRC / pasta, OUT / pasta, dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns("*.bak", "*.bak2", "*.bak3"))
    for f in ("icon-192.png", "icon-512.png"):
        if (SRC / f).exists():
            (OUT / f).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(SRC / f, OUT / f)
    (OUT / "js").mkdir(parents=True, exist_ok=True)
    (OUT / "css").mkdir(parents=True, exist_ok=True)
    (OUT / ".nojekyll").write_text("")

    # 2) scripts de heróis, com os caminhos corrigidos
    for nome, trocas in PATCHES.items():
        origem = SRC / "js" / nome
        if not origem.exists():
            avisos.append(f"{nome}: arquivo não encontrado em {SRC}/js")
            continue
        txt = ler(origem)
        for velho, novo in trocas:
            if velho in txt:
                txt = txt.replace(velho, novo)
            else:
                avisos.append(f"{nome}: trecho NÃO encontrado -> {velho[:70]}")
        (OUT / "js" / nome).write_text(txt, encoding="utf-8")

    # 3) arquivos próprios desta etapa
    for nome in ("shell.js", "heroi-page.js"):
        shutil.copy2(AQUI / nome, OUT / "js" / nome)
    shutil.copy2(AQUI / "static.css", OUT / "css" / "static.css")
    cfg = "window.SOCIETY_PAGES = " + repr(PAGES).replace("'", '"') + ";\n"
    (OUT / "js" / "pages-config.js").write_text(cfg, encoding="utf-8")

    # 4) ícones (sprite SVG) e lista de CSS, na ordem do index antigo
    antigo = ler(SRC / "index.html")
    m = re.search(r'<svg width="0" height="0"[\s\S]*?</svg>', antigo)
    sprite = m.group(0) if m else ""
    if not m:
        avisos.append("sprite de ícones não encontrado no index.html antigo")
    nomes_css = re.findall(r'href="/static/css/([^"]+\.css)"', antigo)
    links = []
    for n in nomes_css:
        if n not in CSS_FORA and (OUT / "css" / n).exists():
            links.append(f'<link rel="stylesheet" href="css/{n}">')
    links.append('<link rel="stylesheet" href="css/static.css">')
    css = "\n".join(links)

    def pagina(arq, titulo, tab, conteudo, scripts):
        tags = "\n".join(f'<script src="js/{s}"></script>' for s in scripts)
        html = (PAGINA.replace("@@TITULO@@", titulo).replace("@@CSS@@", css)
                .replace("@@SPRITE@@", sprite).replace("@@TOPBAR@@", TOPBAR)
                .replace("@@TAB@@", tab).replace("@@CONTEUDO@@", conteudo)
                .replace("@@SCRIPTS@@", tags))
        (OUT / arq).write_text(html, encoding="utf-8")

    def view(nome):
        p = SRC / "views" / nome
        if p.exists():
            return ler(p)
        avisos.append(f"views/{nome} não encontrada")
        return "<main><p>Conteúdo indisponível.</p></main>"

    base = ["hero-catalog.js", "hero-official.js"]
    pagina("index.html", "Início", "home", view("home.html"), base + ["shell.js"])
    pagina("herois.html", "Heróis", "heroes", view("heroes.html"),
           base + ["heroes-catalog.js", "shell.js"])
    pagina("heroi.html", "Herói", "hero",
           '<main class="hero-page"><div id="heroPage"></div></main>',
           base + ["shell.js", "heroi-page.js"])

    print(f"Site montado em {OUT}/")
    print("Páginas: " + ", ".join(PAGES.values()))
    if avisos:
        print("\nAVISOS (cole isto na conversa se algo não funcionar):")
        for av in avisos:
            print("  -", av)
    else:
        print("Sem avisos.")


if __name__ == "__main__":
    main()