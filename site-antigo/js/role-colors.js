/* /static/js/role-colors.js
   Cores de nome por cargo (DEV, ADM, MOD, BETA) + preferência do jogador.
   Uso: RoleColors.apply(elemento, perfil) — perfil precisa ter `role` e,
   opcionalmente, `name_color` ("role" ou "default"). */
(function () {
  "use strict";

  var ROLES = {
    dev:   { label: "DEV",  className: "role-name-dev",   color: "#ff5d6c" },
    admin: { label: "ADM",  className: "role-name-admin", color: "#f5b942" },
    mod:   { label: "MOD",  className: "role-name-mod",   color: "#3ddc84" },
    beta:  { label: "BETA", className: "role-name-beta",  color: "#7cc4ff" }
  };

  var ALIASES = {
    administrador: "admin", administrator: "admin",
    moderador: "mod", moderator: "mod", moderação: "mod", moderacao: "mod",
    desenvolvedor: "dev", developer: "dev",
    "beta tester": "beta", betatester: "beta", tester: "beta"
  };

  var CLASSES = Object.keys(ROLES).map(function (key) { return ROLES[key].className; });

  function normalize(raw) {
    var key = String(raw || "").toLocaleLowerCase("pt-BR").trim();
    if (!key) return "";
    return ROLES[key] ? key : (ALIASES[key] || "");
  }

  function keyFor(profile) {
    if (!profile) return "";
    var direct = normalize(profile.role);
    if (direct) return direct;
    var roles = Array.isArray(profile.community_roles) ? profile.community_roles : [];
    for (var i = 0; i < roles.length; i++) {
      var key = normalize(roles[i]);
      if (key) return key;
    }
    return "";
  }

  function preference(profile) {
    var pref = String((profile && profile.name_color) || "").toLocaleLowerCase("pt-BR").trim();
    if (pref === "role" || pref === "default") return pref;
    return keyFor(profile) ? "role" : "default";
  }

  function enabled(profile) {
    return preference(profile) === "role" && Boolean(keyFor(profile));
  }

  function apply(element, profile) {
    if (!element) return;
    element.classList.remove("role-name");
    CLASSES.forEach(function (className) { element.classList.remove(className); });
    element.removeAttribute("data-role-name");
    element.style.removeProperty("--role-color");

    var key = keyFor(profile);
    if (!key || !enabled(profile)) return;
    element.classList.add("role-name", ROLES[key].className);
    element.dataset.roleName = key;
    element.style.setProperty("--role-color", ROLES[key].color);
  }

  function label(profileOrRole) {
    var key = typeof profileOrRole === "string" ? normalize(profileOrRole) : keyFor(profileOrRole);
    return key ? ROLES[key].label : "";
  }

  function color(profileOrRole) {
    var key = typeof profileOrRole === "string" ? normalize(profileOrRole) : keyFor(profileOrRole);
    return key ? ROLES[key].color : "";
  }

  window.RoleColors = {
    ROLES: ROLES,
    keyFor: keyFor,
    preference: preference,
    enabled: enabled,
    apply: apply,
    label: label,
    color: color
  };
})();
