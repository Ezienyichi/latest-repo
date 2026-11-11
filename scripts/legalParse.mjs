// Splits legal-terms.md (five numbered sections) into the five legal pages.
//
// The source document also carries two blocks that are for the site owner and
// must NEVER be published: "Note for you, not the published page" and
// "Before publishing". They are removed wherever they appear, and the result
// is refused outright if either phrase is still present afterwards.

export const SECTION_SLUGS = ['terms', 'privacy', 'returns', 'creator-agreement', 'partner-agreement'];

const NOTE_RE = /note for you,?\s*not the published page/i;
const BEFORE_RE = /^[\s>#*_-]*before publishing\b/i;

const headingLevel = (l) => { const m = /^(#{1,6})\s/.exec(l); return m ? m[1].length : 0; };
const isRule = (l) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);

// Removes every owner-only block; returns { text, removed: [firstLine, …] }.
export function stripOwnerBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = []; const removed = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!(NOTE_RE.test(l) || BEFORE_RE.test(l))) { out.push(l); continue; }
    removed.push(l.trim().slice(0, 80));
    const lvl = headingLevel(l);
    let j = i + 1;
    if (lvl) { while (j < lines.length && !(headingLevel(lines[j]) && headingLevel(lines[j]) <= lvl) && !isRule(lines[j])) j++; }
    else if (/^\s*>/.test(l)) { while (j < lines.length && (/^\s*>/.test(lines[j]) || (lines[j].trim() === '' && /^\s*>/.test(lines[j + 1] || '')))) j++; }
    else { while (j < lines.length && !headingLevel(lines[j]) && !isRule(lines[j])) j++; }   // plain / bold paragraph + whatever follows, up to the next heading or rule
    i = j - 1;
  }
  return { text: out.join('\n'), removed };
}

// The patterns a numbered section heading can take; the first one that yields exactly 1..5 wins.
const HEADING_STYLES = [
  /^#{1,2}\s*(?:section\s*)?(\d+)[.):\s-]+\s*(.+?)\s*#*\s*$/i,
  /^\*\*\s*(?:section\s*)?(\d+)[.):\s-]+\s*(.+?)\s*\*\*\s*$/i,
  /^(\d+)\.\s+(.+?)\s*$/,
];

export function splitSections(text) {
  const lines = text.split('\n');
  for (const re of HEADING_STYLES) {
    const marks = [];
    lines.forEach((l, i) => { const m = re.exec(l); if (m) marks.push({ i, n: parseInt(m[1], 10), title: m[2].replace(/[*_`]/g, '').trim() }); });
    // keep the first occurrence of each of 1..5, in order
    const picked = []; let want = 1;
    for (const mk of marks) if (mk.n === want && want <= 5) { picked.push(mk); want++; }
    if (picked.length !== 5) continue;
    return picked.map((mk, k) => {
      const end = k < 4 ? picked[k + 1].i : lines.length;
      const body = lines.slice(mk.i + 1, end).join('\n').replace(/^\s*\n+/, '').replace(/(\n\s*(-{3,}|\*{3,}|_{3,}))?\s*$/, '').trim();
      return { n: mk.n, heading: mk.title, slug: SECTION_SLUGS[k], body };
    });
  }
  return null;
}

// text → { sections: [{slug, heading, body}], removed } or throws with a clear reason.
export function parseLegalTerms(raw) {
  const { text, removed } = stripOwnerBlocks(raw);
  const sections = splitSections(text);
  if (!sections) throw new Error('Could not find exactly five numbered sections (1–5) in the document — check the headings.');
  for (const s of sections) {
    if (!s.body || s.body.length < 20) throw new Error(`Section ${s.n} ("${s.heading}") is empty.`);
    if (NOTE_RE.test(s.body) || /before publishing/i.test(s.body)) throw new Error(`Section ${s.n} still contains an owner-only note — refusing to publish.`);
  }
  return { sections, removed };
}
