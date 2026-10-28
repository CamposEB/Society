from pathlib import Path

# Define o caminho base (onde o script está sendo executado)
base = Path(".")

# Garante que as pastas existam
(base / "site-antigo" / "views").mkdir(parents=True, exist_ok=True)
(base / "conteudo").mkdir(parents=True, exist_ok=True)

# --- CONTEÚDO DO META.HTML ---
html_meta = """<main class="community-game-page">

  <header class="community-game-hero">
    <div>
      <p class="community-game-eyebrow">INTELIGÊNCIA DA COMUNIDADE</p>
      <h2>Meta por rota</h2>
      <p>Descubra quais heróis estão funcionando para outros jogadores e compartilhe o que você está vendo nas suas partidas.</p>
    </div>
    <span class="community-hero-icon" aria-hidden="true">
      <svg class="ico" focusable="false"><use href="#i-chart"/></svg>
    </span>
  </header>

  <aside class="community-game-disclaimer" role="note">
    <b>Meta comunitário, não oficial.</b> As indicações são enviadas por jogadores e podem mudar a cada atualização. Não são estatísticas oficiais da Moonton; confira a versão do patch e valide no seu elo. Consulte também os
    <a href="https://www.mobilelegends.com/" target="_blank" rel="noopener noreferrer">comunicados oficiais</a>.
  </aside>

  <!-- ═══════════ DESTAQUES POR ROTA (com fotos) ═══════════ -->
  <section class="community-game-panel meta-showcase-panel" aria-labelledby="metaShowcaseTitle">
    <header class="community-game-section-heading">
      <div>
        <p class="community-game-eyebrow">RADAR DA COMUNIDADE</p>
        <h3 id="metaShowcaseTitle">Destaques por rota</h3>
      </div>
      <span class="meta-source-badge">Comunidade + catálogo</span>
    </header>
    <div id="metaLaneShowcase" class="meta-lane-showcase" aria-live="polite">
      <p class="community-game-message">Carregando destaques...</p>
    </div>
  </section>

  <section class="community-game-panel">
    <header class="community-game-section-heading">
      <div>
        <p class="community-game-eyebrow">ESCOLHA SUA LANE</p>
        <h3>O que está forte por rota?</h3>
      </div>
      <label class="community-patch-filter">Patch
        <select id="metaPatchFilter" aria-label="Filtrar por patch">
          <option value="">Todos</option>
        </select>
      </label>
    </header>

    <div id="metaLaneFilters" class="community-lane-filters" role="group" aria-label="Filtrar por rota">
      <button type="button" data-meta-lane="all"    aria-pressed="true">Todas</button>
      <button type="button" data-meta-lane="EXP"    aria-pressed="false">EXP</button>
      <button type="button" data-meta-lane="Jungle" aria-pressed="false">Selva · Jungle</button>
      <button type="button" data-meta-lane="Mid"    aria-pressed="false">Meio · Mid</button>
      <button type="button" data-meta-lane="Gold"   aria-pressed="false">Ouro · Gold</button>
      <button type="button" data-meta-lane="Roam"   aria-pressed="false">Roam · Suporte</button>
    </div>

    <p id="metaMessage" class="community-game-message" role="status" aria-live="polite"></p>

    <div id="metaList" class="community-meta-grid" aria-live="polite"></div>

    <div id="metaEmpty" class="community-game-empty" hidden>
      <span class="community-empty-icon" aria-hidden="true">
        <svg class="ico" focusable="false"><use href="#i-compass"/></svg>
      </span>
      <b>A comunidade ainda não publicou indicações para este filtro.</b>
      <small>Escolha um herói nas sugestões abaixo e seja o primeiro a indicar.</small>
    </div>

    <!-- Sugestões do catálogo: sempre há heróis com foto para indicar -->
    <details id="metaSuggestions" class="meta-suggestions" open>
      <summary>
        <span>
          <b>Heróis do catálogo para indicar</b>
          <small id="metaSuggestCount">Carregando...</small>
        </span>
        <span class="meta-suggest-toggle" aria-hidden="true"></span>
      </summary>
      <p class="meta-suggest-hint">
        Toque em <b>Indicar</b> para preencher o herói no formulário. O win rate
        vem do catálogo e serve de referência, não é a opinião da comunidade.
      </p>
      <div id="metaSuggestGrid" class="meta-suggest-grid"></div>
    </details>
  </section>

  <section class="community-game-panel">
    <header class="community-game-section-heading">
      <div>
        <p class="community-game-eyebrow">CONHECIMENTO COMPARTILHADO</p>
        <h3>Indique um herói para o meta</h3>
      </div>
    </header>

    <form id="metaForm" class="community-game-form">

      <!-- ═══════════ HERÓI (combobox do catálogo) ═══════════ -->
      <label class="community-field-hero">
        Herói
        <div class="hero-picker" id="metaHeroPicker">
          <div class="hero-picker-input">
            <span class="hero-picker-avatar" id="metaHeroAvatar" aria-hidden="true">
              <svg class="ico" focusable="false"><use href="#i-swords"/></svg>
            </span>
            <input
              type="text"
              id="metaHeroSearch"
              autocomplete="off"
              placeholder="Buscar herói por nome ou função..."
              role="combobox"
              aria-autocomplete="list"
              aria-controls="metaHeroList"
              aria-describedby="metaHeroHint"
              aria-expanded="false"
              aria-haspopup="listbox"
            >
            <button
              type="button"
              class="hero-picker-clear"
              id="metaHeroClear"
              aria-label="Limpar herói"
              hidden
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6"  y2="18"/>
                <line x1="6"  y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <!-- Campo real usado pelo app.js / WebSocket -->
          <input type="hidden" id="metaHero" name="metaHero" value="">
          <div
            class="hero-picker-list"
            id="metaHeroList"
            role="listbox"
            aria-label="Heróis disponíveis"
            hidden
          ></div>
        </div>
        <small class="hero-picker-hint" id="metaHeroHint">Escolha um herói do catálogo — as fotos aparecem ao focar no campo.</small>
      </label>
      <!-- ═══════════════════════════════════════════════════ -->

      <label>Rota
        <select id="metaLane" required>
          <option value="">Selecione</option>
          <option value="EXP">EXP</option>
          <option value="Jungle">Selva · Jungle</option>
          <option value="Mid">Meio · Mid</option>
          <option value="Gold">Ouro · Gold</option>
          <option value="Roam">Roam · Suporte</option>
        </select>
      </label>

      <label>Nível percebido
        <select id="metaTier" required>
          <option value="">Selecione</option>
          <option value="S">S · destaque</option>
          <option value="A">A · forte</option>
          <option value="B">B · situacional</option>
        </select>
      </label>

      <label>Patch / temporada
        <input id="metaPatch" maxlength="24" required placeholder="Ex.: patch 2.1.XX">
      </label>

      <label class="community-form-wide">Por que está funcionando? <span>Opcional</span>
        <textarea id="metaNotes" maxlength="350" rows="3" placeholder="Elo, composição, matchup ou experiência recente"></textarea>
      </label>

      <div class="community-form-footer">
        <p>Use observações suas, sem dados pessoais ou textos copiados. Seu nome público aparece como autor; perfis privados são identificados como “Jogador da comunidade”.</p>
        <button type="submit">
          <svg class="ico" aria-hidden="true" focusable="false"><use href="#i-plus"/></svg>
          Publicar indicação
        </button>
      </div>

    </form>
  </section>

</main>
"""

