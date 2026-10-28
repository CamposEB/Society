#!/usr/bin/env python3
"""montar_site.py — monta a versão estática (GitHub Pages/Cloudflare) do site antigo e gera os arquivos PWA corrigidos."""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import comunidade  # noqa: E402

PAGES = {
    "home": "index.html", "heroes": "herois.html", "hero": "heroi.html",
    "meta": "meta.html", "builds": "builds.html", "tools": "tools.html",
    "guide": "guide.html", "quiz": "quiz.html"
}

CSS_FORA = {
    "login.css", "admin-v2.css", "moderation.css", "lfg.css", "profile.css",
    "profile-lite.css", "tournaments.css", "lobby.css", 
    "command-palette.css", "sidebar-hover.css",
}

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
    "tools.js": [
        ('const response = await fetch("/static/views/tools.html");', '// Versão estática: conteúdo já injetado no DOM'),
        ('if (!response.ok) throw new Error("Falha ao carregar ferramentas: HTTP " + response.status);', ''),
        ('content.innerHTML = await response.text();', ''),
    ],
    "retri-trainer.js": [
        ('const RETRI_ICON = "/static/assets/ca%C3%A7ar.png";', 'const RETRI_ICON = "assets/ca%C3%A7ar.png";'),
    ],
}

TOPBAR = """<header id="topbar" class="tb">
  <button id="menuBtn" type="button" aria-label="Abrir menu" aria-controls="sidebar" aria-expanded="false">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  </button>
  <button id="topbarBrand" type="button" data-shortcut="home" aria-label="Society MLBB, início">
    <span class="logo"><img src="img/logo.png" alt=""></span>
    <span class="tb-wordmark" aria-hidden="true">Society <b>MLBB</b></span>
  </button>
  <a id="topbarDiscord" class="tb-icon-link" href="https://discord.gg/pXdxDDJWdk" target="_blank" rel="noopener noreferrer" aria-label="Entrar no Discord da comunidade">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M6 6.2C7.6 5.2 9.2 4.7 10.3 4.6l.4.9a11 11 0 0 1 2.6 0l.4-.9c1.1.1 2.7.6 4.3 1.6 1.7 2.4 2.5 5.1 2.2 8.3-1.2.9-2.5 1.5-3.8 1.9l-.9-1.5c.5-.2 1-.4 1.4-.7l-.3-.3a9 9 0 0 1-7.2 0l-.3.3c.4.3.9.5 1.4.7l-.9 1.5c-1.3-.4-2.6-1-3.8-1.9-.3-3.2.5-5.9 2.2-8.3ZM9.2 11a1.5 1.6 0 1 0 0 3.2 1.5 1.6 0 0 0 0-3.2Zm5.6 0a1.5 1.6 0 1 0 0 3.2 1.5 1.6 0 0 0 0-3.2Z"/></svg>
  </a>
</header>"""

ATIVA = {"home": "home", "heroes": "heroes", "hero": "heroes", "meta": "meta", "builds": "builds", "tools": "tools", "guide": "guide", "quiz": "quiz"}

def sidebar(tab):
    ativo = ATIVA.get(tab, tab)
    def item(chave, icone, titulo, sub):
        on = ' class="on"' if chave == ativo else ""
        return (f'<button type="button" data-t="{chave}" data-shortcut="{chave}" data-title="{titulo}"{on}>'
                f'<svg class="nav-icon" aria-hidden="true" focusable="false"><use href="#i-{icone}"/></svg>'
                f'<span class="nav-text"><b>{titulo}</b><small>{sub}</small></span></button>')
    def mobile(chave, icone, rotulo):
        on = ' class="on"' if chave == ativo else ""
        return (f'<button type="button" data-t="{chave}" data-shortcut="{chave}"{on}>'
                f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-{icone}"/></svg>'
                f'<small>{rotulo}</small></button>')
    return f"""<div id="scrim"></div>
<div id="sidebarHotzone" aria-hidden="true"></div>
<aside id="sidebar">
  <div class="sidebar-heading">
    <div id="brand"><span class="logo"><img src="img/logo.png" alt="Society MLBB"></span></div>
    <button id="menuClose" type="button" aria-label="Fechar menu">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>
    </button>
  </div>
  <nav id="nav" aria-label="Navegação principal">
    <div class="nav-group">
      <span class="nav-group-label">COMUNIDADE</span>
      {item("home", "home", "Início", "Sua página inicial")}
    </div>
    <div class="nav-group">
      <span class="nav-group-label">JOGO</span>
      {item("meta", "chart", "Meta por rota", "Heróis em alta por lane")}
      {item("heroes", "swords", "Heróis", "Catálogo com builds e meta")}
      {item("builds", "build", "Builds", "Itens e emblemas testados")}
      {item("guide", "book", "Guia", "Termos e jogadas explicados")}
    </div>
    <div class="nav-group">
      <span class="nav-group-label">MAIS</span>
      {item("tools", "percent", "Ferramentas", "Win rate e treino de caçar")}
      {item("quiz", "help", "Quiz", "Teste seu conhecimento")}
    </div>
  </nav>
</aside>
<nav id="mobileNav" aria-label="Navegação principal para celular">
  {mobile("home", "home", "Início")}
  {mobile("heroes", "swords", "Heróis")}
  {mobile("meta", "chart", "Meta")}
  {mobile("builds", "build", "Builds")}
  <button id="mobileMore" type="button" aria-label="Abrir mais opções" aria-controls="sidebar" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/></svg><small>Mais</small></button>
</nav>"""

