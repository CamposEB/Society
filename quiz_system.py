# quiz_system.py — Quiz do dia, sequência, ranking e treino da Society MLBB.
#
# Mesmo padrão do social.py: server.py chama quiz_system.init(...) uma vez e
# repassa ao handle() as mensagens listadas em WS_TYPES.
#
# O que este módulo guarda:
#   quiz_done     (já existia)  nick + dia -> impede responder duas vezes
#   quiz_results  (nova)        nick + dia + opção marcada + acertou? -> ranking e taxa
#
# A sequência de dias é calculada a partir de quiz_done, então ela já vale
# para os dias respondidos antes desta atualização.
import datetime
import json
import secrets
import time

WS_TYPES = {"quiz_get", "quiz_answer", "quiz_ranking", "quiz_practice", "quiz_practice_answer"}

COIN_REWARD = 10                                  # moedas por acerto no quiz do dia
STREAK_BONUS = {3: 5, 7: 15, 14: 30, 30: 100}     # dias seguidos -> moedas extras (use {} para desligar)
RANKING_SIZE = 10
PRACTICE_COOLDOWN = 0.4                           # segundos entre perguntas de treino

_db = _send = _add_coins = _add_activity = _me = _get_user = _norm_vis = _is_guest = None
_questions = []
_last_practice = {}


def init(*, db, send, questions, add_coins, add_activity, me, get_user,
         normalize_visibility, is_guest):
    global _db, _send, _questions, _add_coins, _add_activity, _me, _get_user, _norm_vis, _is_guest
    _db, _send, _questions = db, send, questions
    _add_coins, _add_activity, _me = add_coins, add_activity, me
    _get_user, _norm_vis, _is_guest = get_user, normalize_visibility, is_guest
    for position, item in enumerate(_questions):
        options = item.get("o")
        answer = item.get("a")
        if (not item.get("q") or not isinstance(options, list) or len(options) < 2
                or type(answer) is not int or not 0 <= answer < len(options)):
            print(f"⚠️  [quiz] pergunta #{position} inválida em questions.json")
    _ensure_table()


def _ensure_table():
    try:
        _db.execute(
            "CREATE TABLE IF NOT EXISTS quiz_results ("
            "nick TEXT NOT NULL, "
            "day TEXT NOT NULL, "
            "q_idx INTEGER NOT NULL, "
            "picked INTEGER NOT NULL, "
            "correct INTEGER NOT NULL, "
            "ts DOUBLE PRECISION NOT NULL, "
            "PRIMARY KEY (nick, day))"
        )
        _db.execute("CREATE INDEX IF NOT EXISTS idx_quiz_results_nick ON quiz_results(nick)")
        _db.commit()
        print("✅ Tabela quiz_results pronta.")
    except Exception as exc:
        print(f"⚠️  Falha ao garantir tabela quiz_results: {exc}")


# ─── datas ───
def today_index():
    return datetime.date.today().toordinal() % len(_questions)


def seconds_until_tomorrow():
    now = datetime.datetime.now()
    tomorrow = datetime.datetime.combine(now.date() + datetime.timedelta(days=1), datetime.time.min)
    return max(1, int((tomorrow - now).total_seconds()))


# ─── estatísticas do jogador ───
def _summary(nick):
    rows = _db.execute("SELECT day FROM quiz_done WHERE nick=?", (nick,)).fetchall()
    days = set()
    for row in rows:
        try:
            days.add(datetime.date.fromisoformat(row["day"]))
        except (TypeError, ValueError):
            pass

    today = datetime.date.today()
    cursor = today if today in days else today - datetime.timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= datetime.timedelta(days=1)

    best = run = 0
    previous = None
    for day in sorted(days):
        run = run + 1 if previous and (day - previous).days == 1 else 1
        best = max(best, run)
        previous = day

    agg = _db.execute(
        "SELECT COUNT(*) AS total, COALESCE(SUM(correct), 0) AS hits "
        "FROM quiz_results WHERE nick=?", (nick,)
    ).fetchone()
    tracked = int(agg["total"] or 0)
    hits = int(agg["hits"] or 0)
    result = {
        "streak": streak,
        "best_streak": best,
        "answered": len(days),
        "hits": hits,
        "tracked": tracked,
        "accuracy": round(hits * 100 / tracked) if tracked else None,
    }
    upcoming = [d for d in sorted(STREAK_BONUS) if d > streak]
    if upcoming:
        result["next_bonus"] = {"days": upcoming[0], "coins": STREAK_BONUS[upcoming[0]]}
    return result


def state(nick):
    """Estado do quiz do dia para este jogador (vai no init e em quiz_state)."""
    index = today_index()
    question = _questions[index]
    today = str(datetime.date.today())
    done = _db.execute(
        "SELECT 1 FROM quiz_done WHERE nick=? AND day=?", (nick, today)
    ).fetchone() is not None
    data = {
        "q": question["q"],
        "o": list(question["o"]),
        "done": done,
        "coins": COIN_REWARD,
        "next_in": seconds_until_tomorrow(),
        "locked": bool(_is_guest(nick)),
        "total": len(_questions),
    }
    if done:
        row = _db.execute(
            "SELECT picked, correct FROM quiz_results WHERE nick=? AND day=?", (nick, today)
        ).fetchone()
        data["correct_index"] = question["a"]
        data["picked"] = row["picked"] if row else None       # None = respondeu antes da atualização
        data["was_correct"] = bool(row["correct"]) if row else None
        if question.get("e"):
            data["explain"] = question["e"]
    data.update(_summary(nick))
    return data