# --- CONTEÚDO DO BUILDS.HTML ---
html_builds = """<main class="community-game-page builds-page">
  <header class="community-game-hero builds-page-hero">
    <div><p class="community-game-eyebrow">IDEIAS DE QUEM JOGA</p><h2>Builds da comunidade</h2>
      <p>Compare configurações compartilhadas por jogadores e adapte-as ao contexto da partida.</p></div>
    <span class="community-hero-icon" aria-hidden="true"><svg class="ico" focusable="false"><use href="#i-build"/></svg></span>
  </header>
  <aside class="community-game-disclaimer" role="note">
    <b>Conteúdo criado por jogadores.</b> As builds não são oficiais e podem não servir para toda partida. Adapte a compra aos adversários, à composição e ao patch atual. Society MLBB é uma criação da comunidade, não oficial e sem afiliação com a Moonton. Imagens e nomes pertencem aos seus titulares.
  </aside>
  <section class="community-game-panel builds-browser" aria-label="Biblioteca de builds">
    <header class="community-game-section-heading">
      <div><p class="community-game-eyebrow">BIBLIOTECA DA COMUNIDADE</p><h3>Encontre uma build</h3></div>
      <button id="buildFormToggle" class="builds-form-toggle" type="button" aria-expanded="false" aria-controls="buildFormPanel"><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-plus"/></svg> Publicar build</button>
    </header>
    <form id="buildFilters" class="build-filters">
      <label>Herói<input id="buildHeroFilter" type="search" maxlength="40" placeholder="Todos os heróis" autocomplete="off"></label>
      <label>Rota<select id="buildLaneFilter"><option value="">Todas as rotas</option><option value="EXP">EXP</option><option value="Jungle">Selva · Jungle</option><option value="Mid">Meio · Mid</option><option value="Gold">Ouro · Gold</option><option value="Roam">Roam · Suporte</option></select></label>
      <label>Período<select id="buildPeriodFilter"><option value="7d">7 dias</option><option value="30d" selected>30 dias</option><option value="all">Sempre</option></select></label>
      <label>Destaque<select id="buildSortFilter"><option value="popular">Mais curtidas</option><option value="recent">Mais recentes</option></select></label>
    </form>
    <p id="buildMessage" class="community-game-message" role="status" aria-live="polite"></p>
    <div id="buildLists" class="build-lists">
      <section id="buildPopularSection" class="build-list-section" aria-labelledby="buildPopularTitle">
        <header class="build-list-heading"><div><h4 id="buildPopularTitle">Mais curtidas, últimos 30 dias</h4><small>Ordenadas pelas avaliações positivas no período.</small></div></header>
        <div id="buildPopularList" class="community-build-list" aria-live="polite" aria-busy="true"></div>
        <div id="buildPopularEmpty" class="community-game-empty" hidden><b>Nenhuma build neste período.</b><small>Altere os filtros ou publique uma contribuição.</small></div>
      </section>
      <section id="buildRecentSection" class="build-list-section" aria-labelledby="buildRecentTitle">
        <header class="build-list-heading"><div><h4 id="buildRecentTitle">Builds recentes</h4><small>Publicações mais novas primeiro.</small></div></header>
        <div id="buildRecentList" class="community-build-list" aria-live="polite" aria-busy="true"></div>
        <div id="buildRecentEmpty" class="community-game-empty" hidden><b>Nenhuma build encontrada.</b><small>Tente outros filtros ou publique uma contribuição.</small></div>
      </section>
    </div>
    <div id="buildLoadError" class="build-load-error" role="alert" hidden>
      <p>Não foi possível carregar as builds agora.</p><button id="buildRetry" type="button">Tentar novamente</button>
    </div>
  </section>
  <section id="buildFormPanel" class="community-game-panel" hidden>
    <header class="community-game-section-heading"><div><p class="community-game-eyebrow">COMPARTILHE SUA EXPERIÊNCIA</p><h3>Enviar uma build</h3></div></header>
    <form id="buildForm" class="community-game-form">
      <label>Herói<input id="buildHero" maxlength="40" required placeholder="Nome do herói"></label>
      <label>Rota<select id="buildLane" required><option value="">Selecione</option><option value="EXP">EXP</option><option value="Jungle">Selva · Jungle</option><option value="Mid">Meio · Mid</option><option value="Gold">Ouro · Gold</option><option value="Roam">Roam · Suporte</option></select></label>
      <label>Patch / temporada<input id="buildPatch" maxlength="24" required placeholder="Ex.: patch 2.1.XX"></label>
      <label>Feitiço de batalha<input id="buildSpell" maxlength="40" required placeholder="Ex.: Flicker"></label>
      <label>Emblema e talentos<input id="buildEmblem" maxlength="100" required placeholder="Ex.: Assassino · Ruptura"></label>
      <div class="build-item-picker community-form-wide">
        <div class="build-item-picker-heading">
          <div><b>Itens da build</b><small>Escolha de 3 a 6 itens. A ordem dos cliques será a ordem de compra.</small></div>
          <span id="buildItemCount" aria-live="polite">0/6</span>
        </div>
        <label class="build-item-search" for="buildItemSearch">Buscar item
          <input id="buildItemSearch" type="search" autocomplete="off" placeholder="Ex.: botas, dano, defesa">
        </label>
        <div id="buildItemGrid" class="build-item-grid" role="group" aria-label="Selecione os itens da build" tabindex="-1"></div>
        <div class="build-item-order">
          <b>Ordem de compra</b>
          <div id="buildItemOrder" class="build-item-order-list" aria-live="polite"></div>
        </div>
        <input id="buildItems" type="hidden">
        <p id="buildItemsMessage" class="build-items-message" role="status"></p>
      </div>
      <label class="community-form-wide">Quando usar / observações <span>Opcional</span><textarea id="buildNotes" maxlength="350" rows="3" placeholder="Composição, matchup ou momento para adaptar os itens"></textarea></label>
      <div class="community-form-footer"><p>Compartilhe sua própria configuração, sem dados pessoais nem conteúdo copiado. Seu nome público aparece como autor; perfis privados são identificados como “Jogador da comunidade”.</p><button type="submit">Publicar build</button></div>
    </form>
  </section>
</main>

<dialog id="buildDetailDialog" class="build-detail-dialog" aria-labelledby="buildDetailTitle">
  <article id="buildDetailContent"></article>
</dialog>
"""

