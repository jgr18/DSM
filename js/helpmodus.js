/* DSM-werkbank — helpmodus. Klik op "?" en daarna op een onderdeel: help.html opent bij de juiste alinea.
   Esc of nog een klik op "?" stopt de helpmodus. Regels gaan van specifiek naar algemeen. */
(function () {
  'use strict';
  const REGELS = [
    ['.knop-link', 'start'], ['.versie', 'versies'], ['#status', 'verouderd'], ['#knop-analyse', 'analyse-uitvoeren'],
    ['.bestand', 'opslaan'], ['#modelnaam', 'opslaan'], ['#meta', 'versies'],
    ['.groeplabel', 'werkwijze'],
    ['td.tear', 'tear'], ['td.diag.zelf', 'zelfiteratie'], ['td.diag', 'diagonaal'],
    ['td.s-I', 'soort-I'], ['td.s-H', 'soort-H'], ['td.s-B', 'soort-B'], ['td.s-A', 'soort-A'], ['td.fb', 'terugkoppeling'],
    ['td.blok', 'iteratieblok'], ['td.boven', 'terugkoppeling'],
    ['th.blokcel', 'iteratieblok'], ['th.blokkop', 'iteratieblok'], ['table.dsm', 'matrix-lezen'],
    ['[data-zelf]', 'zelfiteratie'], ['[data-uitklap]', 'kenmerken'], ['[data-kenm]', 'kenmerken'],
    ['.tear-item', 'tear-velden'], ['#tear-paneel', 'tear-velden'], ['[data-naar-tear]', 'tear'],
    ['.maat.open', 'tear-regels'], ['.vergelijk-sc', 'vergelijken-basis'],
    ['.scen-kaart', 'scenarios'], ['.kaart-basis', 'scenarios'], ['[data-sc]', 'scenarios'], ['#sc-bron', 'scenarios'], ['#sc-naam', 'scenarios'],
    ['.balk-let', 'verouderd'], ['[data-herbereken]', 'verouderd'],
    ['.label-ok', 'bewezen'], ['.label-let', 'bewezen'], ['ol.uitleg', 'doelvolgorde'], ['dl.gegevens', 'bewezen'],
    ['.maat', 'maten'], ['[data-weergave]', 'weergave'], ['[data-inst]', 'instellingen'],
    ['.blokken', 'iteratieblok'], ['.niveaus', 'parallel'], ['.impact', 'impact'], ['#impact-keus', 'impact'],
    ['#uitlegpaneel', 'soorten-vergelijking'], ['.uitlegpop', 'soorten-vergelijking'], ['.vergelijk', 'soorten-vergelijking'],
    ['[data-greep]', 'activiteiten'], ['#plak', 'activiteiten'], ['#plak-knop', 'activiteiten'], ['#snel', 'activiteiten'], ['#act-rijen', 'activiteiten'],
    ['#mk', 'relaties'], ['#relpaneel', 'relaties'], ['.legenda-hint', 'soorten']
  ];
  const UITLEG = { I: 'soort-I', H: 'soort-H', B: 'soort-B', A: 'soort-A', Z: 'zelfiteratie', T: 'terugkoppeling', K: 'iteratieblok', X: 'tear', M: 'kenmerken' };
  const TAB = { activiteiten: 'activiteiten', relaties: 'relaties', analyse: 'analyse', vergelijking: 'vergelijking', scenarios: 'tears', rapport: 'rapport' };

  let aan = false, doel = null;
  const knop = document.getElementById('knop-helpmodus');
  const balk = document.getElementById('helpbalk');

  function bepaal(el) {
    if (!el || !el.closest) return null;
    const tab = el.closest('.tabs [data-tab]'); if (tab) return { id: TAB[tab.dataset.tab] || 'werkwijze', el: tab };
    const u = el.closest('[data-uitleg]'); if (u) return { id: UITLEG[u.dataset.uitleg] || 'soorten', el: u };
    const s = el.closest('.soorten [data-soort]'); if (s) return { id: s.dataset.soort ? 'soort-' + s.dataset.soort : 'relaties', el: s };
    for (const [sel, id] of REGELS) { const x = el.closest(sel); if (x) return { id, el: x }; }
    const huidig = document.querySelector('.tabs [aria-current="page"]');
    const p = el.closest('.paneel, main');
    return { id: TAB[huidig && huidig.dataset.tab] || 'start', el: p || null };
  }
  function zetDoel(x) {
    if (doel) doel.classList.remove('help-doel');
    doel = x && x.el && x.el !== document.body ? x.el : null;
    if (doel) { doel.classList.add('help-doel'); doel.setAttribute('data-help-titel', 'Uitleg openen'); }
  }
  function zet(waarde) {
    aan = waarde;
    document.body.classList.toggle('helpmodus', aan);
    if (knop) knop.setAttribute('aria-pressed', String(aan));
    if (balk) balk.hidden = !aan;
    if (!aan) zetDoel(null);
  }
  function open(id) {
    const w = window.open('help.html#' + id, 'dsm-help');
    if (w) { try { w.focus(); } catch (e) { /* niets */ } } else location.href = 'help.html#' + id;
  }

  if (knop) knop.addEventListener('click', e => { e.stopPropagation(); zet(!aan); });
  document.addEventListener('keydown', e => { if (aan && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zet(false); } }, true);
  document.addEventListener('mouseover', e => { if (aan && e.target !== knop && !(balk && balk.contains(e.target))) zetDoel(bepaal(e.target)); }, true);
  document.addEventListener('click', e => {
    if (!aan || e.target === knop || (knop && knop.contains(e.target))) return;
    if (balk && balk.contains(e.target)) { if (e.target.closest('[data-help-stop]')) zet(false); return; }
    e.preventDefault(); e.stopPropagation();
    const x = bepaal(e.target); open(x ? x.id : 'start');
  }, true);
  ['pointerdown', 'mousedown', 'change', 'input', 'focusin'].forEach(t => document.addEventListener(t, e => { if (aan && !(balk && balk.contains(e.target)) && e.target !== knop) { e.stopPropagation(); if (t === 'mousedown' || t === 'pointerdown') e.preventDefault(); } }, true));

  window.DSM = window.DSM || {}; window.DSM.helpmodus = { zet, bepaal, aan: () => aan };
})();
