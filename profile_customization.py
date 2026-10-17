"""
Destiny · Gating de personalização de perfil (frames/temas).

Mantém os catálogos em SINCRONIA com profile.js:
    FRAME_CATALOG / THEME_CATALOG  (no cliente)
    FRAME_TIERS   / THEME_TIERS    (aqui)

Inclui as expansões v26 (molduras/temas) e v27 (molduras de partículas).

Regras:
  · Cada moldura/tema pertence a um "tier".
  · Um tier exige um conjunto de papéis (TIER_ACCESS).
  · "dev" é super-user: passa em tudo.
  · Valor desconhecido = rejeitado (cai no default).
  · Valor conhecido mas sem acesso = rejeitado (cai no default).
    [FIX] antes devolvia o valor pedido, o que anulava a sanitização
    feita em profile() quando o usuário perdia o cargo.
"""
from __future__ import annotations

DEFAULT_FRAME = "default"
DEFAULT_THEME = "classic"
DEFAULT_AVATAR_SHAPE = "round"

VALID_AVATAR_SHAPES = {"round", "squircle", "square"}

# ─────────────────────────────────────────────────────────
# CATÁLOGOS
# ─────────────────────────────────────────────────────────
FRAME_TIERS: dict[str, str] = {
    # ── free ──
    "default": "free", "elite": "free", "shadow": "free", "obsidian": "free",
    "ice": "free", "frost": "free", "neon": "free", "holo": "free",
    # v26
    "lava": "free", "tsunami": "free", "rocha": "free", "vendaval": "free",
    "aco-escovado": "free", "cobre": "free", "folha": "free", "ambar": "free",
    "perigo": "free", "vhs": "free", "arcade": "free", "monolito": "free",
    # v27 (partículas)
    "nevasca": "free", "bolhas": "free", "vagalumes": "free",

    # ── vip ──
    "gold": "vip", "platinum": "vip", "royal": "vip", "celestial": "vip",
    "dragon": "vip", "rainbow": "vip", "sun": "vip", "sakura": "vip",
    "emerald": "vip", "toxic": "vip", "blood": "vip", "crimson": "vip",
    "fire": "vip",
    # v26
    "nebula": "vip", "cometa": "vip", "buraco-negro": "vip", "supernova": "vip",
    "titanio": "vip", "ouro-branco": "vip", "coral": "vip", "madeira": "vip",
    "farao": "vip", "sakura-veil": "vip", "asteca": "vip", "runas": "vip",
    "arabesco": "vip", "holograma": "vip", "campeao": "vip",
    # v27 (partículas)
    "brasas": "vip", "outono": "vip", "chuva-estelar": "vip",
    "rosas": "vip", "confete": "vip",

    # ── streamer ──
    "lightning": "streamer", "live-pulse": "streamer",
    # v26
    "epico": "streamer", "chroma-key": "streamer", "holofote": "streamer",
    # v27
    "chuva-de-moedas": "streamer",

    # ── beta ──
    "beta-circuit": "beta", "beta-construct": "beta",
    # v26
    "cartucho": "beta", "disquete": "beta", "fluxo-de-dados": "beta",
    "colecionador": "beta",
    # v27
    "chuva-de-codigo": "beta",

    # ── mod ──
    "guardian": "mod",
    # v26
    "aegis": "mod", "veredito": "mod",

    # ── admin ──
    "crown": "admin",
    # v26
    "lendario": "admin", "soberano": "admin",
    # v27
    "poeira-de-ouro": "admin",

    # ── dev ──
    "void": "dev", "plasma": "dev", "galaxy": "dev",
    # v26
    "portal": "dev", "glitch-rgb": "dev",
    # v27
    "chuva-glitch": "dev",
}

