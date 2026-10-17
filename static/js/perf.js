/* Destiny · modo leve (performance)
   Carregue SÍNCRONO no <head>, ANTES do profile.css:
   <script src="/static/js/perf.js"></script>
   - Define html[data-perf="lite"|"full"] (celular/aparelho fraco = lite)
   - Liga o checkbox "Efeitos animados" da aba Aparência (se existir no HTML) */
(() => {
  const root = document.documentElement;
  const KEY = "perf";
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch {} };
  const mm = (q) => { try { return matchMedia(q).matches; } catch { return false; } };

  const weak = mm("(pointer:coarse)") || mm("(max-width: 820px)")
    || (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const saved = read();
  root.dataset.perf = (saved === "lite" || saved === "full") ? saved : (weak ? "lite" : "full");

  function setMode(mode) {
    root.dataset.perf = mode === "full" ? "full" : "lite";
    write(root.dataset.perf);
    syncToggle();
  }
  function syncToggle() {
    const box = document.querySelector("[data-perf-toggle]");
    if (box) box.checked = root.dataset.perf === "full";
  }
  document.addEventListener("change", (e) => {
    if (e.target && e.target.matches && e.target.matches("[data-perf-toggle]")) {
      setMode(e.target.checked ? "full" : "lite");
    }
  });

  function watchDialog() {
    const dlg = document.getElementById("profileEditor");
    if (!dlg || dlg.dataset.perfWatch) return Boolean(dlg);
    dlg.dataset.perfWatch = "1";
    // form.reset() roda antes do showModal(): sincroniza quando o dialog abre
    new MutationObserver(() => { if (dlg.open) syncToggle(); })
      .observe(dlg, { attributes: true, attributeFilter: ["open"] });
    return true;
  }
  function ready() {
    syncToggle();
    if (!watchDialog()) document.addEventListener("profile:rendered", watchDialog, { once: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();

  window.DestinyPerf = { setMode, mode: () => root.dataset.perf };
})();