"""comunidade.py — extrai do app.js antigo as funções de meta/builds/home e suas dependências."""
import re

RAIZES = [
    "renderCommunityMeta", "renderHomeCommunityPreviews", "renderCommunityBuilds",
    "getBuildFilters", "loadBuildFiltersFromUrl", "updateBuildUrl", "createCommunityVoteActions",
]

SHIM = {
    "$", "el", "send", "guestPrompt", "showCommunityMessage", "showLfgToast", "tab", "openHeroPage",
    "ws", "SELF", "ME", "SHOP", "IS_GUEST", "IS_ADMIN", "IS_MODERATOR", "IS_DEV", "IS_VIP",
    "IS_STREAMER", "IS_BETA", "COMMUNITY_META", "COMMUNITY_BUILDS", "COMMUNITY_BUILDS_TRENDING",
    "COMMUNITY_BUILDS_RECENT", "COMMUNITY_META_LANE", "BUILD_REQUEST_ID", "BUILD_LOAD_TIMER",
    "BUILD_FILTER_TIMER", "BUILD_LIST_STATE", "BUILD_DETAIL_ID", "BUILD_LAST_KEY",
    "BUILD_PENDING_KEY", "selectedBuildItems", "selectedItemCategory", "COMMUNITY_SETUP_DONE",
    "HERO_REQUEST_SEQ",
}

INICIO_FUNC = re.compile(r"^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(", re.M)
INICIO_VAR = re.compile(r"^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=", re.M)
NOMES_VAR = re.compile(r"(?:^(?:const|let|var)\s+|,\s*)([A-Za-z_$][\w$]*)\s*=(?![=>])", re.M)
ANTES_REGEX = set("(,=:[!&|?{};+-*%<>~^")


def achar_fim(t, ini, funcao):
    i, n = ini, len(t)
    p = b = 0
    aberto = False
    ult = ""
    while i < n:
        c = t[i]
        if c in "'\"":
            j = i + 1
            while j < n and t[j] != c and t[j] != "\n":
                j += 2 if t[j] == "\\" else 1
            i, ult = j + 1, "x"
            continue
        if c == "`":
            j, nivel = i + 1, 0
            while j < n:
                if t[j] == "\\":
                    j += 2
                    continue
                if t[j] == "$" and t[j + 1:j + 2] == "{":
                    nivel += 1
                    j += 2
                    continue
                if t[j] == "}" and nivel:
                    nivel -= 1
                elif t[j] == "`" and nivel == 0:
                    break
                j += 1
            i, ult = j + 1, "x"
            continue
        if c == "/" and t[i + 1:i + 2] == "/":
            k = t.find("\n", i)
            i = n if k < 0 else k
            continue
        if c == "/" and t[i + 1:i + 2] == "*":
            k = t.find("*/", i + 2)
            i = n if k < 0 else k + 2
            continue
        if c == "/" and (ult == "" or ult in ANTES_REGEX):
            j = i + 1
            while j < n and t[j] != "/" and t[j] != "\n":
                if t[j] == "\\":
                    j += 2
                elif t[j] == "[":
                    j = t.find("]", j) + 1 or n
                else:
                    j += 1
            i, ult = j + 1, "x"
            while i < n and t[i].isalpha():
                i += 1
            continue
        if c in "([":
            p += 1
        elif c in ")]":
            p -= 1
        elif c == "{":
            b += 1
            if funcao and p == 0:
                aberto = True
        elif c == "}":
            b -= 1
            if funcao and aberto and b == 0:
                return i + 1
        elif c == ";" and not funcao and p == 0 and b == 0:
            return i + 1
        elif c == "\n" and not funcao and p == 0 and b == 0 and ult and ult not in ",=+-*/(&|?:{[":
            return i
        if not c.isspace():
            ult = c
        i += 1
    return n


def segmentar(t):
    inicio = re.search(r"^function\s+initializeApp\s*\(", t, re.M)
    base = inicio.end() if inicio else 0
    achados = []
    for rx, funcao in ((INICIO_FUNC, True), (INICIO_VAR, False)):
        for m in rx.finditer(t, base):
            achados.append((m.start(), funcao))
    blocos, fim_anterior = [], 0
    for ini, funcao in sorted(achados):
        if ini < fim_anterior:
            continue
        fim = achar_fim(t, ini, funcao)
        txt = t[ini:fim]
        if funcao:
            nomes = [INICIO_FUNC.match(txt).group(1)]
        else:
            nomes = NOMES_VAR.findall(txt)
        blocos.append({"ini": ini, "txt": txt, "nomes": nomes})
        fim_anterior = fim
    return blocos


def _limpo(txt):
    txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)
    txt = re.sub(r"//[^\n]*", "", txt)
    return re.sub(r"\"[^\"\n]*\"|'[^'\n]*'", '""', txt)


def ajustar(js):
    js = re.sub(r"""(['"`])/static/""", r"\1", js)
    js = re.sub(r"""['"`]/api/img\?url=['"`]\s*\+\s*encodeURIComponent\(([^()]+)\)""",
                r"(window.HeroOfficial ? HeroOfficial.cdnUrl(\1) : \1)", js)
    return js


def gerar(app_js, raizes=RAIZES):
    blocos = segmentar(app_js)
    mapa = {}
    for b in blocos:
        for nome in b["nomes"]:
            if nome not in SHIM:
                mapa.setdefault(nome, b)
    usados, fila, faltando = {}, list(raizes), []
    while fila:
        nome = fila.pop()
        b = mapa.get(nome)
        if b is None:
            if nome in raizes:
                faltando.append(nome)
            continue
        if b["ini"] in usados:
            continue
        usados[b["ini"]] = b
        for tok in set(re.findall(r"[A-Za-z_$][\w$]*", _limpo(b["txt"]))):
            if tok in mapa and mapa[tok]["ini"] not in usados:
                fila.append(tok)
    ordenados = [usados[k] for k in sorted(usados)]
    codigo = "\n\n".join(b["txt"].rstrip() for b in ordenados)
    nomes = [n for b in ordenados for n in b["nomes"][:1]]
    return ajustar(codigo), faltando, nomes