THEME_TIERS: dict[str, str] = {
    # ── free ──
    "classic": "free", "arena": "free", "ocean": "free", "aurora": "free",
    "sunset": "free", "forest": "free", "sakura": "free", "cyber": "free",
    "mythic": "free", "mono": "free",
    # v26
    "tempestade": "free", "tundra": "free", "selva": "free", "savana": "free",
    "caverna": "free", "marmore": "free", "concreto": "free",
    "fliperama": "free", "calmaria": "free", "rio": "free",

    # ── vip ──
    "galaxy": "vip", "volcanic": "vip", "arctic": "vip", "desert": "vip",
    "eclipse": "vip", "royal": "vip", "neon": "vip",
    # v26
    "furia": "vip", "euforia": "vip", "medieval": "vip", "art-deco": "vip",
    "toquio-noturno": "vip", "nova-york": "vip", "veneza": "vip",
    "cairo": "vip", "feerico": "vip", "angelical": "vip", "abissal": "vip",
    "veludo": "vip",

    # ── beta ──
    "matrix": "beta",
    # v26
    "onirico": "beta", "saudade": "beta", "rpg-antigo": "beta",

    # ── streamer ──
    "livestream": "streamer",
    # v26
    "battle-royale": "streamer", "fliperama-neon": "streamer",

    # ── mod ──
    "sentinel": "mod",
    # v26
    "fps-tatico": "mod",

    # ── admin ──
    "throne": "admin",
    # v26
    "demoniaco": "admin",

    # ── dev ──
    "toxic": "dev", "candy": "dev",
    # v26
    "glitch": "dev",
}

# ─────────────────────────────────────────────────────────
# QUEM PODE USAR CADA TIER
# ─────────────────────────────────────────────────────────
# None = livre para todos.  Os papéis listados são os que PODEM usar o tier.
# (Papéis superiores herdam o acesso do tier inferior.)
TIER_ACCESS: dict[str, frozenset[str] | None] = {
    "free":     None,
    "vip":      frozenset({"vip", "beta", "streamer", "mod", "admin", "dev"}),
    "beta":     frozenset({"beta", "mod", "admin", "dev"}),
    "streamer": frozenset({"streamer", "mod", "admin", "dev"}),
    "mod":      frozenset({"mod", "admin", "dev"}),
    "admin":    frozenset({"admin", "dev"}),
    "dev":      frozenset({"dev"}),
}

# ─────────────────────────────────────────────────────────
# FUNÇÕES PÚBLICAS
# ─────────────────────────────────────────────────────────
def _resolve(mapping: dict[str, str], value, default: str, role: str) -> tuple[bool, str]:
    """
    Devolve (permitido, valor_final).
      · Valor vazio → default, sempre permitido.
      · Valor desconhecido → não permitido, default.
      · Valor conhecido → checa TIER_ACCESS. Dev passa sempre.
      · Sem acesso → não permitido, default.
    """
    v = str(value or "").strip()
    if not v:
        return True, default
    tier = mapping.get(v)
    if tier is None:
        return False, default
    if role == "dev":
        return True, v
    allowed = TIER_ACCESS.get(tier)
    if not allowed:
        return True, v
    if role in allowed:
        return True, v
    return False, default


def frame_allowed(role: str, value) -> tuple[bool, str]:
    return _resolve(FRAME_TIERS, value, DEFAULT_FRAME, role)


def theme_allowed(role: str, value) -> tuple[bool, str]:
    return _resolve(THEME_TIERS, value, DEFAULT_THEME, role)


def normalize_avatar_shape(value) -> str:
    v = str(value or "").strip().lower()
    return v if v in VALID_AVATAR_SHAPES else DEFAULT_AVATAR_SHAPE


def describe_for_role(role: str) -> dict:
    """Mapa opcional para debug / endpoint REST. Não usado pelo servidor."""
    def _pack(mapping):
        return {
            k: {
                "tier": t,
                "allowed": (role == "dev")
                           or (TIER_ACCESS.get(t) is None)
                           or (role in (TIER_ACCESS.get(t) or set())),
            }
            for k, t in mapping.items()
        }
    return {"frames": _pack(FRAME_TIERS), "themes": _pack(THEME_TIERS)}