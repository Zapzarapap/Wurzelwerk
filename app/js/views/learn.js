// Lernen: Session einrichten und laufende Session anzeigen.
import { h, clear, icon, spriteEl, segmented, confirmDialog, openSheet, tokenBadge, toast } from '../ui.js';
import * as store from '../store.js';
import { CONFIG } from '../config.js';
import { REGIONS, plantsOfRegion, PLANT_BY_ID, REGION_BY_ID, VARIANT_LABELS } from '../plants.js';
import { createActive, elapsedMs, pause, resume, isPaused, timerDone, timerEndAt } from '../sessionlogic.js';
import { growingInfo, plantsForMinutes } from '../growth.js';
import { fmtClock, fmtDuration, fmtTime, daysAgo } from '../format.js';
import { aggregate, streak } from '../stats.js';
import { pickVariant } from '../sprites.js';
import { editTag } from './tageditor.js';

export function mount(root, { navigate }) {
  let timer = null;
  let lastKey = '';
  let finishing = false;

  const setup = () => {
    const s = { ...(store.S.kv.lastSetup || {}) };
    const tags = store.activeTags();
    if (!tags.find((t) => t.id === s.tagId)) s.tagId = tags[0]?.id || null;
    const regions = store.unlockedRegions();
    if (!regions.find((r) => r.id === s.region)) s.region = regions[0]?.id || 'pflanzenhandlung';
    const species = plantsOfRegion(s.region).filter((p) => store.isPlantUnlocked(p.id));
    if (!species.find((p) => p.id === s.species)) s.species = species[0]?.id || null;
    s.mode ||= 'timer';
    s.targetMin ||= CONFIG.defaultTimerMinutes;
    return s;
  };

  const saveSetup = (patch) => store.setKV('lastSetup', { ...setup(), ...patch });

  function render() {
    const a = store.active();
    clearInterval(timer);
    clear(root);
    if (a) renderActive(a);
    else renderSetup();
  }

  // --- Einrichten ------------------------------------------------------------
  function renderSetup() {
    const s = setup();
    const now = Date.now();
    const today = aggregate(store.S.sessions, 'day', new Date());
    const st = streak(store.S.sessions, new Date());

    const page = h('div', { class: 'page learn' });
    page.append(h('header', { class: 'topbar' },
      h('h1', { class: 'brand' }, 'Wurzelwerk'),
      tokenBadge(store.balance()),
    ));

    page.append(h('div', { class: 'today-card' },
      h('div', {}, h('div', { class: 'label' }, 'Heute gelernt'), h('div', { class: 'big' }, fmtDuration(today.total))),
      h('div', { class: 'right' }, h('div', { class: 'label' }, 'Serie'), h('div', { class: 'big' }, `${st} ${st === 1 ? 'Tag' : 'Tage'}`)),
    ));

    // Backup-Erinnerung
    const last = store.S.kv.lastBackupAt;
    const ref = last || store.S.kv.installedAt || now;
    if (store.S.sessions.length && daysAgo(ref, now) >= CONFIG.backupReminderDays) {
      page.append(h('button', { class: 'banner', onclick: () => navigate('einstellungen') },
        icon('share', 16),
        h('span', {}, last ? `Letztes Backup vor ${daysAgo(last, now)} Tagen – jetzt sichern?` : 'Noch kein Backup – jetzt sichern?')));
    }

    // Tag
    const tagRow = h('div', { class: 'chips' });
    for (const t of store.activeTags()) {
      tagRow.append(h('button', {
        class: 'chip' + (t.id === s.tagId ? ' on' : ''),
        style: { '--tag': t.color },
        onclick: () => saveSetup({ tagId: t.id }),
      }, h('span', { class: 'dot' }), t.name));
    }
    tagRow.append(h('button', {
      class: 'chip add',
      onclick: async () => {
        const t = await editTag();
        if (t) saveSetup({ tagId: t.id });
      },
    }, icon('plus', 12), 'Neu'));
    page.append(section('Tag', tagRow));

    // Region
    const regRow = h('div', { class: 'region-row' });
    for (const r of REGIONS) {
      const unlocked = store.isRegionUnlocked(r.id);
      regRow.append(h('button', {
        class: 'region-card ' + r.id + (r.id === s.region ? ' on' : '') + (unlocked ? '' : ' locked'),
        onclick: () => (unlocked ? saveSetup({ region: r.id, species: null }) : navigate('laden')),
      }, h('span', { class: 'rname' }, r.name), unlocked ? null : h('span', { class: 'rlock' }, icon('lock', 12), `${CONFIG.regionPrices[r.id]}`)));
    }
    page.append(section('Region', regRow));

    // Pflanze
    const grid = h('div', { class: 'plant-grid' });
    const avail = plantsOfRegion(s.region).filter((p) => store.isPlantUnlocked(p.id));
    for (const p of avail) {
      grid.append(h('button', {
        class: 'plant-pick' + (p.id === s.species ? ' on' : ''),
        onclick: () => saveSetup({ species: p.id }),
      }, spriteEl(p.id, 5, p.variants[0] || null, 2), h('span', {}, p.name)));
    }
    const lockedCount = plantsOfRegion(s.region).length - avail.length;
    if (lockedCount > 0) {
      grid.append(h('button', { class: 'plant-pick more', onclick: () => navigate('laden') },
        h('span', { class: 'more-n' }, `+${lockedCount}`), h('span', {}, 'im Shop')));
    }
    page.append(section('Pflanze', grid));

    // Modus
    const modeBox = h('div', { class: 'mode-box' });
    modeBox.append(segmented([['timer', 'Timer'], ['endless', 'Endless']], s.mode, (m) => saveSetup({ mode: m })));
    if (s.mode === 'timer') {
      const dur = h('div', { class: 'chips dur' });
      for (const m of CONFIG.timerPresets) {
        dur.append(h('button', { class: 'chip' + (m === s.targetMin ? ' on' : ''), onclick: () => saveSetup({ targetMin: m }) }, m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${m} min`));
      }
      const step = (d) => saveSetup({ targetMin: Math.max(5, Math.min(CONFIG.maxTimerMinutes, s.targetMin + d)) });
      modeBox.append(dur, h('div', { class: 'stepper' },
        h('button', { class: 'icon-btn', 'aria-label': '5 Minuten weniger', onclick: () => step(-5) }, icon('minus', 16)),
        h('div', { class: 'stepper-val' }, fmtDuration(s.targetMin * 60000)),
        h('button', { class: 'icon-btn', 'aria-label': '5 Minuten mehr', onclick: () => step(5) }, icon('plus', 16)),
      ));
      const plants = plantsForMinutes(s.targetMin);
      const txt = !plants.length ? 'Unter 15 Minuten wächst noch nichts.'
        : plants.length === 1 ? `Deine Pflanze erreicht Stufe ${plants[0].stage} von 5.`
          : `Ergibt ${plants.length} Pflanzen (Stufen ${plants.map((p) => p.stage).join(', ')}).`;
      modeBox.append(h('p', { class: 'hint' }, txt));
    } else {
      modeBox.append(h('p', { class: 'hint' }, 'Läuft bis du stoppst. Nach 2 h beginnt eine zweite Pflanze, nach 4 h eine dritte …'));
    }
    page.append(section('Modus', modeBox));

    const canStart = s.tagId && s.species;
    page.append(h('button', {
      class: 'btn primary start',
      disabled: !canStart,
      onclick: async () => {
        const a = createActive({ ...s, variant: pickVariant(s.species) }, Date.now());
        await store.setKV('lastSetup', s);
        await store.setActive(a);
      },
    }, icon('play', 18), 'Session starten'));
    if (!s.tagId) page.append(h('p', { class: 'hint center' }, 'Lege zuerst einen Tag an.'));

    root.append(page);
  }

  function section(title, body) {
    return h('section', { class: 'section' }, h('h3', {}, title), body);
  }

  // --- Laufende Session ------------------------------------------------------
  function renderActive(a) {
    const plant = PLANT_BY_ID[a.species];
    const tag = store.tagById(a.tagId);
    const page = h('div', { class: 'page active-session ' + a.region });

    const stageBox = h('div', { class: 'stage-box' });
    const clockEl = h('div', { class: 'clock' });
    const subEl = h('div', { class: 'clock-sub' });
    const progFill = h('div', { class: 'prog-fill' });
    const progText = h('div', { class: 'prog-text' });
    const doneRow = h('div', { class: 'done-row' });
    const pauseBtn = h('button', { class: 'btn secondary big-btn' });

    page.append(
      h('div', { class: 'session-head' },
        h('span', { class: 'tag-pill', style: { '--tag': tag?.color || '#999' } }, h('span', { class: 'dot' }), store.tagName(a.tagId)),
        h('span', { class: 'muted' }, `${plant?.name || a.species}${a.variant ? ' · ' + (VARIANT_LABELS[a.variant] || a.variant) : ''} · ${a.mode === 'timer' ? 'Timer ' + fmtDuration(a.targetMin * 60000) : 'Endless'}`),
      ),
      stageBox,
      doneRow,
      clockEl,
      subEl,
      h('div', { class: 'prog' }, progFill),
      progText,
      h('div', { class: 'session-actions' },
        pauseBtn,
        h('button', { class: 'btn danger big-btn', onclick: () => askStop() }, icon('stop', 16), 'Beenden'),
      ),
    );
    pauseBtn.addEventListener('click', async () => {
      const cur = store.active();
      if (!cur) return;
      await store.setActive(isPaused(cur) ? resume(cur, Date.now()) : pause(cur, Date.now()));
    });
    root.append(page);

    const tick = () => {
      const cur = store.active();
      if (!cur) return;
      const now = Date.now();
      if (timerDone(cur, now)) {
        finish(true);
        return;
      }
      const ms = elapsedMs(cur, now);
      const min = ms / 60000;
      const gi = growingInfo(min);
      const paused = isPaused(cur);
      if (cur.mode === 'timer') {
        clockEl.textContent = fmtClock(cur.targetMin * 60000 - ms);
        const end = timerEndAt(cur);
        subEl.textContent = paused ? 'Pausiert' : `gelernt ${fmtClock(ms)} · fertig um ${fmtTime(end)}`;
      } else {
        clockEl.textContent = fmtClock(ms);
        subEl.textContent = paused ? 'Pausiert' : gi.index > 0 ? `Pflanze ${gi.index + 1} wächst` : 'Endless';
      }
      page.classList.toggle('paused', paused);
      pauseBtn.replaceChildren(icon(paused ? 'play' : 'pause', 16), paused ? 'Weiter' : 'Pause');
      progFill.style.width = `${Math.round(gi.progress * 100)}%`;
      progText.textContent = gi.nextStage
        ? (gi.stage === 0 ? `Keimt … noch ${Math.ceil(gi.minutesToNext)} min bis Stufe 1` : `Stufe ${gi.stage} · noch ${Math.ceil(gi.minutesToNext)} min bis Stufe ${gi.nextStage}`)
        : 'Ausgewachsen!';
      // Sprite nur bei Stufenwechsel neu
      const key = `${gi.index}|${gi.stage}`;
      if (key !== lastKey) {
        lastKey = key;
        clear(stageBox);
        if (gi.stage === 0) stageBox.append(h('div', { class: 'seed' }, spriteEl(a.species, 1, a.variant, 6)));
        else stageBox.append(spriteEl(a.species, gi.stage, a.variant, 6));
        clear(doneRow);
        for (let i = 0; i < gi.finished; i++) doneRow.append(spriteEl(a.species, 5, a.variant, 1));
      }
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  async function askStop() {
    const a = store.active();
    if (!a) return;
    const min = Math.floor(elapsedMs(a, Date.now()) / 60000);
    if (min < CONFIG.growthSteps[0].minutes) {
      const r = await confirmDialog({
        title: 'Schon aufhören?',
        text: `Unter ${CONFIG.growthSteps[0].minutes} Minuten wächst noch nichts. Die ${min} min zählen trotzdem in deiner Statistik.`,
        ok: 'Beenden', cancel: 'Weiterlernen', extra: { label: 'Verwerfen', value: 'discard' },
      });
      if (r === 'discard') return discard();
      if (r) finish(false);
      return;
    }
    const plants = plantsForMinutes(min);
    const r = await confirmDialog({
      title: 'Session beenden?',
      text: `${fmtDuration(min * 60000)} gelernt – ${plants.length === 1 ? `deine Pflanze erreicht Stufe ${plants[0].stage}` : `${plants.length} Pflanzen wachsen`}.`,
      ok: 'Beenden', cancel: 'Weiterlernen', extra: { label: 'Verwerfen', value: 'discard' },
    });
    if (r === 'discard') return discard();
    if (r) finish(false);
  }

  async function discard() {
    const ok = await confirmDialog({ title: 'Session verwerfen?', text: 'Die Zeit wird nicht gespeichert, es wächst nichts.', ok: 'Verwerfen', danger: true });
    if (ok) {
      await store.setActive(null);
      toast('Session verworfen');
    }
  }

  async function finish(byTimer) {
    if (finishing) return;
    finishing = true;
    clearInterval(timer);
    try {
      const res = await store.finishActive(Date.now());
      if (res && byTimer) chime();
      if (res && !res.shown) { res.shown = true; showResult(res, navigate); }
    } finally {
      finishing = false;
    }
  }

  render();
  const off = store.onChange(() => {
    const k = JSON.stringify([store.active(), store.S.kv.lastSetup, store.S.tags.length, store.S.tags.map((t) => t.name + t.color + t.deleted).join(), store.purchases().length, store.S.sessions.length]);
    if (k !== mount._k) {
      mount._k = k;
      lastKey = '';
      render();
    }
  });
  const onVis = () => { if (!document.hidden) { lastKey = ''; render(); } };
  document.addEventListener('visibilitychange', onVis);
  return {
    unmount() {
      clearInterval(timer);
      off();
      document.removeEventListener('visibilitychange', onVis);
      mount._k = '';
    },
  };
}

export function showResult({ session, plants }, navigate) {
  const nothing = plants.length === 0;
  openSheet((close) => h('div', { class: 'dialog result' },
    h('h2', {}, nothing ? 'Session gespeichert' : 'Geschafft!'),
    h('div', { class: 'result-plants' }, nothing
      ? h('p', { class: 'muted' }, 'Unter 15 Minuten wächst noch nichts – aber jede Minute zählt.')
      : plants.map((p) => spriteEl(p.species, p.stage, p.variant, plants.length > 2 ? 3 : 4))),
    h('div', { class: 'result-stats' },
      h('div', {}, h('div', { class: 'big' }, fmtDuration(session.minutes * 60000)), h('div', { class: 'label' }, 'gelernt')),
      h('div', {}, h('div', { class: 'big' }, '+' + session.tokens), h('div', { class: 'label' }, 'Tokens')),
    ),
    nothing ? null : h('p', { class: 'muted center' }, plants.map((p) => `${PLANT_BY_ID[p.species]?.name} Stufe ${p.stage}`).join(' · ') + ` → ${REGION_BY_ID[session.region]?.name}`),
    h('div', { class: 'dialog-actions' },
      nothing ? null : h('button', { class: 'btn secondary', onclick: () => { close(); navigate('garten', { region: session.region }); } }, 'Zu den Orten'),
      h('button', { class: 'btn primary', onclick: () => close() }, 'Fertig'),
    ),
  ));
}

export function chime() {
  try {
    navigator.vibrate?.([120, 80, 120]);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.06, ac.currentTime + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.14 + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + i * 0.14);
      o.stop(ac.currentTime + i * 0.14 + 0.32);
    });
  } catch { /* egal */ }
}

