// Minimal UML sequence-diagram renderer: spec -> SVG string.
// Spec: { participants: [{ id, label, stereo?, actor? }], steps: [...] }
// Steps:
//   { from, to, label }                  synchronous call (solid, filled head)
//   { from, to, label, ret: true }       return (dashed, open head)
//   { from, to: same, label }            self-call (loop on the lifeline)
//   { frag: 'alt'|'opt'|'loop'|'tx', guard }  open a combined fragment
//   { else: '[guard]' }                  operand separator inside alt
//   { end: true }                        close the innermost fragment
//   { note: 'text', over: [idA, idB] }   note spanning lifelines
//   { divider: 'text' }                  full-width dashed separator

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function render(spec) {
  const P = spec.participants;
  const colW = spec.colW ?? 170;
  const left = 30;
  const boxW = colW - 22;
  const boxH = 50;
  const top = 20;
  const rowH = 34;
  const x = Object.fromEntries(P.map((p, i) => [p.id, left + colW * i + colW / 2]));
  const width = left * 2 + colW * P.length;

  const out = [];
  const frags = [];
  let y = top + boxH + 52;
  const lineH = 13;

  const wrap = (text, max) => {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
  };

  for (const s of spec.steps) {
    if (s.frag) {
      frags.push({ kind: s.frag, guard: s.guard, y0: y - 8, elses: [], xs: [] });
      y += 30;
      continue;
    }
    if (s.else) {
      const f = frags[frags.length - 1];
      f.elses.push({ y: y - 4, guard: s.else });
      y += 40;
      continue;
    }
    if (s.end) {
      const f = frags.pop();
      f.y1 = y - 4;
      drawFrag(f);
      if (frags.length) frags[frags.length - 1].xs.push(...f.xs);
      y += 16;
      continue;
    }
    if (s.divider) {
      out.push(`<line x1="${left}" y1="${y}" x2="${width - left}" y2="${y}" stroke="#9a9a9a" stroke-dasharray="4 4"/>`);
      out.push(`<text x="${width / 2}" y="${y - 6}" text-anchor="middle" class="it">${esc(s.divider)}</text>`);
      y += 30;
      continue;
    }
    if (s.note) {
      const [a, b] = (s.over ?? []).map((id) => x[id]);
      const x0 = Math.min(a, b ?? a) - colW / 2 + 12;
      const x1 = Math.max(a, b ?? a) + colW / 2 - 12;
      const lines = wrap(s.note, Math.floor((x1 - x0) / 6.4));
      const h = lines.length * lineH + 12;
      out.push(`<path d="M${x0} ${y - 10} H${x1 - 10} L${x1} ${y} V${y - 10 + h} H${x0} Z" fill="#fffdf2" stroke="#8a8a8a"/>`);
      lines.forEach((l, i) => out.push(`<text x="${x0 + 8}" y="${y + 4 + i * lineH}" class="nt">${esc(l)}</text>`));
      frags.forEach((f) => f.xs.push(x0, x1));
      y += h + 14;
      continue;
    }
    const xa = x[s.from];
    const xb = x[s.to];
    frags.forEach((f) => f.xs.push(xa, xb));
    if (s.from === s.to) {
      const lines = wrap(s.label, 34);
      lines.forEach((l, i) => out.push(`<text x="${xa + 8}" y="${y - 4 + i * lineH - (lines.length - 1) * lineH}" class="lb">${esc(l)}</text>`));
      out.push(`<path d="M${xa} ${y + 2} H${xa + 26} V${y + 16} H${xa + 4}" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>`);
      out.push(`<path d="M${xa + 4} ${y + 16} l8 -4 v8 z" fill="#1a1a1a"/>`);
      frags.forEach((f) => f.xs.push(xa + 160));
      y += rowH + 4;
      continue;
    }
    const dir = xb > xa ? 1 : -1;
    const mid = (xa + xb) / 2;
    const lines = wrap(s.label, Math.max(28, Math.floor(Math.abs(xb - xa) / 6.2)));
    y += (lines.length - 1) * lineH;
    lines.forEach((l, i) => out.push(`<text x="${mid}" y="${y - 6 - (lines.length - 1 - i) * lineH}" text-anchor="middle" class="lb">${esc(l)}</text>`));
    const tip = xb - dir * 1;
    if (s.ret) {
      out.push(`<line x1="${xa}" y1="${y}" x2="${tip}" y2="${y}" stroke="#1a1a1a" stroke-width="1.1" stroke-dasharray="6 4"/>`);
      out.push(`<path d="M${tip - dir * 10} ${y - 5} L${tip} ${y} L${tip - dir * 10} ${y + 5}" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>`);
    } else {
      out.push(`<line x1="${xa}" y1="${y}" x2="${tip - dir * 9}" y2="${y}" stroke="#1a1a1a" stroke-width="1.1"/>`);
      out.push(`<path d="M${tip} ${y} l${-dir * 10} -5 v10 z" fill="#1a1a1a"/>`);
    }
    y += rowH;
  }

  function drawFrag(f) {
    const xs = f.xs.length ? f.xs : [left + colW / 2, width - left - colW / 2];
    const x0 = Math.max(left - 6, Math.min(...xs) - 60);
    const x1 = Math.min(width - left + 6, Math.max(...xs) + 60);
    const name = f.kind === 'tx' ? 'transaction' : f.kind;
    const tagW = name.length * 7 + 22;
    out.push(`<rect x="${x0}" y="${f.y0}" width="${x1 - x0}" height="${f.y1 - f.y0}" fill="none" stroke="#5a5a5a" stroke-width="1"/>`);
    out.push(`<path d="M${x0} ${f.y0} H${x0 + tagW} V${f.y0 + 12} L${x0 + tagW - 8} ${f.y0 + 20} H${x0} Z" fill="#ffffff" stroke="#5a5a5a" stroke-width="1"/>`);
    out.push(`<text x="${x0 + 6}" y="${f.y0 + 14}" class="fg">${esc(name)}</text>`);
    if (f.guard) out.push(`<text x="${x0 + tagW + 8}" y="${f.y0 + 14}" class="gd">${esc(f.guard)}</text>`);
    for (const e of f.elses) {
      out.push(`<line x1="${x0}" y1="${e.y}" x2="${x1}" y2="${e.y}" stroke="#5a5a5a" stroke-dasharray="6 4"/>`);
      out.push(`<text x="${x0 + 8}" y="${e.y + 15}" class="gd">${esc(e.guard)}</text>`);
    }
  }

  const height = y + 20;
  const head = [];
  for (const p of P) {
    const cx = x[p.id];
    head.push(`<line x1="${cx}" y1="${top + boxH}" x2="${cx}" y2="${height - 10}" stroke="#6a6a6a" stroke-dasharray="5 4"/>`);
    if (p.actor) {
      head.push(`<g stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"><circle cx="${cx}" cy="${top + 7}" r="7"/><line x1="${cx}" y1="${top + 14}" x2="${cx}" y2="${top + 30}"/><line x1="${cx - 10}" y1="${top + 20}" x2="${cx + 10}" y2="${top + 20}"/><line x1="${cx}" y1="${top + 30}" x2="${cx - 8}" y2="${top + 40}"/><line x1="${cx}" y1="${top + 30}" x2="${cx + 8}" y2="${top + 40}"/></g>`);
      head.push(`<rect x="${cx - 60}" y="${top + 43}" width="120" height="16" fill="#ffffff"/>`);
      head.push(`<text x="${cx}" y="${top + 55}" text-anchor="middle" class="pn">${esc(p.label)}</text>`);
    } else {
      head.push(`<rect x="${cx - boxW / 2}" y="${top}" width="${boxW}" height="${boxH}" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.3"/>`);
      if (p.stereo) head.push(`<text x="${cx}" y="${top + 19}" text-anchor="middle" class="st">«${esc(p.stereo)}»</text>`);
      // Shrink long names to fit the box rather than overflow it.
      const fs = Math.min(12.5, (boxW - 10) / (p.label.length * 0.6));
      head.push(`<text x="${cx}" y="${top + (p.stereo ? 37 : 30)}" text-anchor="middle" class="pn" style="font-size:${fs.toFixed(1)}px">${esc(p.label)}</text>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<style>
text{font-family:"Segoe UI",Arial,sans-serif;fill:#111}
.pn{font-size:12.5px;font-weight:600}.st{font-size:10px;fill:#2f6b4a}
.lb{font-size:11px}.gd{font-size:10.5px;font-style:italic;fill:#333}
.fg{font-size:10.5px;font-weight:700}.nt{font-size:10.5px;fill:#333}.it{font-size:10.5px;font-style:italic;fill:#555}
</style>
<rect width="100%" height="100%" fill="#ffffff"/>
${head.join('\n')}
${out.join('\n')}
</svg>`;
}
