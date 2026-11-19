#!/usr/bin/env python3
"""Überlauf-Prüfung für lange Namen (v0.5.3).

Rendert die App bei 375×667, 390×844 und 430×932 (dpr 3) mit Testdaten in IndexedDB
(alle Orte + alle 72 Pflanzen freigeschaltet, lange Tag-Namen, 72 Sessions heute) und
prüft in allen Kacheln/Karten/Sheets jedes Text-Element:
  * scrollWidth <= clientWidth (nichts abgeschnitten, keine Ellipse)
  * jede Textzeile (Range-Rects) und jedes Element liegt innerhalb seiner Kachel/Karte
Streng: overflow-wrap/word-break werden für Pflanzen-/Ortsnamen abgeschaltet, d. h. die
weichen Trennstellen aus plants.js müssen allein reichen (Tags dürfen notfalls umbrechen).

Aufruf: python3 tools/check_overflow.py [--shots /home/claude/check]
Exit-Code 0 = keine Verstöße.
"""
import argparse
import contextlib
import functools
import http.server
import json
import os
import socket
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWPORTS = [(375, 667), (390, 844), (430, 932)]

TAGS = [
    ('t1', 'Lernen', '#468a48'),
    ('t2', 'Bachelorarbeit – Literaturrecherche', '#b4603e'),
    ('t3', 'Produktionslogistikvorlesung', '#4c70d0'),
    ('t4', 'Rechtsschutzversicherungsgesellschaften', '#8060bc'),
    ('t5', 'Supply-Chain-Management', '#e4b832'),
]

# Prüffunktion im Browser: boxSel = Kachel/Karte, in der der Text bleiben muss.
CHECK_JS = r"""
([boxSel, view]) => {
  const out = [];
  const tol = 0.5;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const boxes = [...document.querySelectorAll(boxSel)].filter(visible);
  let texts = 0;
  for (const box of boxes) {
    const br = box.getBoundingClientRect();
    const L = br.left + box.clientLeft, T = br.top + box.clientTop;
    const R = L + box.clientWidth, B = T + box.clientHeight;
    // Scroll-Container (Sheets): unten darf Inhalt weiterscrollen – nur waagerecht prüfen.
    const scrollY = /(auto|scroll)/.test(getComputedStyle(box).overflowY);
    const name = (box.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const tw = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!visible(el)) continue;
      texts++;
      if (/^(null|undefined|NaN)$/.test(n.textContent.trim())) {
        out.push({ view, box: boxSel, name, text: n.textContent.trim(), why: 'Platzhalter-Text sichtbar' });
      }
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (r.width === 0) continue;
        // senkrecht 3 px Spielraum: die Glyphen-Box einer Zeile ist bei line-height < 1,3 etwas höher als die Zeile
        if (r.left < L - tol || r.right > R + tol || (!scrollY && (r.top < T - 3 || r.bottom > B + 3))) {
          out.push({ view, box: boxSel, name, text: n.textContent.trim().slice(0, 50), why: 'Text ragt aus der Kachel',
            d: [Math.round(L - r.left), Math.round(r.right - R), Math.round(T - r.top), Math.round(r.bottom - B)] });
          break;
        }
      }
      // Element und Vorfahren bis zur Kachel: nichts abgeschnitten, nichts außerhalb
      for (let a = el; a && a !== box.parentElement; a = a.parentElement) {
        if (seen.has(a)) break;
        seen.add(a);
        const cs = getComputedStyle(a);
        if (cs.display !== 'inline' && a.clientWidth > 0 && a.scrollWidth > a.clientWidth) {
          out.push({ view, box: boxSel, name, text: n.textContent.trim().slice(0, 50), why: `scrollWidth ${a.scrollWidth} > clientWidth ${a.clientWidth}`, el: a.className || a.tagName });
        }
        if (a !== box) {
          const r = a.getBoundingClientRect();
          if (r.left < L - tol || r.right > R + tol) {
            out.push({ view, box: boxSel, name, text: n.textContent.trim().slice(0, 50), why: 'Element ragt aus der Kachel', el: a.className || a.tagName,
              d: [Math.round(L - r.left), Math.round(r.right - R)] });
          }
        }
        if (a === box) break;
      }
    }
  }
  return { violations: out, boxes: boxes.length, texts };
}
"""