# ─── ranking ───
def _rank_entry(position, stats, viewer):
    user = _get_user(stats["nick"])
    profile_data = json.loads(user["profile_data"] or "{}") if user else {}
    hidden = _norm_vis(profile_data) == "private" and stats["nick"] != viewer
    name = "Jogador da comunidade" if hidden else (
        profile_data.get("display_name") or (user["display"] if user else stats["nick"])
    )
    return {
        "pos": position,
        "name": name,
        "nick": None if hidden else stats["nick"],
        "hits": stats["hits"],
        "total": stats["total"],
        "accuracy": round(stats["hits"] * 100 / stats["total"]) if stats["total"] else 0,
        "me": stats["nick"] == viewer,
    }


def ranking(viewer):
    rows = _db.execute(
        "SELECT nick, COUNT(*) AS total, COALESCE(SUM(correct), 0) AS hits "
        "FROM quiz_results GROUP BY nick"
    ).fetchall()
    players = []
    for row in rows:
        nick = row["nick"]
        if _is_guest(nick) or not _get_user(nick):
            continue
        players.append({"nick": nick, "total": int(row["total"]), "hits": int(row["hits"])})
    players.sort(key=lambda p: (-p["hits"], p["total"], p["nick"]))

    top = [_rank_entry(pos, p, viewer) for pos, p in enumerate(players[:RANKING_SIZE], 1)]
    mine = next((_rank_entry(pos, p, viewer)
                 for pos, p in enumerate(players, 1) if p["nick"] == viewer), None)
    return {"t": "quiz_ranking", "list": top, "me": mine, "players": len(players)}


# ─── mensagens do WebSocket ───
async def handle(nick, m):
    kind = m.get("t")
    if kind == "quiz_get":
        await _send(nick, {"t": "quiz_state", **state(nick)})
    elif kind == "quiz_answer":
        await _answer(nick, m)
    elif kind == "quiz_ranking":
        await _send(nick, ranking(nick))
    elif kind == "quiz_practice":
        await _practice(nick, m)
    elif kind == "quiz_practice_answer":
        await _practice_answer(nick, m)


async def _answer(nick, m):
    if _is_guest(nick):
        return
    current = state(nick)
    if current["done"]:                       # já respondeu: só sincroniza a tela
        await _send(nick, {"t": "quiz_state", **current})
        return

    index = today_index()
    question = _questions[index]
    picked = m.get("i")
    if type(picked) is not int or not 0 <= picked < len(question["o"]):
        return
    correct = picked == question["a"]
    today = str(datetime.date.today())

    _db.execute("INSERT INTO quiz_done(nick,day) VALUES(?,?) ON CONFLICT DO NOTHING", (nick, today))
    _db.execute(
        "INSERT INTO quiz_results(nick,day,q_idx,picked,correct,ts) VALUES(?,?,?,?,?,?) "
        "ON CONFLICT DO NOTHING",
        (nick, today, index, picked, 1 if correct else 0, time.time()),
    )
    _db.commit()

    streak = _summary(nick)["streak"]
    bonus = STREAK_BONUS.get(streak, 0) if correct else 0
    reward = (COIN_REWARD + bonus) if correct else 0
    _add_activity(nick, "quiz", "Respondeu ao quiz do dia" + (" corretamente" if correct else ""))
    if reward:
        _add_coins(nick, reward)

    await _send(nick, {
        "t": "quiz_result", "ok": correct, "reward": reward, "bonus": bonus,
        "state": state(nick),
    })
    await _send(nick, {"t": "me", **_me(nick)})


async def _practice(nick, m):
    now = time.monotonic()
    if now - _last_practice.get(nick, 0) < PRACTICE_COOLDOWN:
        return
    if len(_last_practice) > 5000:
        _last_practice.clear()
    _last_practice[nick] = now

    today = today_index()
    pool = [i for i in range(len(_questions)) if i != today]   # nunca revela a pergunta do dia
    exclude = m.get("exclude")
    if type(exclude) is int and len(pool) > 1:
        pool = [i for i in pool if i != exclude] or pool
    if not pool:
        return
    pick = secrets.choice(pool)
    question = _questions[pick]
    await _send(nick, {"t": "quiz_practice", "id": pick,
                       "q": question["q"], "o": list(question["o"])})


async def _practice_answer(nick, m):
    pick, chosen = m.get("id"), m.get("i")
    if type(pick) is not int or type(chosen) is not int or not 0 <= pick < len(_questions):
        return
    question = _questions[pick]
    if not 0 <= chosen < len(question["o"]):
        return
    if pick == today_index() and not state(nick)["done"]:
        return                                # a pergunta do dia só abre depois de respondida
    await _send(nick, {
        "t": "quiz_practice_result", "id": pick, "picked": chosen,
        "ok": chosen == question["a"], "correct": question["a"],
        "explain": question.get("e", ""),
    })