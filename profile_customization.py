"""
Destiny · Gating de personalização de perfil (frames/temas).

Mantém os catálogos em SINCRONIA com profile.js:
    FRAME_CATALOG / THEME_CATALOG  (no cliente)
    FRAME_TIERS   / THEME_TIERS    (aqui)

Regras:
  · Cada moldura/tema pertence a um "tier".
  · Um tier exige um conjunto de papéis (TIER_ACCESS).
  · "dev" é super-user: passa em tudo.
  · Valor desconhecido = rejeitado (cai no default).
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
    # ── vip ──
    "gold": "vip", "platinum": "vip", "royal": "vip", "celestial": "vip",
    "dragon": "vip", "rainbow": "vip", "sun": "vip", "sakura": "vip",
    "emerald": "vip", "toxic": "vip", "blood": "vip", "crimson": "vip",
    "fire": "vip",
    # ── streamer ──
    "lightning": "streamer", "live-pulse": "streamer",
    # ── beta ──
    "beta-circuit": "beta", "beta-construct": "beta",
    # ── mod ──
    "guardian": "mod",
    # ── admin ──
    "crown": "admin",
    # ── dev ──
    "void": "dev", "plasma": "dev", "galaxy": "dev",
}

THEME_TIERS: dict[str, str] = {
    # ── free ──
    "classic": "free", "arena": "free", "ocean": "free", "aurora": "free",
    "sunset": "free", "forest": "free", "sakura": "free", "cyber": "free",
    "mythic": "free", "mono": "free",
    # ── vip ──
    "galaxy": "vip", "volcanic": "vip", "arctic": "vip", "desert": "vip",
    "eclipse": "vip", "royal": "vip", "neon": "vip",
    # ── beta ──
    "matrix": "beta",
    # ── streamer ──
    "livestream": "streamer",
    # ── mod ──
    "sentinel": "mod",
    # ── admin ──
    "throne": "admin",
    # ── dev ──
    "toxic": "dev", "candy": "dev",
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
    return role in allowed, v


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