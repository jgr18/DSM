/* DSM-werkbank — schermen en bediening. */
(function () {
  'use strict';
  const M = DSM.model, AN = DSM.analyse, SOORTEN = DSM.SOORTEN;
  const $ = sel => document.querySelector(sel);
  const inhoud = $('#inhoud');

  let m = M.laadLokaal() || M.leegModel();
  const ui = { tab: 'activiteiten', sel: null, kenmerkenOpen: false, weergave: 'voorgesteld', analyseSel: null, impactId: null };

  /* ---------- hulpfuncties ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const act = id => M.vind(m, id);
  const naam = id => (act(id) || { naam: '(verwijderd)' }).naam;
  const relSleutel = (van, naar) => van + '>' + naar;
  function relKaart() { const k = {}; m.relaties.forEach(r => { k[relSleutel(r.van, r.naar)] = r; }); return k; }
  const heeftKenmerk = r => !!(r.zekerheid || r.frequentie || r.bron);

  function bewaar() {
    if (!M.bewaarLokaal(m)) toonFouten([{ bron: 'Browseropslag', melding: 'Het model kon niet in de browser worden bewaard.', herstel: 'Gebruik "Opslaan" om een modelbestand te maken.' }]);
  }
  function na(wijziging) { bewaar(); renderKop(); return wijziging; }

  /* ---------- meldingen ---------- */
  function toonFouten(fouten, titel) {
    if (!fouten || !fouten.length) return;
    $('#meldingen').innerHTML = '<div class="melding fout" role="alert"><div><strong>' + esc(titel || (fouten.length === 1 ? 'Er ging iets mis' : fouten.length + ' problemen gevonden')) + '</strong><ul>' +
      fouten.map(f => '<li><b>' + esc(f.bron) + ':</b> ' + esc(f.melding) + (f.herstel ? ' <b>Herstel:</b> ' + esc(f.herstel) : '') + '</li>').join('') +
      '</ul></div><button aria-label="Melding sluiten" data-sluit>×</button></div>';
  }
  function toonOk(tekst) {
    $('#meldingen').innerHTML = '<div class="melding ok" role="status"><div>' + esc(tekst) + '</div><button aria-label="Melding sluiten" data-sluit>×</button></div>';
  }
  function wisMeldingen() { $('#meldingen').innerHTML = ''; }
  $('#meldingen').addEventListener('click', e => { if (e.target.hasAttribute('data-sluit')) wisMeldingen(); });

  /* ---------- kop en tabs ---------- */
  function renderKop() {
    $('#modelnaam').value = m.naam;
    $('#meta').textContent = 'Invoerversie ' + m.invoerversie + ' · ' + m.activiteiten.length + ' activiteiten · ' + m.relaties.length + ' relaties';
    const s = M.analyseStatus(m), el = $('#status');
    el.className = 'status ' + s.status; el.textContent = s.tekst;
  }
  function renderTabs() {
    document.querySelectorAll('.tabs button').forEach(b => {
      if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  function render() {
    renderKop(); renderTabs();
    ({ activiteiten: renderActiviteiten, relaties: renderRelaties, analyse: renderAnalyse, vergelijking: renderVergelijking, scenarios: renderScenarios, rapport: renderRapport })[ui.tab]();
  }
  function naarTab(tab) { ui.tab = tab; wisMeldingen(); render(); window.scrollTo(0, 0); }

  document.querySelector('.tabbalk').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) naarTab(b.dataset.tab); });
  $('#modelnaam').addEventListener('change', e => { m.naam = e.target.value.trim() || 'Naamloos model'; m.invoerversie++; na(); });

  /* ---------- bestand ---------- */
  function heeftInhoud() { return m.activiteiten.length > 0; }
  function laadModel(nieuw, melding) {
    m = nieuw; ui.sel = null; ui.analyseSel = null; ui.impactId = null;
    M.bewaarLokaal(m); ui.tab = 'activiteiten'; render(); if (melding) toonOk(melding);
  }
  document.querySelector('.bestand').addEventListener('click', e => {
    const b = e.target.closest('[data-actie]'); if (!b) return;
    const a = b.dataset.actie;
    if (a === 'nieuw') {
      if (heeftInhoud() && !confirm('Een nieuw, leeg model beginnen? Sla het huidige model eerst op als je het wilt bewaren.')) return;
      laadModel(M.leegModel(), 'Nieuw leeg model gestart.');
    } else if (a === 'voorbeeld') {
      if (heeftInhoud() && !confirm('Het voorbeeldmodel laden? Het huidige model wordt vervangen; sla het eerst op als je het wilt bewaren.')) return;
      laadModel(M.normaliseer(JSON.parse(JSON.stringify(DSM.voorbeeld))), 'Voorbeeldmodel geladen: 12 activiteiten en 19 relaties.');
    } else if (a === 'openen') {
      $('#bestandkiezer').click();
    } else if (a === 'opslaan') {
      const blob = new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = (m.naam || 'model').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '_v' + m.invoerversie + '.json';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      toonOk('Modelbestand opgeslagen (invoerversie ' + m.invoerversie + ').');
    }
  });
  $('#bestandkiezer').addEventListener('change', e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const lezer = new FileReader();
    lezer.onload = () => {
      let data;
      try { data = JSON.parse(lezer.result); }
      catch (err) { toonFouten([{ bron: f.name, melding: 'Het bestand is geen geldige JSON (' + err.message + ').', herstel: 'Open een bestand dat met "Opslaan" is gemaakt, of herstel de opmaak.' }]); return; }
      const fouten = M.valideer(data).map(x => Object.assign(x, { bron: x.bron.replace('Modelbestand', f.name) }));
      if (fouten.length) { toonFouten(fouten, 'Model niet geopend'); return; }
      if (heeftInhoud() && !confirm('Het huidige model vervangen door "' + f.name + '"?')) return;
      laadModel(M.normaliseer(data), 'Model geopend: ' + f.name);
    };
    lezer.readAsText(f);
  });

  /* ---------- analyse uitvoeren ---------- */
  $('#knop-analyse').addEventListener('click', voerAnalyseUit);
  function voerAnalyseUit() {
    if (!m.activiteiten.length) { toonFouten([{ bron: 'Activiteiten', melding: 'Er zijn nog geen activiteiten.', herstel: 'Voeg activiteiten toe op het tabblad Activiteiten.' }]); return; }
    const knop = $('#knop-analyse'); knop.disabled = true; knop.textContent = 'Bezig…';
    setTimeout(() => {
      m.analyse = AN.analyseer(m);
      knop.disabled = false; knop.textContent = 'Analyse uitvoeren';
      bewaar(); ui.tab = 'analyse'; ui.weergave = 'voorgesteld'; ui.analyseSel = null; render();
      toonOk('Analyse uitgevoerd in ' + m.analyse.rekentijdMs + ' ms op invoerversie ' + m.analyse.invoerversie + '.');
    }, 20);
  }

  /* ================= ACTIVITEITEN ================= */
  function renderActiviteiten() {
    const rel = m.relaties;
    const rijen = m.activiteiten.map((a, i) => {
      const inn = rel.filter(r => r.naar === a.id).map(r => r.van).join(' ') || '—';
      const uit = rel.filter(r => r.van === a.id).map(r => r.naar).join(' ') || '—';
      return '<tr data-id="' + a.id + '" data-zoek="' + esc((a.id + ' ' + a.naam + ' ' + a.eigenaar).toLowerCase()) + '">' +
        '<td class="num klein">' + (i + 1) + '</td><td class="mono"><b>' + a.id + '</b></td>' +
        '<td><label class="verborgen" for="n-' + a.id + '">Naam ' + a.id + '</label><input id="n-' + a.id + '" data-veld="naam" data-id="' + a.id + '" value="' + esc(a.naam) + '"></td>' +
        '<td><label class="verborgen" for="e-' + a.id + '">Verantwoordelijke ' + a.id + '</label><input id="e-' + a.id + '" data-veld="eigenaar" data-id="' + a.id + '" value="' + esc(a.eigenaar) + '" placeholder="—"></td>' +
        '<td class="mono klein">' + inn + '</td><td class="mono klein">' + uit + '</td>' +
        '<td class="rechts"><button class="knop klein-k" data-act="op" data-id="' + a.id + '" aria-label="' + a.id + ' omhoog">↑</button> ' +
        '<button class="knop klein-k" data-act="neer" data-id="' + a.id + '" aria-label="' + a.id + ' omlaag">↓</button> ' +
        '<button class="knop klein-k gevaar" data-act="weg" data-id="' + a.id + '" aria-label="' + a.id + ' verwijderen">✕</button></td></tr>';
    }).join('');
    inhoud.innerHTML =
      '<section class="kolom smal">' +
        '<div class="paneel"><h2>Snel toevoegen of plakken</h2>' +
        '<p class="uitleg">Eén activiteit per regel: alleen een naam, of <span class="mono">naam ⇥ verantwoordelijke</span>. Plakken uit Excel werkt direct (tab of puntkomma). Nieuwe ID\'s worden automatisch uitgegeven en nooit hergebruikt.</p>' +
        '<label class="veld">Regels<textarea id="plak" rows="8" class="mono" placeholder="Klanteisen vastleggen&#9;Productmanager&#10;Conceptontwerp&#9;Ontwerp"></textarea></label>' +
        '<div class="rij"><button class="knop primair" id="plak-knop">Controleren en toevoegen</button><button class="knop" id="plak-wis">Wissen</button></div></div>' +
        '<div class="paneel"><p class="klein"><b>Volgorde</b> in deze lijst is de oorspronkelijke procesvolgorde; de analyse vergelijkt daarmee. <b>Verwijderen</b> toont eerst welke relaties vervallen; de ID blijft gereserveerd.</p>' +
        (m.activiteiten.length ? '' : '<p class="klein">Nog leeg? Kies <b>Voorbeeld</b> rechtsboven om met een voorbeeldmodel te beginnen.</p>') + '</div>' +
      '</section>' +
      '<section class="paneel breed"><div class="rij tussen"><div><h2>Activiteiten</h2><span class="klein">' + m.activiteiten.length + ' activiteiten</span></div>' +
        '<label class="rij klein">Zoeken <input id="zoek" type="search" placeholder="ID, naam of verantwoordelijke"></label></div>' +
        '<div class="tabelkader"><table class="lijst"><thead><tr><th class="num">Volg.</th><th>ID</th><th>Activiteit</th><th>Verantwoordelijke</th><th>Ontvangt van</th><th>Levert aan</th><th class="rechts">Acties</th></tr></thead>' +
        '<tbody id="act-rijen">' + rijen + '</tbody><tfoot><tr><td></td><td class="mono klein">' + M.maakId(m.volgendeNummer) + '</td><td colspan="5"><label class="verborgen" for="snel">Nieuwe activiteit</label><input id="snel" placeholder="Typ een naam en druk Enter"></td></tr></tfoot></table></div>' +
      '</section>';
  }

  function verwerkPlak(tekst) {
    const res = M.plakActiviteiten(m, tekst);
    na();
    renderActiviteiten();
    if (res.fouten.length) toonFouten(res.fouten, res.toegevoegd.length + ' toegevoegd, ' + res.fouten.length + ' regel(s) niet toegevoegd');
    else if (res.toegevoegd.length) toonOk(res.toegevoegd.length + ' activiteit(en) toegevoegd: ' + res.toegevoegd.join(', ') + '.');
    return res;
  }

  inhoud.addEventListener('click', e => {
    if (ui.tab === 'activiteiten') {
      if (e.target.id === 'plak-knop') { const tekst = $('#plak').value; const res = verwerkPlak(tekst); const regels = tekst.split(/\r?\n/); $('#plak').value = res.fouten.map(f => regels[f.regel]).join('\n'); return; }
      if (e.target.id === 'plak-wis') { $('#plak').value = ''; return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.act === 'op' || b.dataset.act === 'neer') {
        M.verplaatsActiviteit(m, id, b.dataset.act === 'op' ? -1 : 1); na(); renderActiviteiten();
        const nb = inhoud.querySelector('[data-act="' + b.dataset.act + '"][data-id="' + id + '"]'); if (nb) nb.focus();
      } else if (b.dataset.act === 'weg') {
        const rel = M.relatiesVan(m, id);
        const tekst = 'Activiteit ' + id + ' "' + naam(id) + '" verwijderen?' + (rel.length ? '\n\nDeze ' + rel.length + ' relatie(s) vervallen ook:\n' + rel.map(r => r.van + ' → ' + r.naar).join('\n') : '') + '\n\nDe ID ' + id + ' wordt niet opnieuw uitgegeven.';
        if (!confirm(tekst)) return;
        M.verwijderActiviteit(m, id); if (ui.sel && (ui.sel.van === id || ui.sel.naar === id)) ui.sel = null;
        na(); renderActiviteiten(); toonOk('Activiteit ' + id + ' verwijderd' + (rel.length ? ' met ' + rel.length + ' relatie(s)' : '') + '.');
      }
    }
  });
  inhoud.addEventListener('change', e => {
    const t = e.target;
    if (ui.tab === 'activiteiten' && t.dataset.veld) {
      const fout = M.wijzigActiviteit(m, t.dataset.id, t.dataset.veld, t.value);
      if (fout) { toonFouten([fout]); t.value = act(t.dataset.id).naam; return; }
      na();
    }
  });
  inhoud.addEventListener('keydown', e => {
    if (ui.tab === 'activiteiten' && e.target.id === 'snel' && e.key === 'Enter') {
      e.preventDefault();
      const v = e.target.value.trim(); if (!v) return;
      verwerkPlak(v); const s = $('#snel'); if (s) s.focus();
    }
  });
  inhoud.addEventListener('input', e => {
    if (ui.tab === 'activiteiten' && e.target.id === 'zoek') {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#act-rijen tr').forEach(tr => { tr.style.display = !q || tr.dataset.zoek.includes(q) ? '' : 'none'; });
    }
  });

  /* ================= MATRIX (gedeeld) ================= */
  /* Bouwt een DSM-tabel. Rij = ontvanger, kolom = leverancier.
     Rijen en kolommen krijgen een volgnummer (1, 2, 3 …) in de getoonde volgorde. */
  function bouwMatrix(volgorde, opties) {
    const kaart = relKaart(), o = opties || {};
    const blokVan = o.blokVan || {}, grootBlok = o.grootBlok || {};
    const vijf = k => (k % 5 === 4 && k < volgorde.length - 1);
    let h = '<table class="dsm' + (o.blokKolom ? ' met-blok' : '') + '"><thead><tr>' +
      (o.blokKolom ? '<th class="blokkop">Blok</th>' : '') +
      '<th class="hoek">ontvanger ↓ · leverancier →</th>' +
      volgorde.map((id, j) => '<th scope="col" data-j="' + j + '" class="' + (vijf(j) ? 'vijf-k' : '') + '" title="' + esc((j + 1) + ' · ' + id + ' ' + naam(id)) + '">' + (j + 1) + '</th>').join('') + '</tr></thead><tbody>';
    volgorde.forEach((r, i) => {
      const rb = blokVan[r], rGroot = rb && grootBlok[rb];
      h += '<tr' + (vijf(i) ? ' class="vijf-r"' : '') + '>';
      if (o.blokKolom) h += '<th class="blokcel' + (rGroot ? ' blok' : '') + '">' + (rb || '') + '</th>';
      h += '<th scope="row" class="naamcel' + (rGroot ? ' blok' : '') + '" data-i="' + i + '" title="' + esc((i + 1) + ' · ' + r + ' ' + naam(r) + (act(r) && act(r).eigenaar ? ' · ' + act(r).eigenaar : '')) + '"><span class="nr">' + (i + 1) + '</span><span class="id">' + r + '</span>' + esc(naam(r)) + '</th>';
      volgorde.forEach((c, j) => {
        let klas = '', txt = '', titel = '';
        if (r === c) {
          klas = 'diag'; txt = String(i + 1); titel = (i + 1) + ' · ' + r + ' ' + naam(r);
          if (m.zelfiteraties.includes(r)) { klas += ' zelf'; txt = '↻'; titel += ' · zelfiteratie'; }
        } else {
          const rel = kaart[relSleutel(c, r)];
          if (rel) {
            klas = 's-' + rel.soort; txt = rel.soort;
            if (o.markeerTerug && j > i) klas += ' fb';
            if (o.kenmerkStip && heeftKenmerk(rel)) klas += ' kenm';
            titel = r + ' heeft informatie nodig van ' + c + ' (' + SOORTEN[rel.soort].kort + ')' + (rel.info ? ': ' + rel.info : '');
          } else if (rGroot && blokVan[c] === rb) klas = 'blok';
          else if (o.markeerTerug && j > i) klas = 'boven';
        }
        if (vijf(j)) klas += ' vijf-k';
        h += '<td data-i="' + i + '" data-j="' + j + '" class="' + klas.trim() + '"' + (titel ? ' title="' + esc(titel) + '"' : '') + '>' + txt + '</td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }

  function celEl(tabel, i, j) { return tabel.querySelector('td[data-i="' + i + '"][data-j="' + j + '"]'); }
  function rijKop(tabel, i) { return tabel.querySelector('tbody th.naamcel[data-i="' + i + '"]'); }
  function kolomKop(tabel, j) { return tabel.querySelector('thead th[data-j="' + j + '"]'); }

  /* Licht de kolomkop, de rij van de ontvanger én de rij van de leverancier op,
     zodat je bij een kolomnummer meteen de naam van de activiteit ziet. */
  function zetKoppen(tabel, i, j, klas) {
    const rol = klas === 'gekozen-kop';
    tabel.querySelectorAll('.' + klas).forEach(x => { x.classList.remove(klas); if (rol) x.classList.remove('lev', 'ontv'); });
    if (i == null) return;
    const kol = kolomKop(tabel, j); if (kol) kol.classList.add(klas);
    const ro = rijKop(tabel, i); if (ro) { ro.classList.add(klas); if (rol && i !== j) ro.classList.add('ontv'); }
    const rl = rijKop(tabel, j); if (rl && i !== j) { rl.classList.add(klas); if (rol) rl.classList.add('lev'); }
  }
  function markeerSelectie(tabel, i, j) {
    if (!tabel) return;
    tabel.querySelectorAll('td.gekozen').forEach(x => x.classList.remove('gekozen'));
    zetKoppen(tabel, i, j, 'gekozen-kop');
    if (i == null) return;
    const td = celEl(tabel, i, j); if (td) { td.classList.add('gekozen'); td.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function markeerWijzen(tabel, i, j) {
    tabel.querySelectorAll('td.aangewezen').forEach(x => x.classList.remove('aangewezen'));
    zetKoppen(tabel, i, j, 'wijs-kop');
    if (i == null) return;
    const td = celEl(tabel, i, j); if (td && !td.classList.contains('gekozen')) td.classList.add('aangewezen');
  }

  /* Punt 7: celgrootte groeit mee met de beschikbare ruimte (tussen 22 en 40 px). */
  function pasCelAan(kader) {
    const tabel = kader && kader.querySelector('table.dsm'); if (!tabel) return;
    const n = tabel.tHead.rows[0].querySelectorAll('th[data-j]').length; if (!n) return;
    let labels = 0; tabel.tHead.rows[0].querySelectorAll('th:not([data-j])').forEach(th => { labels += th.offsetWidth; });
    const ruimte = kader.clientWidth - labels - 2;
    const cel = Math.max(22, Math.min(40, Math.floor(ruimte / n)));
    tabel.style.setProperty('--cel', cel + 'px');
    tabel.style.setProperty('--celtekst', (cel >= 34 ? 13 : cel >= 28 ? 12 : 11) + 'px');
  }
  /* Punt 1: kader om elk iteratieblok dat in de getoonde volgorde aaneengesloten staat. */
  function tekenBlokkaders(kader, volg, blokken) {
    kader.querySelectorAll('.blokkader').forEach(x => x.remove());
    const tabel = kader.querySelector('table.dsm'); if (!tabel || !blokken) return;
    blokken.filter(b => b.leden.length > 1).forEach(b => {
      const pos = b.leden.map(id => volg.indexOf(id)).filter(x => x >= 0).sort((x, y) => x - y);
      if (!pos.length || pos[pos.length - 1] - pos[0] !== pos.length - 1) return; // niet aaneengesloten: alleen tint
      const a = celEl(tabel, pos[0], pos[0]), z = celEl(tabel, pos[pos.length - 1], pos[pos.length - 1]); if (!a || !z) return;
      const d = document.createElement('div'); d.className = 'blokkader'; d.title = b.id + ' · iteratieblok';
      const x0 = tabel.offsetLeft + a.offsetLeft, y0 = tabel.offsetTop + a.offsetTop;
      d.style.left = (x0 - 1) + 'px'; d.style.top = (y0 - 1) + 'px';
      d.style.width = (z.offsetLeft + z.offsetWidth - a.offsetLeft + 2) + 'px';
      d.style.height = (z.offsetTop + z.offsetHeight - a.offsetTop + 2) + 'px';
      kader.appendChild(d);
    });
  }
  let naRender = null;
  function richtMatrixIn(kader, volg, blokken) {
    if (!kader) return;
    pasCelAan(kader); tekenBlokkaders(kader, volg, blokken);
    naRender = () => { pasCelAan(kader); tekenBlokkaders(kader, volg, blokken); };
  }
  let rsz = null;
  window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { if (naRender && document.body.contains(document.querySelector('.matrixkader'))) naRender(); }, 80); });

  /* Aanwijzen met de muis (beide matrixen). */
  inhoud.addEventListener('mouseover', e => {
    const td = e.target.closest('.matrixkader td'); if (!td) return;
    markeerWijzen(td.closest('table'), +td.dataset.i, +td.dataset.j);
  });
  inhoud.addEventListener('mouseout', e => {
    const kader = e.target.closest('.matrixkader'); if (!kader) return;
    if (!e.relatedTarget || !kader.contains(e.relatedTarget) || !e.relatedTarget.closest('td')) { const t = kader.querySelector('table'); if (t) markeerWijzen(t, null); }
  });

  /* ================= RELATIES ================= */
  function relVolgorde() { return m.activiteiten.map(a => a.id); }

  function renderRelaties() {
    if (!m.activiteiten.length) { inhoud.innerHTML = '<section class="paneel breed leeg-staat">Voeg eerst activiteiten toe op het tabblad <b>Activiteiten</b>.</section>'; return; }
    const zonderInfo = m.relaties.filter(r => !r.info).length;
    inhoud.innerHTML =
      '<section class="paneel breed"><div class="rij tussen"><div><h2>Relaties vastleggen in de matrix</h2>' +
      '<p class="uitleg">Klik in de rij van de <b>ontvanger</b> op de kolom van de <b>leverancier</b>. Lege cel = geen relatie. Een <b>zelfiteratie</b> zet je aan of uit met de <b>spatiebalk</b> op een grijs vakje van de diagonaal.</p></div></div>' +
      legenda(false) +
      '<div class="matrixkader" id="mk" tabindex="0" aria-label="Relatiematrix. Pijltjes verplaatsen, I H B A kiest soort, Delete wist, Enter gaat naar de volgende cel.">' + bouwMatrix(relVolgorde(), { kenmerkStip: true }) + '</div>' +
      '<p class="klein">Toetsenbord (klik eerst in de matrix): pijltjes = cel verplaatsen · I / H / B / A = soort · Delete of 0 = geen relatie · Enter = volgende cel in de rij · <b>spatiebalk</b> op de diagonaal = zelfiteratie aan/uit</p></section>' +
      '<aside class="kolom smal"><div class="paneel" id="relpaneel"></div><div class="paneel uitlegpaneel" id="uitlegpaneel" aria-live="polite">' + uitlegStandaard() + '</div>' +
      '<div class="paneel"><div class="rij tussen"><span>Relaties</span><b id="tel-rel">' + m.relaties.length + '</b></div><div class="rij tussen"><span>Zonder informatie-omschrijving</span><b id="tel-info">' + zonderInfo + '</b></div>' +
      '<p class="klein">De DSM analyse rekent met precies deze gegevens.</p></div></aside>';
    if (ui.sel && (!act(ui.sel.van) || !act(ui.sel.naar))) ui.sel = null;
    if (ui.sel) { const v = relVolgorde(); markeerSelectie($('#mk table'), v.indexOf(ui.sel.naar), v.indexOf(ui.sel.van)); }
    richtMatrixIn($('#mk'), relVolgorde(), null);
    renderRelPaneel();
  }

  /* ---------- uitleg bij de relatiesoorten (en de overige legenda-items) ---------- */
  const UITLEG = {
    I: { wat: 'De ontvanger heeft gegevens of een resultaat van de leverancier nodig om zijn werk goed te kunnen doen. Zonder die informatie beginnen kan wel, maar dan is de kans groot dat er later werk opnieuw moet.',
         analyse: 'Staat de leverancier later in de volgorde, dan is dit een terugkoppeling. De optimalisatie maakt het aantal en de lengte daarvan zo klein mogelijk.' },
    H: { wat: 'De ontvanger kan pas beginnen als de leverancier klaar is. Er is geen omweg: het is een fysieke, technische of formele voorwaarde. Voorbeeld: een prototype testen kan pas als het gebouwd is.',
         analyse: 'Hoogste prioriteit: de leverancier komt altijd eerst. Een kring van alleen harde voorwaarden kan niet en wordt gemeld als tegenspraak.' },
    B: { wat: 'De leverancier legt grenzen of eisen vast die het werk van de ontvanger beschermen, bijvoorbeeld veiligheids-, kwaliteits- of normeisen. De ontvanger kan werken, maar moet binnen die grenzen blijven. Verandert de leverancier iets, dan controleert de ontvanger of zijn resultaat nog klopt.',
         analyse: 'Telt in deze versie als een gewone afhankelijkheid, net als Informatie.' },
    A: { wat: 'Net als bij Informatie heeft de ontvanger deze informatie nodig. Staat de leverancier eerder in de volgorde, dan wacht je gewoon op de echte informatie en verandert er niets. Het verschil telt pas als de relatie een terugkoppeling wordt: de ontvanger moet dan beginnen vóórdat de leverancier klaar is. Met A leg je vooraf vast dat dat mag, met een zo goed mogelijke aanname die later wordt gecontroleerd.',
         analyse: 'Telt nu als een gewone afhankelijkheid. Bij Scenario\'s & tears (volgende versie) zijn dit de terugkoppelingen die je het eerst bewust kunt doorbreken.' },
    Z: { titel: 'Zelfiteratie', chip: '<span class="chip zelf">↻</span>',
         wat: 'De activiteit is zelf een lus: ze gebruikt haar eigen uitkomst als nieuwe invoer, en vooraf weet je niet hoeveel rondes het worden. Voorbeelden: testen, aanpassen en opnieuw testen; berekenen en optimaliseren. Een taak die alleen lang duurt, is geen zelfiteratie. Loopt de lus via een andere activiteit (bijvoorbeeld een akkoord van de klant), leg dan relaties tussen die activiteiten vast.',
         analyse: 'Verandert de volgorde niet, maar reken bij deze activiteit op herhaling en een onzekere doorlooptijd.',
         hoe: 'Klik het grijze vakje van de activiteit op de diagonaal en druk op de <b>spatiebalk</b> (of gebruik de knop rechts). Nog een keer drukken haalt de zelfiteratie weg.' },
    T: { titel: 'Terugkoppeling', chip: '<span class="chip fbm"></span>',
         wat: 'Een relatie boven de diagonaal: de ontvanger staat vóór de leverancier in de volgorde. De ontvanger moet dus beginnen zonder de informatie, en kan later moeten herstellen.',
         analyse: 'De optimalisatie probeert zo min mogelijk en zo kort mogelijke terugkoppelingen over te houden.' },
    K: { titel: 'Iteratieblok', chip: '<span class="chip blokm"></span>',
         wat: 'Een groep activiteiten die via een kring van relaties van elkaar afhangen. Geen van hen kan helemaal eerst. Het kader in de matrix laat zien waar het blok staat.',
         analyse: 'Gevonden met het algoritme van Tarjan. Binnen het blok wordt de beste volgorde gezocht. Het is geen advies om de activiteiten samen te voegen.' },
    M: { titel: 'Aanvullende kenmerken', chip: '<span class="chip" style="border:1px solid #C9C9C4;position:relative"><span style="position:absolute;right:1px;top:1px;width:5px;height:5px;border-radius:50%;background:#1F2328"></span></span>',
         wat: 'Bij deze relatie zijn zekerheid, frequentie of bron ingevuld.', analyse: 'Deze kenmerken tellen niet mee in de optimalisatie; ze zijn voor de controleerbaarheid.' }
  };
  const VERGELIJK_KOP = 'Moet de ontvanger beginnen vóór de leverancier klaar is (terugkoppeling)?';
  const VERGELIJK = { I: 'Liever niet: kans op herstelwerk', H: 'Nee, pas als de leverancier klaar is', B: 'Ja, binnen de grenzen van de leverancier', A: 'Ja, afgesproken: met de beste aanname' };
  function vergelijkTabel(actief) {
    return '<table class="vergelijk"><thead><tr><th colspan="2">' + VERGELIJK_KOP + '</th></tr></thead><tbody>' +
      Object.keys(SOORTEN).map(k => '<tr' + (k === actief ? ' class="actief"' : '') + '><td><span class="chip ' + k + '">' + k + '</span>' + SOORTEN[k].kort + '</td><td>' + VERGELIJK[k] + '</td></tr>').join('') + '</tbody></table>';
  }
  function bouwUitleg(k) {
    const u = UITLEG[k]; if (!u) return '';
    const isSoort = !!SOORTEN[k];
    const kop = isSoort ? '<span class="chip ' + k + '">' + k + '</span>' + SOORTEN[k].naam : u.chip + u.titel;
    return '<h3 class="uitlegkop">' + kop + '</h3><p class="uitleg">' + u.wat + '</p>' +
      '<p class="klein"><b>In de analyse:</b> ' + u.analyse + '</p>' + (u.hoe ? '<p class="klein"><b>Vastleggen:</b> ' + u.hoe + '</p>' : '') + (isSoort ? vergelijkTabel(k) : '');
  }
  function uitlegStandaard() {
    if (ui.sel && ui.sel.van === ui.sel.naar) return bouwUitleg('Z');
    return '<h2>Uitleg relatiesoorten</h2><p class="klein">Wijs een soort aan in de legenda boven de matrix of bij <b>Geselecteerde cel</b> voor de volledige uitleg.</p>' + vergelijkTabel(null) +
      '<p class="klein"><span class="chip zelf" style="vertical-align:middle;margin-right:6px">↻</span><b>Zelfiteratie:</b> klik een grijs vakje op de diagonaal en druk op de <b>spatiebalk</b>.</p>';
  }
  function toonUitleg(k, bron) {
    if (ui.tab === 'relaties') {
      const p = $('#uitlegpaneel'); if (!p) return;
      p.innerHTML = k ? bouwUitleg(k) : uitlegStandaard();
      p.classList.toggle('actief', !!k);
    } else if (ui.tab === 'analyse') {
      const pop = $('#uitlegpop'); if (!pop) return;
      if (!k) { pop.hidden = true; return; }
      pop.innerHTML = bouwUitleg(k); pop.hidden = false;
      const kader = pop.parentElement, max = kader.clientWidth - pop.offsetWidth;
      pop.style.left = Math.max(0, Math.min(max, bron ? bron.offsetLeft : 0)) + 'px';
    }
  }
  inhoud.addEventListener('mouseover', e => {
    const b = e.target.closest('[data-uitleg], .soorten [data-soort]'); if (!b) return;
    const k = b.dataset.uitleg || b.dataset.soort; if (k) toonUitleg(k, b);
  });
  inhoud.addEventListener('mouseout', e => {
    const b = e.target.closest('[data-uitleg], .soorten [data-soort]'); if (!b) return;
    if (e.relatedTarget && b.contains(e.relatedTarget)) return;
    toonUitleg(null);
  });
  inhoud.addEventListener('focusin', e => { const b = e.target.closest('[data-uitleg], .soorten [data-soort]'); if (b && (b.dataset.uitleg || b.dataset.soort)) toonUitleg(b.dataset.uitleg || b.dataset.soort, b); });
  inhoud.addEventListener('focusout', e => { if (e.target.closest('[data-uitleg], .soorten [data-soort]')) toonUitleg(null); });

  function legenda(analyse) {
    const item = (k, chip, tekst) => '<span data-uitleg="' + k + '" tabindex="0">' + chip + tekst + '</span>';
    return '<div class="legendakader"><div class="legenda" aria-label="Legenda; wijs een item aan voor uitleg">' +
      Object.keys(SOORTEN).map(k => item(k, '<span class="chip ' + k + '">' + k + '</span>', SOORTEN[k].kort)).join('') +
      item('Z', UITLEG.Z.chip, 'Zelfiteratie') +
      (analyse ? item('T', UITLEG.T.chip, 'Terugkoppeling (boven diagonaal)') + item('K', UITLEG.K.chip, 'Iteratieblok')
               : item('M', UITLEG.M.chip, 'Aanvullende kenmerken ingevuld')) +
      '<span class="legenda-hint">ⓘ wijs aan voor uitleg</span></div>' +
      (analyse ? '<div id="uitlegpop" class="uitlegpop" role="tooltip" hidden></div>' : '') + '</div>';
  }

  function renderRelPaneel() {
    const p = $('#relpaneel'); if (!p) return;
    if (!ui.sel) { p.innerHTML = '<h2>Geselecteerde cel</h2><p class="uitleg">Klik een cel in de matrix om een relatie vast te leggen, te wijzigen of weg te halen.</p>'; return; }
    const { van, naar } = ui.sel;
    if (van === naar) {
      const aan = m.zelfiteraties.includes(van);
      p.innerHTML = '<div class="rij tussen"><h2>Diagonaal</h2><span class="celkop">' + van + '</span></div>' +
        '<p class="uitleg"><b>' + van + ' ' + esc(naam(van)) + '</b>. Op de diagonaal leg je een zelfiteratie vast: de activiteit herhaalt zichzelf. De uitleg staat hieronder.</p>' +
        '<p class="klein">Zelfiteratie is nu <b>' + (aan ? 'aan' : 'uit') + '</b>.</p>' +
        '<button class="knop" data-zelf aria-pressed="' + aan + '">↻ Zelfiteratie ' + (aan ? 'uitzetten' : 'aanzetten') + ' <span class="toets">spatiebalk</span></button>';
      return;
    }
    const r = M.vindRelatie(m, van, naar);
    let h = '<div class="rij tussen"><h2>Geselecteerde cel</h2><span class="celkop">' + van + ' → ' + naar + '</span></div>' +
      '<p class="uitleg"><b>' + naar + ' ' + esc(naam(naar)) + '</b> heeft informatie nodig van <b>' + van + ' ' + esc(naam(van)) + '</b>.</p>' +
      '<p class="klein">' + (r ? 'Vastgelegd als <b>' + SOORTEN[r.soort].naam.toLowerCase() + '</b>.' : 'Deze cel is leeg: er is geen relatie. Kies een soort om er een te maken.') + '</p>' +
      '<div class="soorten" role="group" aria-label="Soort relatie">' +
      Object.keys(SOORTEN).map(k => '<button data-soort="' + k + '" aria-pressed="' + (r && r.soort === k) + '"><span class="chip ' + k + '">' + k + '</span>' + SOORTEN[k].kort + '</button>').join('') +
      '<button class="geen" data-soort="" aria-pressed="' + !r + '"><span class="chip leeg">∅</span>Geen relatie</button></div>';
    if (r) {
      h += '<label class="veld">Welke informatie is nodig?<textarea rows="2" data-kenm="info" placeholder="Bijv. belastingen en toleranties">' + esc(r.info) + '</textarea></label>' +
        '<div style="border-top:1px solid #E6E6E1;padding-top:8px"><button class="uitklap" data-uitklap aria-expanded="' + ui.kenmerkenOpen + '"><span>Aanvullende kenmerken <span style="font-weight:400;color:#5C5C58">(kan later)</span></span><span aria-hidden="true">' + (ui.kenmerkenOpen ? '▴' : '▾') + '</span></button>';
      if (ui.kenmerkenOpen) {
        const opt = (lijst, w) => lijst.map(x => '<option' + (x === w ? ' selected' : '') + ' value="' + esc(x) + '">' + (x || '—') + '</option>').join('');
        h += '<div class="kolom" style="gap:10px;margin-top:8px"><div class="raster2">' +
          '<label class="veld">Zekerheid<select data-kenm="zekerheid">' + opt(['', 'Hoog', 'Middel', 'Laag'], r.zekerheid) + '</select></label>' +
          '<label class="veld">Frequentie<select data-kenm="frequentie">' + opt(['', 'Eenmalig', 'Per revisie', 'Doorlopend'], r.frequentie) + '</select></label></div>' +
          '<label class="veld">Bron / document<input data-kenm="bron" value="' + esc(r.bron) + '" placeholder="Bijv. rekenrapport, tekening"></label></div>';
      }
      h += '</div><div class="rij"><button class="knop gevaar" data-soort="">Relatie wissen (Del)</button></div>';
    }
    p.innerHTML = h;
  }

  function vernieuwRelCel() {
    const tabel = $('#mk table'); if (!tabel || !ui.sel) return;
    const v = relVolgorde(), i = v.indexOf(ui.sel.naar), j = v.indexOf(ui.sel.van);
    const td = celEl(tabel, i, j); if (!td) return;
    if (i === j) { const z = m.zelfiteraties.includes(ui.sel.van); td.textContent = z ? '↻' : String(i + 1); td.classList.toggle('zelf', z); }
    else {
      const r = M.vindRelatie(m, ui.sel.van, ui.sel.naar);
      td.className = (r ? 's-' + r.soort + (heeftKenmerk(r) ? ' kenm' : '') : '') + ((j % 5 === 4 && j < v.length - 1) ? ' vijf-k' : '') + ' gekozen';
      td.textContent = r ? r.soort : '';
      td.title = r ? ui.sel.naar + ' heeft informatie nodig van ' + ui.sel.van + ' (' + SOORTEN[r.soort].kort + ')' : '';
    }
    const t1 = $('#tel-rel'), t2 = $('#tel-info');
    if (t1) t1.textContent = m.relaties.length;
    if (t2) t2.textContent = m.relaties.filter(r => !r.info).length;
  }

  function kiesCel(i, j) {
    const v = relVolgorde();
    if (i < 0 || j < 0 || i >= v.length || j >= v.length) return;
    ui.sel = { naar: v[i], van: v[j] };
    markeerSelectie($('#mk table'), i, j);
    renderRelPaneel(); toonUitleg(null);
  }
  function zetSoort(soort) {
    if (!ui.sel || ui.sel.van === ui.sel.naar) return;
    if (soort) { const f = M.zetRelatie(m, ui.sel.van, ui.sel.naar, soort); if (f) { toonFouten([f]); return; } }
    else M.wisRelatie(m, ui.sel.van, ui.sel.naar);
    na(); vernieuwRelCel(); renderRelPaneel();
  }

  inhoud.addEventListener('click', e => {
    if (ui.tab !== 'relaties') return;
    const td = e.target.closest('#mk td');
    if (td) { kiesCel(+td.dataset.i, +td.dataset.j); $('#mk').focus({ preventScroll: true }); return; }
    const sb = e.target.closest('[data-soort]');
    if (sb) { zetSoort(sb.dataset.soort); return; }
    if (e.target.closest('[data-zelf]')) { M.wisselZelfiteratie(m, ui.sel.van); na(); vernieuwRelCel(); renderRelPaneel(); return; }
    if (e.target.closest('[data-uitklap]')) { ui.kenmerkenOpen = !ui.kenmerkenOpen; renderRelPaneel(); }
  });
  inhoud.addEventListener('change', e => {
    if (ui.tab !== 'relaties' || !e.target.dataset.kenm || !ui.sel) return;
    M.wijzigKenmerk(m, ui.sel.van, ui.sel.naar, e.target.dataset.kenm, e.target.value.trim());
    na(); vernieuwRelCel();
  });
  inhoud.addEventListener('keydown', e => {
    if (ui.tab !== 'relaties' || e.target.id !== 'mk') return;
    const v = relVolgorde();
    let i = ui.sel ? v.indexOf(ui.sel.naar) : 0, j = ui.sel ? v.indexOf(ui.sel.van) : 1;
    if (!ui.sel && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) { e.preventDefault(); kiesCel(0, v.length > 1 ? 1 : 0); return; }
    const k = e.key;
    if (k === 'ArrowUp') { e.preventDefault(); kiesCel(i - 1, j); }
    else if (k === 'ArrowDown') { e.preventDefault(); kiesCel(i + 1, j); }
    else if (k === 'ArrowLeft') { e.preventDefault(); kiesCel(i, j - 1); }
    else if (k === 'ArrowRight') { e.preventDefault(); kiesCel(i, j + 1); }
    else if (k === 'Enter') { e.preventDefault(); let nj = j + 1; if (nj === i) nj++; if (nj >= v.length) { nj = 0; i = Math.min(i + 1, v.length - 1); if (nj === i) nj++; } kiesCel(i, nj); }
    else if (/^[ihba]$/i.test(k)) { e.preventDefault(); zetSoort(k.toUpperCase()); }
    else if (k === 'Delete' || k === 'Backspace' || k === '0') { e.preventDefault(); zetSoort(''); }
    else if (k === ' ' && ui.sel && ui.sel.van === ui.sel.naar) { e.preventDefault(); M.wisselZelfiteratie(m, ui.sel.van); na(); vernieuwRelCel(); renderRelPaneel(); }
  });

  /* ================= DSM ANALYSE ================= */
  function huidigeVolgorde(lijst) {
    const bestaand = new Set(m.activiteiten.map(a => a.id));
    const v = lijst.filter(id => bestaand.has(id));
    m.activiteiten.forEach(a => { if (!v.includes(a.id)) v.push(a.id); });
    return v;
  }
  function blokInfo(a) {
    const blokVan = {}, grootBlok = {};
    a.blokken.forEach(b => { b.leden.forEach(id => { blokVan[id] = b.id; }); if (b.leden.length > 1) grootBlok[b.id] = true; });
    return { blokVan, grootBlok };
  }
  function geenAnalyse() {
    inhoud.innerHTML = '<section class="paneel breed leeg-staat"><p>Er is nog geen analyse.</p><button class="knop primair" data-herbereken>Analyse uitvoeren</button></section>';
  }
  function verouderdBalk() {
    const s = M.analyseStatus(m);
    return s.status === 'verouderd' ? '<div class="balk-let rij tussen"><span><b>' + esc(s.tekst) + '.</b> De getoonde uitkomst hoort bij invoerversie ' + m.analyse.invoerversie + '.</span><button class="knop" data-herbereken>Opnieuw berekenen</button></div>' : '';
  }

  function renderAnalyse() {
    const a = m.analyse; if (!a) return geenAnalyse();
    const volg = huidigeVolgorde(ui.weergave === 'voorgesteld' ? a.volgorde : m.activiteiten.map(x => x.id));
    const mt = AN.maten(m, volg), bi = blokInfo(a);
    const groot = a.blokken.filter(b => b.leden.length > 1);
    const inst = a.instellingen;
    inhoud.innerHTML =
      '<section class="kolom breed">' + verouderdBalk() +
        '<div class="rij tussen"><div class="rij"><span class="klein"><b>Volgorde</b></span>' +
        '<button class="knop" data-weergave="oorspronkelijk" aria-pressed="' + (ui.weergave === 'oorspronkelijk') + '">Oorspronkelijk</button>' +
        '<button class="knop" data-weergave="voorgesteld" aria-pressed="' + (ui.weergave === 'voorgesteld') + '">Voorgesteld</button></div>' +
        '<div class="rij"><span class="maat">Terugkoppelingen <b>' + mt.terugkoppelingen + '</b></span><span class="maat">met wisseling verantw. <b>' + mt.metWissel + '</b></span><span class="maat">Totale afstand <b>' + mt.totaleAfstand + '</b></span><span class="maat">Grootste <b>' + mt.grootsteAfstand + '</b></span>' + (mt.hardeSchendingen ? '<span class="maat" style="color:#9B2C1C">Harde voorwaarden geschonden <b>' + mt.hardeSchendingen + '</b></span>' : '') + '</div></div>' +
        '<div class="paneel">' + legenda(true) +
        '<div class="matrixkader" id="ak">' + bouwMatrix(volg, { blokKolom: true, blokVan: bi.blokVan, grootBlok: bi.grootBlok, markeerTerug: true }) + '</div>' +
        '<p class="klein">Klik een gekleurde cel voor de relatiegegevens. Alle ' + m.activiteiten.length + ' activiteiten en ' + m.relaties.length + ' relaties blijven behouden; alleen de volgorde verandert.</p></div>' +
        '<div class="paneel"><h2>Blokken (Tarjan) in topologische volgorde</h2><div class="blokken">' +
        a.blokken.map(b => '<span class="' + (b.leden.length > 1 ? 'groot' : (b.zelfiteratie ? 'zelf' : '')) + '">' + b.id + ' ' + b.leden.join(' ') + (b.leden.length > 1 ? ' · iteratieblok' : '') + (b.zelfiteratie ? ' · zelfiteratie ↻' : '') + '</span>').join('') + '</div>' +
        (a.tegenspraken.length ? '<div class="melding fout" style="margin:0"><div><b>Harde tegenspraak:</b> ' + a.tegenspraken.map(t => t.leden.join(' ↔ ') + ' (in ' + t.blok + ')').join('; ') + '. Deze harde voorwaarden vormen samen een kring en kunnen niet allemaal worden gerespecteerd. <b>Herstel:</b> controleer of al deze relaties echt harde uitvoeringsvoorwaarden zijn.</div></div>' : '') +
        '<p class="klein">Een iteratieblok betekent dat deze activiteiten wederzijds van elkaar afhangen. Het is <b>geen</b> advies om ze samen te voegen of gelijktijdig uit te voeren.</p></div>' +
      '</section>' +
      '<aside class="kolom smal"><div class="paneel" id="ana-paneel"></div>' +
        '<div class="paneel"><div class="rij tussen"><h2>Optimalisatie</h2>' + (a.bewezen ? '<span class="label-ok">Optimaal — bewezen</span>' : '<span class="label-let">Beste gevonden — niet bewezen</span>') + '</div>' +
        '<ol class="uitleg" style="padding-left:18px;margin:0"><li>Harde voorwaarden respecteren</li><li>Aantal terugkoppelingen minimaliseren</li>' + (inst.wisselingVoorkeur ? '<li>Daarna: minder terugkoppelingen met wisseling van verantwoordelijke</li>' : '') + '<li>Daarna totale terugkoppelafstand</li><li>Gelijkstand: laagste ID eerst</li></ol>' +
        '<dl class="gegevens" style="font-size:12px"><dt>Blokken</dt><dd>Tarjan; blokken topologisch geordend, bij keuze laagste ID eerst</dd>' +
        '<dt>Binnen blok</dt><dd>Volledige enumeratie t/m ' + inst.maxExact + ' activiteiten; groter: gulzige start + lokaal verplaatsen</dd>' +
        '<dt>Stopcriteria</dt><dd>Enumeratie: alle volgordes. Lokaal: geen verbetering meer, of ' + Math.round(inst.tijdlimietMs / 1000) + ' s per blok</dd>' +
        (groot.length <= 4 ? groot : groot.filter(b => !b.bewezen)).map(b => '<dt>' + b.id + ' (' + b.leden.length + ')</dt><dd>' + esc(b.methode) + ' — ' + esc(b.reden) + (b.bewezen ? ' — bewezen' : ' — niet bewezen') + '</dd>').join('') +
        (groot.length > 4 ? '<dt>Iteratieblokken</dt><dd>' + groot.length + ' blokken, waarvan ' + groot.filter(b => b.bewezen).length + ' exact doorzocht (bewezen)</dd>' : '') +
        '<dt>Berekend</dt><dd>' + new Date(a.tijdstip).toLocaleString('nl-NL') + ' · invoerversie ' + a.invoerversie + ' · ' + a.rekentijdMs + ' ms</dd></dl></div>' +
        '<div class="paneel"><h3>Instellingen</h3>' +
        '<label class="vinkje"><input type="checkbox" data-inst="wisselingVoorkeur"' + (m.instellingen.wisselingVoorkeur ? ' checked' : '') + '> Voorkeur: minder terugkoppelingen met wisseling van verantwoordelijke</label>' +
        '<div class="raster2"><label class="veld">Exact t/m (activiteiten per blok)<input type="number" min="2" max="9" data-inst="maxExact" value="' + m.instellingen.maxExact + '"></label>' +
        '<label class="veld">Tijdlimiet per blok (s)<input type="number" min="1" max="60" data-inst="tijdlimietMs" value="' + Math.round(m.instellingen.tijdlimietMs / 1000) + '"></label></div>' +
        '<p class="klein">Wijzigen maakt de analyse verouderd; bereken daarna opnieuw.</p></div>' +
      '</aside>';
    if (ui.analyseSel) { const i = volg.indexOf(ui.analyseSel.naar), j = volg.indexOf(ui.analyseSel.van); if (i >= 0 && j >= 0) markeerSelectie($('#ak table'), i, j); else ui.analyseSel = null; }
    richtMatrixIn($('#ak'), volg, a.blokken);
    renderAnaPaneel(volg, bi);
  }

  function renderAnaPaneel(volg, bi) {
    const p = $('#ana-paneel'); if (!p) return;
    if (!ui.analyseSel) { p.innerHTML = '<h2>Relatiegegevens</h2><p class="uitleg">Klik een gekleurde cel in de matrix.</p>'; return; }
    const { van, naar } = ui.analyseSel, r = M.vindRelatie(m, van, naar);
    let h = '<div class="rij tussen"><h2>Relatiegegevens</h2><span class="celkop">' + van + ' → ' + naar + '</span></div>';
    if (!r) { p.innerHTML = h + '<p class="uitleg">Geen relatie in deze cel.</p>'; return; }
    const d = volg.indexOf(van) - volg.indexOf(naar), av = act(van), aw = act(naar);
    const wissel = (av.eigenaar || '') !== (aw.eigenaar || '');
    const bv = bi.blokVan[van], bw = bi.blokVan[naar];
    h += '<dl class="gegevens"><dt>Leverancier</dt><dd><b>' + van + '</b> ' + esc(av.naam) + (av.eigenaar ? ' · ' + esc(av.eigenaar) : '') + '</dd>' +
      '<dt>Ontvanger</dt><dd><b>' + naar + '</b> ' + esc(aw.naam) + (aw.eigenaar ? ' · ' + esc(aw.eigenaar) : '') + '</dd>' +
      '<dt>Soort</dt><dd>' + SOORTEN[r.soort].naam + '</dd>' +
      '<dt>Informatie</dt><dd>' + (r.info ? esc(r.info) : '<span class="klein">nog niet beschreven</span>') + '</dd>' +
      (r.zekerheid ? '<dt>Zekerheid</dt><dd>' + esc(r.zekerheid) + '</dd>' : '') + (r.frequentie ? '<dt>Frequentie</dt><dd>' + esc(r.frequentie) + '</dd>' : '') + (r.bron ? '<dt>Bron</dt><dd>' + esc(r.bron) + '</dd>' : '') +
      '<dt>Positie</dt><dd>' + (d > 0 ? 'Terugkoppeling · afstand ' + d + (wissel ? ' · wisseling van verantwoordelijke' : '') : 'Vooruitkoppeling') + '</dd>' +
      '<dt>Blok</dt><dd>' + (bv && bv === bw ? 'Binnen ' + bv : (bv || '?') + ' → ' + (bw || '?')) + '</dd></dl>' +
      (d > 0 ? '<p class="klein">Een tear voorbereiden vanuit deze relatie komt in het tabblad Scenario\'s &amp; tears (volgende versie).</p>' : '');
    p.innerHTML = h;
  }

  inhoud.addEventListener('click', e => {
    if (e.target.closest('[data-herbereken]')) { voerAnalyseUit(); return; }
    if (ui.tab !== 'analyse') return;
    const w = e.target.closest('[data-weergave]');
    if (w) { ui.weergave = w.dataset.weergave; renderAnalyse(); return; }
    const td = e.target.closest('#ak td');
    if (td) {
      const a = m.analyse, volg = huidigeVolgorde(ui.weergave === 'voorgesteld' ? a.volgorde : m.activiteiten.map(x => x.id));
      const i = +td.dataset.i, j = +td.dataset.j; if (i === j) return;
      ui.analyseSel = { naar: volg[i], van: volg[j] };
      markeerSelectie($('#ak table'), i, j); renderAnaPaneel(volg, blokInfo(a));
    }
  });
  inhoud.addEventListener('change', e => {
    const k = e.target.dataset.inst; if (!k || ui.tab !== 'analyse') return;
    let v;
    if (k === 'wisselingVoorkeur') v = e.target.checked;
    else if (k === 'maxExact') v = Math.max(2, Math.min(9, parseInt(e.target.value, 10) || 8));
    else if (k === 'tijdlimietMs') v = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 3)) * 1000;
    M.zetInstelling(m, k, v); na(); renderAnalyse();
  });

  /* ================= VERGELIJKING ================= */
  function renderVergelijking() {
    const a = m.analyse; if (!a) return geenAnalyse();
    const o = a.matenOorspronkelijk, v = a.matenVoorgesteld;
    const rij = (label, x, y, voorkeur) => {
      const d = y - x;
      return '<tr' + (voorkeur ? ' style="background:#F6F9FE"' : '') + '><td>' + label + (voorkeur ? ' <span class="label-info" style="padding:2px 6px">voorkeur</span>' : '') + '</td><td class="num">' + x + '</td><td class="num"><b>' + y + '</b></td><td class="num' + (d < 0 ? ' goed' : '') + '">' + (d > 0 ? '+' + d : d === 0 ? '0' : '−' + Math.abs(d)) + '</td></tr>';
    };
    const groot = a.blokken.filter(b => b.leden.length > 1), zelf = a.blokken.filter(b => b.zelfiteratie);
    const blokLeden = {}; a.blokken.forEach(b => { blokLeden[b.id] = b.leden; });
    if (!ui.impactId || !act(ui.impactId)) ui.impactId = m.activiteiten[0] && m.activiteiten[0].id;
    const imp = ui.impactId ? AN.impact(m, ui.impactId) : { direct: [], indirect: [] };
    inhoud.innerHTML =
      '<section class="kolom breed">' + verouderdBalk() +
      '<div class="paneel"><h2>Oorspronkelijk vs. voorgesteld</h2><div class="tabelkader"><table class="lijst"><thead><tr><th>Maat</th><th class="num">Oorspronkelijk</th><th class="num">Voorgesteld</th><th class="num">Verschil</th></tr></thead><tbody>' +
        rij('Aantal terugkoppelingen', o.terugkoppelingen, v.terugkoppelingen) +
        rij('… met wisseling van verantwoordelijke', o.metWissel, v.metWissel, true) +
        rij('Totale terugkoppelafstand', o.totaleAfstand, v.totaleAfstand) +
        rij('Grootste terugkoppelafstand', o.grootsteAfstand, v.grootsteAfstand) +
        rij('Harde voorwaarden geschonden', o.hardeSchendingen, v.hardeSchendingen) +
        rij('Iteratieblokken (≥ 2 activiteiten)', groot.length, groot.length) +
        rij('Activiteiten in grootste blok', a.grootsteBlok, a.grootsteBlok) +
        rij('Zelfiteraties', a.aantalZelfiteraties, a.aantalZelfiteraties) +
      '</tbody></table></div><p class="klein" style="padding:10px 12px;background:#F4F4F2;border-radius:6px">Dit zijn <b>structurele maten</b>. Ze worden niet omgerekend naar hersteluren of doorlooptijd.</p></div>' +
      '<div class="paneel"><div class="rij tussen"><h2>Structureel parallelle mogelijkheden</h2><span class="klein">Alles in één kolom heeft onderling geen directe of indirecte afhankelijkheid</span></div><div class="niveaus">' +
        a.niveaus.map(n => '<div class="niveau' + (n.blokken.length > 1 ? ' parallel' : '') + '"><span class="kopje">Niveau ' + n.niveau + '</span>' +
          n.blokken.map(b => { const l = blokLeden[b]; return '<span class="item">' + (l.length > 1 ? b + ' · ' + l.join(' ') : l[0] + ' ' + esc(naam(l[0]))) + '</span>'; }).join('') + '</div>').join('') +
      '</div><p class="klein">Of parallel werken ook kan met de beschikbare mensen en middelen, beoordeel je apart: capaciteit valt buiten deze analyse.</p></div>' +
      '<div class="paneel"><div class="rij tussen"><h2>Wijzigingsimpact</h2><label class="rij klein">Wijziging in <select id="impact-keus">' +
        m.activiteiten.map(x => '<option value="' + x.id + '"' + (x.id === ui.impactId ? ' selected' : '') + '>' + x.id + ' ' + esc(x.naam) + '</option>').join('') + '</select></label></div>' +
        '<div class="impact"><div class="direct"><b>Direct mogelijk geraakt (' + imp.direct.length + ')</b>' + (imp.direct.map(id => '<span><b class="mono">' + id + '</b> ' + esc(naam(id)) + '</span>').join('') || '<span class="klein">geen</span>') + '</div>' +
        '<div class="indirect"><b>Indirect mogelijk geraakt (' + imp.indirect.length + ')</b>' + (imp.indirect.map(x => '<span><b class="mono">' + x.id + '</b> ' + esc(naam(x.id)) + ' <span class="klein">via ' + x.via + '</span></span>').join('') || '<span class="klein">geen</span>') + '</div>' +
        '<div class="noot">“Mogelijk geraakt” volgt alleen de relaties in het huidige model. Of er echt herstelwerk nodig is, en hoeveel, beoordeel je per activiteit afzonderlijk.</div></div></div>' +
      '</section>' +
      '<aside class="kolom smal"><div class="paneel"><h2>Activiteiten per iteratieblok</h2><table class="lijst"><thead><tr><th>Blok</th><th>Activiteiten</th><th class="num">Aantal</th></tr></thead><tbody>' +
        (groot.map(b => '<tr style="background:var(--blok)"><td class="mono"><b>' + b.id + '</b></td><td class="mono">' + b.leden.join(' ') + '</td><td class="num">' + b.leden.length + '</td></tr>').join('') +
         zelf.map(b => '<tr><td class="mono"><b>' + b.id + '</b></td><td class="mono">' + b.leden[0] + ' ↻ zelfiteratie</td><td class="num">1</td></tr>').join('') ||
         '<tr><td colspan="3" class="klein">Geen iteratieblokken of zelfiteraties.</td></tr>') +
        '<tr><td colspan="3" class="klein">' + a.blokken.filter(b => b.leden.length === 1 && !b.zelfiteratie).length + ' losse activiteiten zonder cyclus</td></tr></tbody></table></div></aside>';
  }
  inhoud.addEventListener('change', e => {
    if (ui.tab === 'vergelijking' && e.target.id === 'impact-keus') { ui.impactId = e.target.value; renderVergelijking(); }
  });

  /* ================= SCENARIO'S EN RAPPORT ================= */
  function renderScenarios() {
    inhoud.innerHTML = '<section class="paneel breed"><h2>Scenario\'s &amp; tears</h2><p class="uitleg">Dit onderdeel volgt in de volgende versie:</p><ul class="uitleg">' +
      '<li>scenario\'s maken op basis van een bestaand scenario, kiezen uit een lijst;</li><li>vanuit een terugkoppeling in DSM analyse een tear voorbereiden;</li>' +
      '<li>per tear: aanname, verantwoordelijke, controlemoment en gevolgen; de oorspronkelijke relatie blijft bewaard;</li><li>per scenario cycli en volgorde opnieuw berekenen en vergelijken met de basis.</li></ul></section>';
  }
  function renderRapport() {
    inhoud.innerHTML = '<section class="paneel breed"><h2>Rapportage</h2><p class="uitleg">Het opgemaakte rapport (PDF en Excel met handleiding) volgt in de volgende versie. Tot die tijd:</p><ul class="uitleg">' +
      '<li><b>Opslaan</b> rechtsboven bewaart het complete model met invoerversie, instellingen en analyse als .json-bestand;</li>' +
      '<li>op <b>DSM analyse</b> kun je de matrix afdrukken of als PDF bewaren via de afdrukfunctie van je browser (Ctrl+P).</li></ul></section>';
  }

  render();
  if (!heeftInhoud()) toonOk('Welkom. Begin met activiteiten toevoegen, of kies "Voorbeeld" rechtsboven om een voorbeeldmodel te laden.');
})();