# --- CONTEÚDO DO META.JSON ---
json_meta = """[
 {
  "id": 1,
  "author": "campos",
  "lane": "Roam",
  "hero": "Khufra",
  "tier": "S",
  "patch": "S42",
  "notes": "Forte em todos os elos e adaptavel a todas as composições",
  "created_at": 1790957152.17167,
  "helpful": 3,
  "not_helpful": 0
 }
]
"""

# --- CONTEÚDO DO BUILDS.JSON ---
json_builds = """[
 {
  "id": 1,
  "author": "campos",
  "hero": "Chou",
  "lane": "EXP",
  "patch": "S42",
  "spell": "Flash",
  "emblem": "Assassino - ignição letal",
  "items": "[\\"Botas Ligeiras\\", \\"Lâmina das Heptaseas\\", \\"Lâmina da Desespero\\", \\"Batalha Infinita\\", \\"Rugido do Maléfico\\", \\"Imortalidade\\"]",
  "notes": "Confia no pai",
  "created_at": 1790957480.3038,
  "helpful": 2,
  "not_helpful": 0
 }
]
"""

# Escreve os arquivos
(base / "site-antigo" / "views" / "meta.html").write_text(html_meta, encoding="utf-8")
print("Criado: site-antigo/views/meta.html")

(base / "site-antigo" / "views" / "builds.html").write_text(html_builds, encoding="utf-8")
print("Criado: site-antigo/views/builds.html")

(base / "conteudo" / "meta.json").write_text(json_meta, encoding="utf-8")
print("Criado: conteudo/meta.json")

(base / "conteudo" / "builds.json").write_text(json_builds, encoding="utf-8")
print("Criado: conteudo/builds.json")

print("\nTodos os arquivos foram criados e configurados com sucesso!")