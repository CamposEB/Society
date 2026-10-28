/* topbar.js: comportamento do header (menus suspensos, teclado, aba ativa).
   Não depende do app.js. A navegação em si continua nos handlers de
   [data-shortcut] que já existem; aqui só há um fallback caso nenhum
   deles troque de aba. */
(() => {
  "use strict";

  const nav = document.getElementById("topbarNav");
  if (!nav) return;

  const HOVER_OPEN_DELAY = 70;   // evita abrir menu ao só atravessar a barra
  const HOVER_CLOSE_DELAY = 160; // tolerância para o mouse ir do botão ao menu
  const TAB_ALIAS = { hero: "heroes" }; // seção #tab-hero destaca o item "heroes"

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const isDesktop = window.matchMedia("(min-width: 900px)");
  const timers = new Map();

  // Só entram itens que realmente têm botão + menu (links simples são ignorados).
  const items = [...nav.querySelectorAll(".tb-item")].filter(
    item => item.querySelector(".tb-trigger") && item.querySelector(".tb-menu")
  );

  const trigger = item => item.querySelector(".tb-trigger");
  const menu = item => item.querySelector(".tb-menu");
  const isOpen = item => trigger(item).getAttribute("aria-expanded") === "true";
  const clearTimer = item => { clearTimeout(timers.get(item)); timers.delete(item); };

  /* Se o menu abriria para fora da janela, alinha pela borda direita. */
  function placePanel(item) {
    const panel = menu(item);
    panel.classList.remove("tb-menu--end");
    if (panel.getBoundingClientRect().right > window.innerWidth - 8) {
      panel.classList.add("tb-menu--end");
    }
  }

  function open(item) {
    clearTimer(item);
    items.forEach(other => { if (other !== item) close(other); });
    if (isOpen(item)) return;
    menu(item).hidden = false;
    trigger(item).setAttribute("aria-expanded", "true");
    placePanel(item);
  }

  function close(item, restoreFocus) {
    clearTimer(item);
    if (!isOpen(item)) return;
    menu(item).hidden = true;
    trigger(item).setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger(item).focus();
  }

  const closeAll = () => items.forEach(item => close(item));

  /* Foco por teclado visível dentro do item? (não fecha por mouseleave nesse caso) */
  const hasKeyboardFocus = item => {
    const active = document.activeElement;
    return !!active && item.contains(active) && active.matches(":focus-visible");
  };

  items.forEach((item, index) => {
    const btn = trigger(item);
    const panel = menu(item);
    const entries = () => [...panel.querySelectorAll("button:not(:disabled)")];

    // ARIA de disclosure: garante os atributos mesmo que o HTML não os tenha.
    if (!panel.id) panel.id = "tbMenu" + index;
    btn.setAttribute("aria-controls", panel.id);
    btn.setAttribute("aria-haspopup", "true");
    if (!btn.hasAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
    panel.hidden = !isOpen(item);

    const focusSibling = step => {
      const next = items[(items.indexOf(item) + step + items.length) % items.length];
      if (next === item) return;
      if (isOpen(item)) open(next); // navegando com um menu aberto, o próximo abre junto
      trigger(next).focus();
    };

    btn.addEventListener("click", event => {
      // detail === 0: clique vindo do teclado (Enter/Espaço) alterna normalmente.
      // Com mouse em tela com hover, o menu já abriu ao passar; o clique não fecha.
      if (isOpen(item) && (event.detail === 0 || !canHover.matches)) close(item);
      else open(item);
    });

    btn.addEventListener("keydown", event => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          open(item);
          entries()[0]?.focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          open(item);
          entries().at(-1)?.focus();
          break;
        case "ArrowRight":
          event.preventDefault();
          focusSibling(1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          focusSibling(-1);
          break;
        case "Escape":
          close(item, true);
          break;
      }
    });

    panel.addEventListener("keydown", event => {
      const list = entries();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      switch (event.key) {
        case "ArrowDown": event.preventDefault(); list[(i + 1) % list.length].focus(); break;
        case "ArrowUp":   event.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); break;
        case "Home":      event.preventDefault(); list[0].focus(); break;
        case "End":       event.preventDefault(); list.at(-1).focus(); break;
        case "Escape":    event.preventDefault(); close(item, true); break;
      }
    });

    // Escolher uma opção fecha o menu; com teclado, devolve o foco ao botão
    // (senão o foco se perde, já que o botão focado some junto com o menu).
    panel.addEventListener("click", event => {
      if (event.target.closest("button")) close(item, event.detail === 0);
    });

    item.addEventListener("mouseenter", () => {
      if (!canHover.matches) return;
      clearTimer(item);
      if (isOpen(item)) return;
      // Já existe outro menu aberto: troca na hora. Senão, espera um instante.
      if (items.some(isOpen)) open(item);
      else timers.set(item, setTimeout(() => open(item), HOVER_OPEN_DELAY));
    });

    item.addEventListener("mouseleave", () => {
      if (!canHover.matches) return;
      clearTimer(item);
      if (!isOpen(item) || hasKeyboardFocus(item)) return;
      timers.set(item, setTimeout(() => close(item), HOVER_CLOSE_DELAY));
    });

    // Tab para fora do menu fecha
    item.addEventListener("focusout", event => {
      if (event.relatedTarget && !item.contains(event.relatedTarget)) close(item);
    });
  });

  document.addEventListener("pointerdown", event => {
    if (!nav.contains(event.target)) closeAll();
  });
  // Escape também fecha menus abertos por hover (quando o foco está fora deles).
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && items.some(isOpen)) closeAll();
  });
  window.addEventListener("blur", closeAll);
  // Mudou de largura ou de tipo de ponteiro: não deixa menu aberto "órfão".
  isDesktop.addEventListener("change", closeAll);
  canHover.addEventListener("change", closeAll);
  window.addEventListener("resize", () => {
    const openItem = items.find(isOpen);
    if (openItem) placePanel(openItem);
  });

  /* ---------- Navegação (fallback) ---------- */
  const tabIsOn = name => !!document.getElementById("tab-" + name)?.classList.contains("on");

  function goTab(name) {
    const side = document.querySelector('#nav button[data-t="' + name + '"]');
    if (side) { side.click(); return; }
    if (typeof window.tab === "function") window.tab(name);
  }

  nav.addEventListener("click", event => {
    const btn = event.target.closest("[data-shortcut]");
    if (!btn) return;
    closeAll();
    const want = btn.dataset.tab || (btn.dataset.shortcut === "winrate" ? "tools" : "");
    if (!want) return;
    // O onclick do próprio botão já rodou (o evento só chega aqui depois, ao borbulhar).
    // O timeout 0 apenas espera o fim do dispatch; se a aba não mudou, navega aqui.
    setTimeout(() => { if (!tabIsOn(want)) goTab(want); }, 0);
  });

  /* ---------- Destaque da aba ativa ---------- */
  function syncActive() {
    const current = document.querySelector("section.tab.on");
    const raw = current ? current.id.replace(/^tab-/, "") : "";
    const name = TAB_ALIAS[raw] || raw;
    nav.querySelectorAll("[data-tab]").forEach(btn => {
      const on = btn.dataset.tab === name;
      btn.classList.toggle("is-active", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    items.forEach(item => {
      trigger(item).classList.toggle("is-active", !!item.querySelector(".tb-menu .is-active"));
    });
  }

  // Observa só as seções (sem subtree), então os class do próprio header não disparam laço.
  const observer = new MutationObserver(syncActive);
  document.querySelectorAll("section.tab").forEach(section =>
    observer.observe(section, { attributes: true, attributeFilter: ["class"] })
  );
  syncActive();

  /* ---------- Rótulo do atalho de busca ---------- */
  const kbd = document.querySelector("#topbarSearch .tb-kbd");
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  if (kbd && /Mac|iPhone|iPad/i.test(platform)) kbd.textContent = "⌘ K";
})();