PAGINA = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@@TITULO@@ · Society MLBB</title>
<meta name="description" content="Society MLBB: comunidade de Mobile Legends com catálogo de heróis, meta, builds e ferramentas.">
<meta name="referrer" content="no-referrer">

<!-- Open Graph / Redes Sociais -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://society-128.pages.dev/">
<meta property="og:title" content="@@TITULO@@ · Society MLBB">
<meta property="og:description" content="Comunidade de Mobile Legends com meta por rota, builds testadas, calculadora de win rate e muito mais.">
<meta property="og:image" content="https://society-128.pages.dev/img/social-preview.webp">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="@@TITULO@@ · Society MLBB">
<meta name="twitter:description" content="Comunidade de Mobile Legends com meta por rota, builds testadas, calculadora de win rate e muito mais.">
<meta name="twitter:image" content="https://society-128.pages.dev/img/social-preview.webp">

<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<!-- PWA Configs -->
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0a0a0b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="icon-192.png">

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
@@SIDEBAR@@
</div>
<script src="js/pages-config.js"></script>
@@SCRIPTS@@
<!-- Registro do Service Worker (PWA) -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.log('SW falhou:', err));
    });
  }
</script>
</body>
</html>
"""

def rel_html(txt):
    txt = re.sub(r"""((?:src|href|poster|data-src)\s*=\s*['"])/static/""", r"\1", txt)
    return re.sub(r"""url\(\s*(['"]?)/static/""", r"url(\1", txt)

def ler(p):
    return Path(p).read_text(encoding="utf-8-sig")

def gerar_arquivos_pwa(OUT):
    """Gera o manifest.json, sw.js e _redirects na pasta de saída com correções para Cloudflare Pages."""
    
    # 1. Manifest.json corrigido
    manifest_data = {
        "name": "Society MLBB",
        "short_name": "Society",
        "description": "Comunidade de Mobile Legends com meta, builds e ferramentas.",
        "start_url": "/",  # <-- CORREÇÃO: Aponta para a raiz, que o Cloudflare serve
        "scope": "/",
        "display": "standalone",
        "background_color": "#0a0a0b",
        "theme_color": "#0a0a0b",
        "icons": [
            {
                "src": "icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ]
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")

    # 2. Service Worker (sw.js) corrigido
    sw_code = """const CACHE_NAME = 'society-mlbb-v2'; // Atualize a versão para forçar o recache
const ASSETS = [
  './',
  './css/static.css',
  './js/shell.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta cachear cada item. Se um falhar, não quebra os outros.
      return Promise.all(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('Falha ao cachear:', url, err)))
      );
    })
  );
  self.skipWaiting(); // Ativa o novo SW imediatamente
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Ignora requisições que não sejam GET (ex: POST)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
"""
    (OUT / "sw.js").write_text(sw_code, encoding="utf-8")

    # 3. _redirects (Garante que o Cloudflare sirva o index.html para qualquer rota)
    (OUT / "_redirects").write_text("/* /index.html 200\n", encoding="utf-8")

    print("Arquivos PWA (manifest.json, sw.js, _redirects) gerados com correções.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origem", default="site-antigo")
    ap.add_argument("--saida", default="docs")
    a = ap.parse_args()
    SRC, OUT = Path(a.origem), Path(a.saida)

    if not (SRC / "index.html").exists():
        sys.exit(f"Não achei {SRC}/index.html. Rode na raiz do repositório.")
    avisos = []

    # 1. Copiar pastas base
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

    # 2. Gerar arquivos PWA
    gerar_arquivos_pwa(OUT)

    # 3. Tratar CSS
    for css_arq in (OUT / "css").glob("*.css"):
        t = ler(css_arq)
        novo = re.sub(r"""url\(\s*(['"]?)/static/""", r"url(\1../", t)
        novo = re.sub(r"""(@import\s+(?:url\()?\s*['"]?)/static/css/""", r"\1", novo)
        if novo != t:
            css_arq.write_text(novo, encoding="utf-8")

    # 4. Aplicar patches nos JS
    for nome, trocas in PATCHES.items():
        origem = SRC / "js" / nome
        if not origem.exists():
            continue
        txt = ler(origem)
        for velho, novo in trocas:
            if velho in txt:
                txt = txt.replace(velho, novo)
            else:
                avisos.append(f"{nome}: trecho NÃO encontrado -> {velho[:70]}")
        (OUT / "js" / nome).write_text(txt, encoding="utf-8")

    # 5. Copiar dados (Meta e Builds)
    cont = Path("conteudo")
    cont.mkdir(exist_ok=True)
    (OUT / "data").mkdir(parents=True, exist_ok=True)
    for nome, exportado in (("meta.json", "community_meta.json"), ("builds.json", "community_builds.json")):
        alvo = cont / nome
        if not alvo.exists():
            fonte = Path("dados-exportados") / exportado
            alvo.write_text(ler(fonte) if fonte.exists() else "[]", encoding="utf-8")
            print(f"Criado {alvo} " + ("(a partir da exportação)" if fonte.exists() else "(vazio)"))
        shutil.copy2(alvo, OUT / "data" / nome)

    # 6. Extrair lógica do App.js antigo
    app = SRC / "js" / "app.js"
    if app.exists():
        codigo, faltando, nomes = comunidade.gerar(ler(app))
        shim = ler(AQUI / "community-shim.js").replace("/*__EXTRAIDO__*/", codigo)
        (OUT / "js" / "community-static.js").write_text(shim, encoding="utf-8")
        print(f"community-static.js: {len(nomes)} declarações extraídas do app.js")
        for nome in faltando:
            avisos.append(f"função-raiz não encontrada no app.js: {nome}")
    else:
        avisos.append("site-antigo/js/app.js não encontrado: meta e builds ficarão sem conteúdo")

    # 7. Copiar scripts estáticos próprios
    for nome in ("heroi-page.js", "shell.js", "guide.js", "quiz.js"):
        shutil.copy2(AQUI / nome, OUT / "js" / nome)
    
    # 8. Copiar CSS estático próprio
    shutil.copy2(AQUI / "static.css", OUT / "css" / "static.css")
    
    # 9. Gerar pages-config.js
    cfg = "window.SOCIETY_PAGES = " + repr(PAGES).replace("'", '"') + ";\n"
    (OUT / "js" / "pages-config.js").write_text(cfg, encoding="utf-8")

    # 10. Encontrar sprite e montar lista de CSS
    antigo = ler(SRC / "index.html")
    m = re.search(r'<svg width="0" height="0"[\s\S]*?</svg>', antigo)
    sprite = m.group(0) if m else ""
    if not m:
        avisos.append("sprite de ícones não encontrado no index.html antigo")
    
    nomes_css = re.findall(r"""href=['"]/static/css/([^'"]+\.css)['"]""", antigo)
    if not nomes_css:
        nomes_css = [f.name for f in (SRC / "css").glob("*.css")]
        
    links = []
    for n in nomes_css:
        if n not in CSS_FORA and (OUT / "css" / n).exists():
            links.append(f'<link rel="stylesheet" href="css/{n}">')
            
    if "quiz.css" not in nomes_css and (OUT / "css" / "quiz.css").exists():
        links.append('<link rel="stylesheet" href="css/quiz.css">')
        
    links.append('<link rel="stylesheet" href="css/static.css">')
    css = "\n".join(links)

    # 11. Função geradora de páginas
    def pagina(arq, titulo, tab, conteudo, scripts):
        tags = "\n".join(f'<script src="js/{s}"></script>' for s in scripts)
        html = (PAGINA.replace("@@TITULO@@", titulo).replace("@@CSS@@", css)
                .replace("@@SPRITE@@", sprite).replace("@@TOPBAR@@", TOPBAR).replace("@@SIDEBAR@@", sidebar(tab))
                .replace("@@TAB@@", tab).replace("@@CONTEUDO@@", conteudo)
                .replace("@@SCRIPTS@@", tags))
        (OUT / arq).write_text(html, encoding="utf-8")

    def view(nome):
        p = SRC / "views" / nome
        if p.exists():
            return rel_html(ler(p))
        avisos.append(f"views/{nome} não encontrada")
        return "<main><p>Conteúdo indisponível.</p></main>"

    # 12. Gerar as páginas HTML
    base = ["hero-catalog.js", "hero-official.js"]
    com = ["community-static.js"]
    
    pagina("index.html", "Início", "home", view("home.html"), base + com + ["shell.js"])
    pagina("meta.html", "Meta por rota", "meta", view("meta.html"), base + com + ["shell.js"])
    pagina("builds.html", "Builds", "builds", view("builds.html"), base + com + ["shell.js"])
    pagina("herois.html", "Heróis", "heroes", view("heroes.html"), base + ["heroes-catalog.js", "shell.js"])
    pagina("heroi.html", "Herói", "hero", '<main class="hero-page"><div id="heroPage"></div></main>',
           base + ["shell.js", "heroi-page.js"])
    
    tools_conteudo = '<div id="toolsContent" class="tools-page">' + view("tools.html") + '</div>'
    pagina("tools.html", "Ferramentas", "tools", tools_conteudo, ["tools.js", "retri-trainer.js", "shell.js"])

    pagina("guide.html", "Guia", "guide", view("guide.html"), ["guide.js", "shell.js"])
    
    pagina("quiz.html", "Quiz", "quiz", view("quiz.html"), ["quiz.js", "shell.js"])

    print(f"Site montado em {OUT}/")
    print("Páginas: " + ", ".join(PAGES.values()))

if __name__ == "__main__":
    main()