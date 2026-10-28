#!/usr/bin/env python3
"""baixar_imagens.py — baixa para o repositório as imagens do CDN usadas nos dados dos heróis.

Substitui o antigo proxy /api/img: o site passa a ler as imagens de docs/img/cdn/<host>/<caminho>
(o montar_site.py já ajusta o JavaScript para isso). Se alguma imagem não estiver baixada,
o site tenta carregar direto do CDN como plano B.

Uso, na raiz do repositório (depois do montar_site.py):
    python build-estatico/baixar_imagens.py --contar     # só conta, não baixa
    python build-estatico/baixar_imagens.py              # catálogo + ícones de skills
    python build-estatico/baixar_imagens.py --skins      # inclui as imagens das skins (bem mais pesado)
    python build-estatico/baixar_imagens.py --limite 20  # teste rápido com 20 imagens
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HOSTS = re.compile(
    r"^(?:https?:)?//(akmweb\.youngjoygame\.com|esportpedia\.b-cdn\.net|"
    r"static\.wikia\.nocookie\.net|cdn\.mobilelegends\.com)/", re.I)
HEADERS = {
    "Referer": "https://www.mobilelegends.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
}


def coletar(obj, em_skins, base, skins):
    if isinstance(obj, dict):
        for k, v in obj.items():
            coletar(v, em_skins or k == "skins", base, skins)
    elif isinstance(obj, list):
        for v in obj:
            coletar(v, em_skins, base, skins)
    elif isinstance(obj, str) and HOSTS.match(obj.strip()):
        u = obj.strip()
        (skins if em_skins else base).add("https:" + u if u.startswith("//") else u)


def destino(url, pasta_img):
    p = urllib.parse.urlparse(url)
    caminho = urllib.parse.unquote(p.path).lstrip("/")
    caminho = re.sub(r'[<>:"|?*]', "_", caminho)
    if not caminho or caminho.endswith("/"):
        return None
    return pasta_img / "cdn" / p.hostname / caminho


def baixar(url, arq):
    if arq.exists() and arq.stat().st_size > 0:
        return "existia", 0
    arq.parent.mkdir(parents=True, exist_ok=True)
    ultimo = None
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                dados = r.read()
            arq.write_bytes(dados)
            return "ok", len(dados)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            ultimo = e
    return f"falhou: {ultimo}", 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--docs", default="docs", help="pasta do site montado")
    ap.add_argument("--skins", action="store_true", help="inclui imagens das skins")
    ap.add_argument("--contar", action="store_true", help="só conta as imagens")
    ap.add_argument("--limite", type=int, default=0, help="baixa só N imagens (teste)")
    a = ap.parse_args()

    docs = Path(a.docs)
    dados = docs / "data" / "official"
    if not dados.exists():
        sys.exit(f"Não achei {dados}. Rode antes o montar_site.py.")

    base, skins = set(), set()
    for arq in dados.glob("*.json"):  # index.json e um JSON por herói (pt/ só tem texto)
        coletar(json.loads(arq.read_text(encoding="utf-8-sig")), False, base, skins)

    alvo = sorted(base | (skins if a.skins else set()))
    print(f"Imagens do catálogo e skills: {len(base)}")
    print(f"Imagens de skins: {len(skins)} {'(incluídas)' if a.skins else '(ignoradas; use --skins)'}")
    if a.contar:
        return
    if a.limite:
        alvo = alvo[: a.limite]

    pasta_img = docs / "img"
    ok = existia = 0
    falhas, total = [], 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futuros = {}
        for url in alvo:
            arq = destino(url, pasta_img)
            if arq is None:
                falhas.append(f"{url}: caminho inválido")
                continue
            futuros[ex.submit(baixar, url, arq)] = url
        for i, f in enumerate(as_completed(futuros), 1):
            status, n = f.result()
            if status == "ok":
                ok += 1
                total += n
            elif status == "existia":
                existia += 1
            else:
                falhas.append(f"{futuros[f]}: {status}")
            if i % 50 == 0:
                print(f"  {i}/{len(futuros)}...")

    print(f"\nBaixadas: {ok} ({total / 1048576:.1f} MB) | já existiam: {existia} | falhas: {len(falhas)}")
    if falhas:
        Path("falhas-imagens.txt").write_text("\n".join(falhas), encoding="utf-8")
        print("Lista de falhas em falhas-imagens.txt")


if __name__ == "__main__":
    main()