STRICT_CSS = """
*, *::before, *::after { animation: none !important; transition: none !important; }
:not(.tname):not(.tname *) { overflow-wrap: normal !important; word-break: normal !important; }
/* unsichtbare Trefferflächen-Vergrößerungen (::after mit negativem inset) zählen sonst in scrollWidth */
.btn.small::after, .icon-btn.small::after, .chip::after, .segmented button::after, .swatch::after { display: none !important; }
"""


def free_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def start_server():
    port = free_port()
    handler = functools.partial(QuietHandler, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


SEED_JS = r"""
async ([tags, all]) => {
  const db = await import('/app/js/db.js');
  const { PLANTS, REGIONS } = await import('/app/js/plants.js');
  const now = Date.now();
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const span = Math.max(60000 * 72, now - +d0 - 25 * 60000);
  const ops = ['tags', 'sessions', 'plants', 'kv'].map((store) => ({ store, clear: true }));
  tags.forEach(([id, name, color], i) => ops.push({ store: 'tags', put: { id, name, color, order: i, createdAt: now } }));
  PLANTS.forEach((p, i) => {
    const start = +d0 + Math.floor(i * span / 72);
    const sid = 's' + i, pid = 'p' + i;
    const tagId = tags[i % tags.length][0];
    ops.push({ store: 'sessions', put: { id: sid, tagId, region: p.region, species: p.id, mode: 'timer', targetMin: 20,
      startedAt: start, endedAt: start + 20 * 60000, segments: [[start, start + 20 * 60000]], minutes: 20, tokens: 20, plantIds: [pid] } });
    ops.push({ store: 'plants', put: { id: pid, sessionId: sid, species: p.id, region: p.region, variant: p.variants[0] || null,
      stage: 5, minutes: 120, tagId, createdAt: start + 20 * 60000 } });
  });
  const purchases = all ? [
    ...REGIONS.filter((r) => r.id !== 'pflanzenhandlung').map((r) => ({ type: 'region', id: r.id, price: 0, at: now })),
    ...PLANTS.map((p) => ({ type: 'plant', id: p.id, price: 0, at: now })),
  ] : [];
  for (const [key, value] of Object.entries({ installedAt: now - 86400000 * 30, purchases, tokenAdjust: all ? 0 : -1300,
    lastSetup: { tagId: 't4', region: 'pflanzenhandlung', species: null, mode: 'timer', targetMin: 30 } })) {
    ops.push({ store: 'kv', put: { key, value } });
  }
  await db.write(ops);
}
"""


def boot(page, base, all_unlocked=True):
    page.goto(base + '#/lernen')
    page.wait_for_selector('#tabbar button')
    page.evaluate(SEED_JS, [TAGS, all_unlocked])
    page.reload()
    page.wait_for_selector('.plant-grid')
    page.add_style_tag(content=STRICT_CSS)
    # alle Sprites laden lassen
    page.wait_for_timeout(300)


def preview_functions(page):
    """Vorschau: Variante umschalten, Stufe wählen, Wischen/Hintergrund/X schließt, Kauf, Region-Sperre."""
    bad = []
    sheets = "document.querySelectorAll('#sheets .sheet:not(.closing)').length"
    def open_(sid):
        page.evaluate("document.getElementById('sheets').replaceChildren()")
        page.locator(f'.shop-item[data-species="{sid}"]').click(position={'x': 10, 'y': 10})
        page.wait_for_selector(f'.preview[data-species="{sid}"]')
    # Monstera ist frei, Kaktus (Startpflanze) auch – Tulpe liegt in gesperrter Region
    open_('tulpe')
    if 'Erst Blumenwiese freischalten' not in page.inner_text('.pv-buy'):
        bad.append('Region-Hinweis fehlt auf dem Kauf-Button')
    if not page.locator('.pv-buy').is_disabled():
        bad.append('Kauf-Button in gesperrter Region aktiv')
    page.locator('.pv-variant', has_text='Lila').click()
    if page.locator('.pv-variant.on').inner_text().strip() != 'Lila':
        bad.append('Variante schaltet nicht um')
    page.locator('.pv-stage').nth(1).click()
    if page.locator('.pv-stage.on').get_attribute('aria-label') != 'Stufe 2, ab 30 min':
        bad.append('Stufe lässt sich nicht wählen')
    # Wischen nach unten schließt
    page.evaluate("""() => { const p = document.querySelector('.sheet');
      const t = (y) => new Touch({ identifier: 1, target: p, clientX: 100, clientY: y });
      p.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], bubbles: true }));
      for (let y = 320; y <= 440; y += 20) p.dispatchEvent(new TouchEvent('touchmove', { touches: [t(y)], bubbles: true }));
      p.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true })); }""")
    if page.evaluate(sheets):
        bad.append('Wischen schließt das Sheet nicht')
    # kurzes Ziehen schließt nicht
    open_('tulpe')
    page.evaluate("""() => { const p = document.querySelector('.sheet');
      const t = (y) => new Touch({ identifier: 1, target: p, clientX: 100, clientY: y });
      p.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], bubbles: true }));
      p.dispatchEvent(new TouchEvent('touchmove', { touches: [t(330)], bubbles: true }));
      setTimeout(() => p.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true })), 400); }""")
    page.wait_for_timeout(500)
    if not page.evaluate(sheets):
        bad.append('Kurzes Ziehen schließt das Sheet')
    page.mouse.click(5, 5)  # Hintergrund
    page.wait_for_timeout(50)
    if page.evaluate(sheets):
        bad.append('Hintergrund-Tipp schließt nicht')
    open_('tulpe')
    page.locator('.pv-close').click()
    if page.evaluate(sheets):
        bad.append('X schließt nicht')
    # Kauf in freier Region mit genug Tokens (Kontostand im gesperrten Durchlauf: 1440 - 1300 = 140)
    page.evaluate("async () => { const s = await import('/app/js/store.js'); await s.setKV('tokenAdjust', 0); }")
    open_('pilea')
    if not page.locator('.pv-buy').is_enabled():
        bad.append('Kauf-Button bei genug Tokens gesperrt')
    page.locator('.pv-buy').click()
    page.wait_for_selector('.preview .pv-owned', timeout=3000)
    if not page.evaluate("async () => (await import('/app/js/store.js')).isPlantUnlocked('pilea')"):
        bad.append('Kauf hat nicht freigeschaltet')
    page.evaluate("document.getElementById('sheets').replaceChildren()")
    return bad


def run(shots):
    srv, port = start_server()
    base = f'http://127.0.0.1:{port}/app/'
    total = []
    stats = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for (w, hgt) in VIEWPORTS:
            vp = f'{w}x{hgt}'
            ctx = browser.new_context(viewport={'width': w, 'height': hgt}, device_scale_factor=3, locale='de-DE',
                                      service_workers='block', has_touch=True, is_mobile=True)
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            boot(page, base)

            def check(sel, view):
                r = page.evaluate(CHECK_JS, [sel, f'{vp} {view}'])
                total.extend(r['violations'])
                k = f'{view} {sel}'
                stats.setdefault(k, [0, 0])
                stats[k][0] += r['boxes']
                stats[k][1] += r['texts']
                return r

            # --- Lernen: alle Regionen, alle Pflanzen-Kacheln ---------------------
            for reg in ['pflanzenhandlung', 'gewaechshaus', 'blumenwiese', 'wald']:
                page.evaluate("""async (reg) => { const s = await import('/app/js/store.js');
                  await s.setKV('lastSetup', { ...s.S.kv.lastSetup, region: reg, species: null }); }""", reg)
                page.wait_for_timeout(150)
                for sel in ['.plant-pick', '.region-card', '.chip', '.mode-card', '.today-card', '.btn', '.section']:
                    check(sel, f'Lernen/{reg}')
                if w == 375:
                    page.screenshot(path=f'{shots}/ui_lernen_{reg}_{vp}.png', full_page=False)
                    page.evaluate("document.querySelector('.plant-grid').scrollIntoView()")
                    page.screenshot(path=f'{shots}/ui_lernen_grid_{reg}_{vp}.png')
            page.locator('.mode-card').nth(1).click()
            page.wait_for_timeout(100)
            check('.mode-card', 'Lernen/endless')
            page.locator('.mode-card').nth(0).click()
            page.wait_for_timeout(100)
            page.locator('.chips.dur .chip').nth(1).click()
            page.wait_for_timeout(100)
            check('.chip', 'Lernen/timer')
            page.evaluate("document.querySelector('.mode-cards').scrollIntoView()")
            page.screenshot(path=f'{shots}/ui_modus_{vp}.png')

            # --- Laufende Session (Kopfzeile) für alle Arten -------------------------
            n = page.evaluate("async () => (await import('/app/js/plants.js')).PLANTS.length")
            for i in range(n):
                page.evaluate("""async (i) => { const s = await import('/app/js/store.js'); const { PLANTS } = await import('/app/js/plants.js');
                  const { createActive } = await import('/app/js/sessionlogic.js');
                  const p = PLANTS[i]; await s.setActive(createActive({ tagId: 't4', region: p.region, species: p.id, variant: p.variants[0] || null,
                  mode: 'timer', targetMin: 120 }, Date.now())); }""", i)
                check('.session-head', 'Session')
            if w == 375:
                page.screenshot(path=f'{shots}/ui_session_{vp}.png')
            page.evaluate("async () => (await import('/app/js/store.js')).setActive(null)")

            # --- Ergebnis-Sheet für alle Arten -----------------------------------
            for i in range(n):
                page.evaluate("""async (i) => { const { showResult } = await import('/app/js/views/learn.js'); const { PLANTS } = await import('/app/js/plants.js');
                  const p = PLANTS[i]; document.getElementById('sheets').replaceChildren();
                  showResult({ session: { minutes: 290, tokens: 290, region: p.region },
                    plants: [5, 5, 2].map((stage) => ({ species: p.id, stage, variant: p.variants[0] || null })) }, () => {}); }""", i)
                check('.sheet', 'Ergebnis')
                check('.result-stats > div', 'Ergebnis')
                check('.result .btn', 'Ergebnis')
                if i == 61 and w == 375:  # Moospolster mit Glühpilzen
                    page.screenshot(path=f'{shots}/ui_ergebnis_{vp}.png')
            page.evaluate("document.getElementById('sheets').replaceChildren()")

            # --- Shop (alles freigeschaltet) + Vorschau für alle Arten -------------
            def shop_pass(label):
                page.evaluate("location.hash = '#/laden'")
                page.wait_for_selector('.shop-item')
                page.wait_for_timeout(200)
                for sel in ['.shop-item', '.shop-region-head', '.shop-region .btn', '.tokens', '.intro']:
                    check(sel, f'Shop/{label}')
                ids = page.evaluate("[...document.querySelectorAll('.shop-item')].map((e) => e.dataset.species)")
                for sid in ids:
                    page.locator(f'.shop-item[data-species="{sid}"] .shop-peek').click()
                    page.wait_for_selector(f'.preview[data-species="{sid}"]')
                    for sel in ['.sheet', '.pv-head', '.pv-hero', '.pv-stage', '.pv-variant', '.pv-fact', '.pv-actions', '.pv-buy', '.pv-owned']:
                        check(sel, f'Vorschau/{label}')
                    if (w == 375 and sid in ('zunderschwamm', 'philodendron_pink', 'tulpe', 'buschwindroeschen')) or (w == 430 and sid in ('tulpe', 'gluehmoos')):
                        page.screenshot(path=f'{shots}/ui_vorschau_{label}_{sid}_{vp}.png')
                    page.evaluate("document.getElementById('sheets').replaceChildren()")
                if w == 375:
                    for reg in ('wald', 'pflanzenhandlung'):
                        page.evaluate("(r) => document.querySelector('.shop-region.' + r).scrollIntoView()", reg)
                        page.screenshot(path=f'{shots}/ui_shop_{reg}_{label}_{vp}.png')
            shop_pass('alles')

            # --- Orte: Region-Reiter + Info-Karte für jede Art --------------------
            page.evaluate("location.hash = '#/garten'")
            page.wait_for_selector('.region-tabs button')
            names = {'pflanzenhandlung': 'Pflanzenhandlung', 'gewaechshaus': 'Gewächshaus', 'blumenwiese': 'Blumenwiese', 'wald': 'Wald'}
            for reg in names:
                page.locator('.region-tabs button', has_text=names[reg]).click()
                page.wait_for_timeout(120)
                check('.region-tabs button', f'Orte/{reg}')
                check('.garden-bar', f'Orte/{reg}')
                ids = page.evaluate("async (reg) => (await import('/app/js/plants.js')).PLANTS.filter((p) => p.region === reg).map((p) => p.id)", reg)
                for sid in ids:
                    page.evaluate("""async (sid) => { const { plantInfoContent } = await import('/app/js/views/garden.js');
                      const s = await import('/app/js/store.js'); const p = s.S.plants.find((x) => x.species === sid);
                      const info = document.querySelector('.plant-info'); info.replaceChildren(...plantInfoContent(p)); info.classList.remove('hidden'); }""", sid)
                    check('.plant-info', f'Orte/{reg}')
                    check('.plant-info .link-btn', f'Orte/{reg}')
                    if w == 375 and sid in ('gluehmoos', 'philodendron_pink'):
                        page.screenshot(path=f'{shots}/ui_orte_info_{sid}_{vp}.png')

            # --- Statistik (Tag): Session-Liste, Tags --------------------------------
            page.evaluate("location.hash = '#/statistik'")
            page.wait_for_selector('.page.stats .segmented')
            page.locator('.page.stats .segmented button', has_text='Tag').click()
            page.wait_for_selector('.session-row')
            for sel in ['.session-row', '.tag-row-head', '.kpi', '.card']:
                check(sel, 'Statistik')
            if w == 375:
                page.evaluate("document.querySelector('.sessions-card').scrollIntoView()")
                page.screenshot(path=f'{shots}/ui_statistik_sessions_{vp}.png')

            # --- Session-Sheet + Tag ändern (v0.5.4): lange Tag-Namen, Tippflächen ---------
            for sid in ('s3', 's7'):  # s3: Tag t4 (längster Name), s7: t3
                page.evaluate("document.getElementById('sheets').replaceChildren()")
                page.evaluate("async (sid) => (await import('/app/js/views/sessionsheet.js')).openSessionSheet(sid)", sid)
                page.wait_for_selector('.session-detail')
                for sel in ['.sheet', '.sd-head', '.sd-actions .btn']:
                    check(sel, 'Session-Sheet')
                page.evaluate("document.getElementById('sheets').replaceChildren()")
                page.evaluate("async (sid) => { (await import('/app/js/views/sessionsheet.js')).openRetagSheet(sid); }", sid)
                page.wait_for_selector('.retag-chips .chip')
                for sel in ['.sheet', '.retag-chips .chip', '.retag .btn', '.retag-note']:
                    check(sel, 'Tag-ändern-Sheet')
                small = page.evaluate("""() => [...document.querySelectorAll('.retag .chip, .retag .btn, .session-detail .btn')]
                  .filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => e.className)""")
                total.extend({'view': f'{vp} Tag-ändern-Sheet', 'why': f'Tippfläche < 44 px: {c}'} for c in small)
                if w == 375 and sid == 's3':
                    page.screenshot(path=f'{shots}/ui_tagedit_sheet_{vp}.png')
                page.evaluate("document.getElementById('sheets').replaceChildren()")
            small = page.evaluate("""() => [...document.querySelectorAll('.session-row')].filter((e) => e.getBoundingClientRect().height < 43.5).length""")
            if small:
                total.append({'view': f'{vp} Statistik', 'why': 'Session-Zeile < 44 px'})

            # --- Mehr: Tag-Liste ---------------------------------------------------
            page.evaluate("location.hash = '#/einstellungen'")
            page.wait_for_selector('.tag-item')
            check('.tag-item', 'Mehr')

            # --- Shop gesperrt: Preis-Buttons, Vorschau mit Region-Hinweis --------
            boot(page, base, all_unlocked=False)
            shop_pass('gesperrt')
            total.extend({'view': f'{vp} Funktion', 'why': m} for m in preview_functions(page))
            page.evaluate("location.hash = '#/lernen'")
            page.wait_for_selector('.region-card')
            check('.region-card', 'Lernen/gesperrt')
            check('.plant-pick', 'Lernen/gesperrt')

            if errors:
                total.append({'view': vp, 'why': 'JS-Fehler', 'text': ' | '.join(errors[:3])})
            ctx.close()
        browser.close()
    srv.shutdown()
    return total, stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', default='/home/claude/check')
    a = ap.parse_args()
    os.makedirs(a.shots, exist_ok=True)
    total, stats = run(a.shots)
    boxes = sum(v[0] for v in stats.values())
    texts = sum(v[1] for v in stats.values())
    print(f'Geprüft: {boxes} Kacheln/Karten, {texts} Text-Knoten in {len(stats)} Ansicht/Selektor-Kombinationen, {len(VIEWPORTS)} Viewports')
    if total:
        seen = set()
        for v in total:
            k = json.dumps(v, ensure_ascii=False, sort_keys=True)
            if k in seen:
                continue
            seen.add(k)
            print('VERSTOSS', k)
        from collections import Counter
        c = Counter((v.get('view', '').split(' ')[-1], v.get('box'), v.get('el'), v.get('why', '')[:22]) for v in total)
        for k, n in c.most_common(60):
            print(n, k)
        print(f'{len(total)} Verstöße')
        sys.exit(1)
    print('0 Verstöße')


if __name__ == '__main__':
    main()
