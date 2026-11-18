(function () {
  'use strict';
  const TARGET = 5, MIN_ADS = 100000;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null) e.setAttribute(k, v); } kids.flat().forEach(c => c != null && e.append(c)); return e; };
  const dec = (x, d) => x.toFixed(d).replace('.', ',');
  const money = x => { if (x == null || isNaN(x)) return '—'; const a = Math.abs(x);
    if (a >= 1e9) return dec(x / 1e9, 1) + ' tỷ'; if (a >= 1e8) return Math.round(x / 1e6) + ' tr'; if (a >= 1e6) return dec(x / 1e6, 1) + ' tr'; if (a >= 1e3) return Math.round(x / 1e3) + 'K'; return Math.round(x) + 'đ'; };
  const roi = x => (x == null || !isFinite(x)) ? '—' : dec(x, 1) + 'x';
  const pct = x => (x == null || !isFinite(x)) ? '—' : Math.round(x * 100) + '%';
  const int = x => (x == null || isNaN(x)) ? '—' : Math.round(x).toLocaleString('vi-VN');
  const MONTHS = ['2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11'];
  const mLabel = m => 'T' + (+m.slice(5)) + '/' + m.slice(0, 4);

  const S = { mFrom: '2026-03', mTo: '2026-11', dFrom: '2026-10-01', dTo: '2026-10-31', tab: 'good', sub: null,
    page: { bk: { p: 0, size: 10 }, sku: { p: 0, size: 10 } } };
  let D = {};

  /* ---------------- data ---------------- */
  async function load() {
    const names = ['bookings', 'kol_ads', 'creators', 'daily', 'sku_shopee', 'meta', 'ads_month'];
    if (window.FORENCOS_DATA) { D = window.FORENCOS_DATA; }
    else { const res = await Promise.all(names.map(n => fetch('data/' + n + '.json').then(r => r.json()))); names.forEach((n, i) => { D[n] = res[i]; }); }
    $('#updated').textContent = D.meta.updated;
  }

  const GROUPS = [
    { k: 'good', label: 'Hiệu quả', color: '#16A34A' },
    { k: 'rev', label: 'Có DT, ít ads', color: '#0EA5E9' },
    { k: 'low', label: 'ROI < 5', color: '#F59E0B' },
    { k: 'little', label: 'Ít ads, 0 đơn', color: '#CBD5E1' },
    { k: 'none', label: 'Chưa chạy ads', color: '#DC2626' },
  ];
  const REASON = { low: 'Ads >100K, ROI < 5', little: 'Ads ≤100K, chưa ra đơn', none: 'Chưa chạy ads' };

  function bookingCalc() {
    const lo = S.mFrom <= S.mTo ? S.mFrom : S.mTo, hi = S.mFrom <= S.mTo ? S.mTo : S.mFrom;
    const inR = m => m >= lo && m <= hi;
    const adsTotal = Object.entries(D.ads_month).filter(([m]) => inR(m)).reduce((s, [, v]) => s + v, 0);
    const bk = D.bookings.filter(b => inR(b.m)); const fee = bk.reduce((s, b) => s + b.f, 0);
    const K = {};
    D.bookings.forEach(b => { if (b.m > hi) return; const k = K[b.n] || (K[b.n] = { name: b.n, tiers: new Set(), prods: new Set(), vids: [], fee: 0, pub: false, match: b.mt, c: 0, g: 0 });
      if (b.t) k.tiers.add(b.t); if (b.pr) k.prods.add(b.pr); b.v.forEach(v => { if (!k.vids.includes(v)) k.vids.push(v); }); k.fee += b.f; k.pub = k.pub || !!b.p; });
    let adsB = 0, gmvB = 0;
    D.kol_ads.forEach(r => { if (!inR(r.m)) return; adsB += r.c; gmvB += r.g; if (K[r.n]) { K[r.n].c += r.c; K[r.n].g += r.g; } });
    const kols = Object.values(K).filter(k => k.pub).map(k => {
      const grp = k.c > MIN_ADS ? (k.g / k.c >= TARGET ? 'good' : 'low') : (k.g > 0 ? 'rev' : (k.c > 0 ? 'little' : 'none'));
      return { ...k, tier: [...k.tiers].join(', '), prods: [...k.prods], roi: k.c > 0 ? k.g / k.c : null, grp };
    });
    // non-booked creators
    const A = {};
    D.creators.forEach(([acc, m, c, g, v, p]) => { if (!inR(m)) return; const x = A[acc] || (A[acc] = { name: acc, c: 0, g: 0, v: 0, prod: {} }); x.c += c; x.g += g; x.v += v; x.prod[p] = (x.prod[p] || 0) + g + 1; });
    const org = Object.values(A).filter(x => x.c > MIN_ADS && x.g / x.c >= TARGET).map(x => ({ ...x, roi: x.g / x.c, top: Object.entries(x.prod).sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.g - a.g);
    const count = g => kols.filter(k => k.grp === g).length;
    return { adsTotal, adsB, gmvB, fee, nBook: bk.length, kols, org, pub: kols.length, alloc: kols.filter(k => k.c > MIN_ADS).length, count };
  }

  /* ---------------- booking render ---------------- */
  function renderBooking() {
    const R = bookingCalc();
    $('#k-ads').textContent = money(R.adsTotal);
    $('#k-adsb').textContent = money(R.adsB);
    $('#k-fee').textContent = money(R.fee);
    $('#k-nb').textContent = int(R.nBook);
    const r1 = R.adsB ? R.gmvB / R.adsB : null, r2 = (R.adsB + R.fee) ? R.gmvB / (R.adsB + R.fee) : null;
    const kr = $('#k-roi'); kr.textContent = roi(r1); kr.className = 'big ' + (r1 == null ? '' : r1 >= TARGET ? 'good' : 'bad');
    const kb = $('#k-roib'); kb.textContent = roi(r2); kb.className = r2 == null ? '' : r2 >= TARGET ? 'good' : 'bad';
    $('#k-alloc').textContent = int(R.alloc); $('#k-pub').textContent = int(R.pub);
    $('#k-allocp').textContent = R.pub ? pct(R.alloc / R.pub) : '—';

    const bar = $('#st-bar'); bar.replaceChildren(...GROUPS.map(g => el('div', { style: `width:${R.pub ? R.count(g.k) / R.pub * 100 : 0}%;background:${g.color}`, title: g.label })));
    $('#st-legend').replaceChildren(...GROUPS.map(g => el('button', { type: 'button', 'aria-pressed': String(S.tab === g.k || S.sub === g.k), onclick: () => {
      if (g.k === 'good' || g.k === 'rev') { S.tab = g.k; S.sub = null; } else { S.tab = 'bad'; S.sub = S.sub === g.k ? null : g.k; }
      S.page.bk.p = 0; renderBooking(); } },
      el('span', { class: 'dot', style: `background:${g.color}` }), el('b', { text: int(R.count(g.k)) }), el('span', { class: 't', text: g.label }))));

    const lists = {
      good: R.kols.filter(k => k.grp === 'good').sort((a, b) => b.g - a.g),
      rev: R.kols.filter(k => k.grp === 'rev').sort((a, b) => b.g - a.g),
      org: R.org,
      bad: R.kols.filter(k => ['low', 'little', 'none'].includes(k.grp) && (!S.sub || k.grp === S.sub)).sort((a, b) => b.fee - a.fee),
    };
    const badN = R.kols.filter(k => ['low', 'little', 'none'].includes(k.grp)).length;
    const tabs = [['good', 'Hiệu quả', lists.good.length], ['rev', 'Có DT, ít ads', lists.rev.length], ['org', 'Không booking', lists.org.length], ['bad', 'Chưa hiệu quả', badN]];
    $('#bk-tabs').replaceChildren(...tabs.map(([k, l, n]) => el('button', { role: 'tab', 'aria-selected': String(S.tab === k), onclick: () => { S.tab = k; S.sub = null; S.page.bk.p = 0; renderBooking(); } }, `${l} · ${n}`)));

    const rows = lists[S.tab];
    const videoCell = k => { const td = el('td'); if (!k.vids.length) { td.textContent = '—'; td.className = 'muted'; return td; }
      td.append(el('a', { href: k.vids[0], target: '_blank', rel: 'noopener', title: k.vids[0], text: '▶ Xem video' })); if (k.vids.length > 1) td.append(el('span', { class: 'tag', text: '+' + (k.vids.length - 1), title: k.vids.slice(1).join('\n') })); return td; };
    const prodCell = k => { const td = el('td', { title: k.prods.join(', ') }); td.append(k.prods[0] || '—'); if (k.prods.length > 1) td.append(el('span', { class: 'tag', text: '+' + (k.prods.length - 1) })); return td; };
    const nameCell = k => { const td = el('td', { title: k.name + (k.tier ? ' · ' + k.tier : '') }); td.append(el('b', { text: k.name })); if (k.tier) td.append(el('span', { class: 'tag', text: k.tier })); return td; };
    const roiCell = (v, txt) => el('td', { class: 'n ' + (v == null ? 'muted' : v >= TARGET ? 'good' : 'bad'), style: 'font-weight:700', text: txt || roi(v) });
    let head, row, widths;
    if (S.tab === 'org') {
      widths = ['26%', '30%', '10%', '', '', '10%'];
      head = ['Tài khoản', 'Sản phẩm chính', 'Video', 'Ads', 'Doanh thu', 'ROI'];
      row = k => [el('td', { title: k.name }, el('b', { text: k.name })), el('td', { title: k.top, text: k.top }), el('td', { class: 'n', text: int(k.v) }), el('td', { class: 'n', text: money(k.c) }), el('td', { class: 'n', style: 'font-weight:600', text: money(k.g) }), roiCell(k.roi)];
    } else if (S.tab === 'bad') {
      widths = ['20%', '14%', '15%', '', '', '', '18%'];
      head = ['KOC', 'Video', 'Sản phẩm', 'Phí book', 'Ads', 'Doanh thu', 'Lý do'];
      row = k => [nameCell(k), videoCell(k), prodCell(k), el('td', { class: 'n', text: money(k.fee) }), el('td', { class: 'n', text: money(k.c) }), el('td', { class: 'n', text: money(k.g) }), el('td', { title: REASON[k.grp] + (k.match && k.grp === 'none' ? ' · ghép theo: ' + k.match : ''), text: REASON[k.grp] })];
    } else {
      widths = ['21%', '15%', '16%', '', '', '', '10%'];
      head = ['KOC', 'Video', 'Sản phẩm', 'Phí book', 'Ads', 'Doanh thu', 'ROI'];
      row = k => [nameCell(k), videoCell(k), prodCell(k), el('td', { class: 'n', text: money(k.fee) }), el('td', { class: 'n', text: money(k.c) }), el('td', { class: 'n', style: 'font-weight:600', text: money(k.g) }),
        S.tab === 'rev' ? el('td', { class: 'n', style: 'color:#0369A1;font-weight:600', title: 'Có doanh thu dù ads ≤100K: nên thử đẩy ads', text: 'Nên đẩy ads' }) : roiCell(k.roi)];
    }
    renderTable($('#bk-table'), 'bk', head, widths, rows, row, S.tab === 'bad' && S.sub ? 'Không có KOC nào trong nhóm này.' : 'Không có KOC nào trong kỳ này.', S.tab === 'org' ? [2, 3, 4, 5] : S.tab === 'bad' ? [3, 4, 5] : [3, 4, 5, 6]);
  }

  function renderTable(table, key, head, widths, rows, rowFn, empty, numCols) {
    const st = S.page[key]; const pages = Math.max(1, Math.ceil(rows.length / st.size)); if (st.p >= pages) st.p = pages - 1;
    const slice = rows.slice(st.p * st.size, (st.p + 1) * st.size);
    const cg = el('colgroup', {}, widths.map(w => el('col', w ? { style: 'width:' + w } : {})));
    const th = el('thead', {}, el('tr', {}, head.map((h, i) => el('th', { class: numCols.includes(i) ? 'n' : '', text: h }))));
    const tb = el('tbody', {}, slice.length ? slice.map(r => el('tr', {}, rowFn(r))) : el('tr', {}, el('td', { class: 'empty', colspan: head.length, text: empty })));
    table.replaceChildren(cg, th, tb);
    const pg = $(`[data-pager="${key}"]`);
    const sel = el('select', { 'aria-label': 'Số dòng', onchange: e => { st.size = +e.target.value; st.p = 0; rerender(); } }, [10, 20, 50].map(n => el('option', { value: n, ...(n === st.size ? { selected: '' } : {}) }, String(n))));
    const from = rows.length ? st.p * st.size + 1 : 0, to = Math.min(rows.length, (st.p + 1) * st.size);
    pg.replaceChildren(sel, el('span', { text: `${from}–${to} / ${rows.length}` }),
      el('button', { 'aria-label': 'Trang trước', ...(st.p <= 0 ? { disabled: '' } : {}), onclick: () => { st.p--; rerender(); } }, '‹'),
      el('button', { 'aria-label': 'Trang sau', ...(st.p >= pages - 1 ? { disabled: '' } : {}), onclick: () => { st.p++; rerender(); } }, '›'));
  }

  /* ---------------- ecom render ---------------- */
  function renderEcom() {
    let a = S.dFrom, b = S.dTo; if (a > b) [a, b] = [b, a];
    const rows = D.daily.filter(r => r.d >= a && r.d <= b);
    const C = {};
    ['Shopee', 'TikTok'].forEach(ch => { C[ch] = { a: 0, e: 0, o: 0, g: 0, pg: 0, po: 0, paidA: 0, paidG: 0, paidDays: 0, co: 0, cg: 0, rg: 0, cDays: 0, oC: 0 }; });
    rows.forEach(r => { const c = C[r.ch]; c.a += r.a; c.e += r.e; c.o += r.o; c.g += r.g;
      if (r.pg != null) { c.pg += r.pg; c.po += r.po; c.paidA += r.a; c.paidG += r.g; c.paidDays++; }
      if (r.co != null) { c.co += r.co; c.cg += r.cg; c.rg += r.rg; c.cDays++; c.oC += r.o; } });
    const T = k => C.Shopee[k] + C.TikTok[k];
    $('#e-ads').textContent = money(T('a'));
    $('#e-cost').textContent = money(T('a') + T('e'));
    $('#e-gmv').textContent = money(T('g'));
    $('#e-lost').textContent = (C.Shopee.cDays + C.TikTok.cDays) ? money(T('cg') + T('rg')) : '—';
    $('#e-paid').textContent = (C.Shopee.paidDays + C.TikTok.paidDays) ? money(T('pg')) : '—';

    $$('.ch').forEach(card => {
      const ch = card.getAttribute('data-ch'), c = C[ch];
      const hasPaid = c.paidDays > 0, hasCancel = c.cDays > 0;
      const r = hasPaid && c.paidA ? c.pg / c.paidA : null;
      const badge = hasPaid ? el('span', { class: 'badge ' + (r >= TARGET ? 'ok' : 'no'), title: 'ROI = Doanh thu đã thanh toán ÷ Chi phí ads', text: 'ROI ' + roi(r) }) : el('span', { class: 'badge na', text: 'Thiếu dữ liệu' });
      const cr = hasCancel && c.oC ? c.co / c.oC : null;
      const paidShare = hasPaid && c.paidG ? Math.min(1, c.pg / c.paidG) : null;
      const bar = el('div', { class: 'ch-bar' }); if (paidShare != null) bar.append(el('div', { style: `width:${paidShare * 100}%;background:#16A34A` }), el('div', { style: `width:${(1 - paidShare) * 100}%;background:#DC2626` }));
      card.replaceChildren(
        el('div', { class: 'ch-head' }, el('b', { text: ch }), badge),
        el('div', { class: 'ch-grid' },
          el('div', {}, el('div', { class: 'lbl', text: 'Ads' }), el('div', { class: 'v', text: money(c.a) })),
          el('div', {}, el('div', { class: 'lbl', text: 'Đã thanh toán' }), el('div', { class: 'v' + (hasPaid ? '' : ' muted'), text: hasPaid ? money(c.pg) : '—' })),
          el('div', {}, el('div', { class: 'lbl', text: 'Huỷ đơn' }), el('div', { class: 'v ' + (cr == null ? 'muted' : cr > 0.15 ? 'bad' : 'good'), text: cr == null ? '—' : pct(cr) }))),
        bar,
        el('div', { class: 'ch-foot' },
          el('span', { text: paidShare != null ? pct(paidShare) + ' GMV về tiền' : 'GMV đặt ' + money(c.g) }),
          el('span', { text: hasCancel ? `Huỷ ${money(c.cg)} · Hoàn ${money(c.rg)}` : 'Cần file đơn hàng' })));
    });

    const sku = D.sku_shopee.map(r => ({ ...r, lost: r.g - r.p, rate: (r.g - r.p) / r.g })).sort((x, y) => y.rate - x.rate);
    const maxR = Math.max(0.25, ...sku.map(s => s.rate));
    renderTable($('#sku-table'), 'sku', ['Sản phẩm', 'GMV đặt', 'Đã thanh toán', 'Mất', 'Tỷ lệ mất'], ['34%', '', '', '', '22%'], sku,
      s => [el('td', { title: `${s.full} (${s.id})`, text: s.s }), el('td', { class: 'n', text: money(s.g) }), el('td', { class: 'n', text: money(s.p) }),
        el('td', { class: 'n bad', style: 'font-weight:600', text: money(s.lost) }),
        el('td', {}, el('div', { class: 'rate' }, el('div', { class: 'track' }, el('div', { class: 'fill', style: `width:${s.rate / maxR * 100}%;background:${s.rate >= 0.15 ? '#DC2626' : '#F59E0B'}` })), el('b', { text: pct(s.rate) })))],
      'Chưa có dữ liệu SKU.', [1, 2, 3]);
  }

  /* ---------------- routing & controls ---------------- */
  let current = 'booking';
  function rerender() { current === 'booking' ? renderBooking() : renderEcom(); }
  function route() {
    current = location.hash === '#ecom' ? 'ecom' : 'booking';
    $('#page-booking').hidden = current !== 'booking'; $('#page-ecom').hidden = current !== 'ecom';
    $$('[data-nav]').forEach(a => a.getAttribute('data-nav') === current ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    $$('.filters').forEach(f => { f.hidden = f.getAttribute('data-for') !== current; });
    rerender();
  }
  function controls() {
    [['#m-from', 'mFrom'], ['#m-to', 'mTo']].forEach(([id, k]) => { const s = $(id); MONTHS.forEach(m => s.append(el('option', { value: m }, mLabel(m)))); s.value = S[k];
      s.addEventListener('change', () => { S[k] = s.value; S.page.bk.p = 0; renderBooking(); }); });
    [['#d-from', 'dFrom'], ['#d-to', 'dTo']].forEach(([id, k]) => { const i = $(id); i.min = D.meta.daily_min; i.max = D.meta.daily_max; i.value = S[k];
      i.addEventListener('change', () => { if (i.value && i.validity.valid) { S[k] = i.value; renderEcom(); } });
      i.addEventListener('blur', () => { i.value = S[k]; }); });
    window.addEventListener('hashchange', route);
  }

  load().then(() => { controls(); route(); }).catch(err => { document.querySelector('main').prepend(el('p', { class: 'card', style: 'padding:16px;color:#B91C1C', text: 'Không tải được dữ liệu: ' + err.message })); });
})();
