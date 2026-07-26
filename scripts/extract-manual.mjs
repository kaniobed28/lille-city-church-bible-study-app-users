/* ============================================================
   Manual PDF -> structured JSON

   The studies reference an external booklet ("Refer to the Get
   Ready to Win Souls manual, Lesson 3"). Rather than shipping the
   PDF for readers to download, we lift its text into the app so a
   reference can be read inline, offline, in the app's own voice.

   The source is a clean text PDF with a regular layout, so this
   reads geometry rather than guessing at line wraps:
     - the booklet is set recto/verso, so the body margin alternates
       with page parity (odd pages x=72, even x=54); it is measured
       per page rather than assumed
     - line leading inside a paragraph is ~13-14pt; the gap between
       paragraphs is ~18pt or more
     - a numbered point is an item reading exactly "N." at the body
       margin, with its heading starting one indent (18pt) further in

   Usage:
     node scripts/extract-manual.mjs <input.pdf> <output.json> [lang]
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const MEASURE = 270;                 // body column width, pt
const INDENT = 18;                   // hanging indent of a numbered point
const PARAGRAPH_GAP = 16;            // baseline delta that means "new paragraph"
const FULL_LINE_SLACK = 10;          // a line ending this close to the edge ran on
const RUNNING_HEAD_Y = 80;           // page numbers sit near the foot
const MARGIN_RANGE = [50, 76];       // plausible body margins for this booklet

/* --- text hygiene ------------------------------------------------ */

function tidy(value) {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .replace(/…+/g, '')                        // ellipsis answer-leaders
    .replace(/\.{4,}/g, '')                         // dotted answer-leaders
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

const LOWERCASE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'is', 'of',
  'on', 'or', 'the', 'to', 'with',
]);

// Headings are set in all caps in print; restore sentence-friendly casing.
function titleCase(value) {
  const words = tidy(value).toLowerCase().split(' ');
  return words
    .map((word, i) => {
      if (i > 0 && i < words.length - 1 && LOWERCASE_WORDS.has(word)) return word;
      // Skip any opening bracket or quote so "(isaiah 53" capitalises too.
      return word.replace(/[a-zà-ÿ]/, (c) => c.toUpperCase());
    })
    .join(' ');
}

/* --- page -> lines ----------------------------------------------- */

/** Joins a line's text items, restoring the spaces that sit between styled runs. */
function joinParts(parts) {
  return parts.reduce((acc, part, i) => {
    if (i === 0) return part.str;
    const previous = parts[i - 1];
    const gap = part.x - previous.right;
    const needsSpace = gap > 0.5 && !/\s$/.test(acc) && !/^\s/.test(part.str);
    return acc + (needsSpace ? ' ' : '') + part.str;
  }, '');
}

/**
 * Collapses a page's text items into lines, keeping the geometry we need
 * downstream: where the line starts and ends, and whether it opens with a
 * "N." marker at the body margin.
 */
function toLines(items, pageNumber) {
  const rows = new Map();

  for (const item of items) {
    if (!item.str) continue;
    const x = item.transform[4];
    const y = Math.round(item.transform[5] * 10) / 10;
    // Justification nudges baselines by fractions of a point; bucket them.
    const key = [...rows.keys()].find((k) => Math.abs(k - y) < 3) ?? y;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push({ x, right: x + (item.width ?? 0), str: item.str });
  }

  const all = [...rows.entries()]
    .sort((a, b) => b[0] - a[0])                    // PDF origin is bottom-left
    .map(([y, parts]) => {
      parts.sort((a, b) => a.x - b.x);
      const solid = parts.filter((p) => p.str.trim());
      return { y, parts, x: solid[0]?.x ?? parts[0].x, right: solid[solid.length - 1]?.right ?? 0 };
    })
    .filter((line) => line.parts.some((p) => p.str.trim()));

  // The folio is the only bare number at the page foot. It is the page number
  // a reader would cite, which is not the PDF index — the cover shifts it.
  const isFolio = (line) => line.y < RUNNING_HEAD_Y && /^\d+$/.test(joinParts(line.parts).trim());
  const folio = all.find(isFolio);
  const rendered = all.filter((line) => !isFolio(line));

  // Recto/verso: measure the margin instead of assuming it.
  const candidates = rendered.map((l) => l.x).filter((x) => x >= MARGIN_RANGE[0] && x <= MARGIN_RANGE[1]);
  const marginX = candidates.length ? Math.min(...candidates) : (pageNumber % 2 === 0 ? 54 : 72);
  const indentX = marginX + INDENT;

  const columnCentre = marginX + MEASURE / 2;

  const lines = rendered.map((line) => {
    const solid = line.parts.filter((p) => p.str.trim());
    const marker = /^(\d+)\.$/.exec(solid[0].str.trim());
    const numbered = Boolean(marker)
      && Math.abs(solid[0].x - marginX) < 4
      && solid.length > 1
      && solid[1].x >= indentX - 4;

    return {
      y: line.y,
      x: line.x,
      right: line.right,
      rightEdge: marginX + MEASURE,
      // Display type (PART/LESSON markers and their titles) is centred in the
      // measure. Testing for centring rather than "not at the margin" matters:
      // the sub-lists in Lesson 10 sit at a deeper indent but are body text.
      centred: Math.abs((line.x + line.right) / 2 - columnCentre) < 8
        && line.right < marginX + MEASURE - 6,
      // A wrapped question hangs at the indent; new prose returns to the
      // margin. That is what separates a question's second line from the
      // "Review of What Have Been Done" section that follows Lesson 7.
      atIndent: Math.abs(line.x - indentX) < 4,
      numbered,
      number: numbered ? Number(marker[1]) : null,
      text: tidy(joinParts(numbered ? solid.slice(1) : line.parts)),
    };
  }).filter((line) => line.text);

  return { lines, folio: folio ? Number(joinParts(folio.parts).trim()) : null };
}

/* --- lines -> paragraphs ----------------------------------------- */

const STRUCTURAL = /^(PART|LESSON)\s+\d+$/i;

// "Memoriy Verse" and "Scriture Raeding" are typos in the printed booklet,
// hence the loose stems.
const LABEL_LINE = /^(Revision|Scri[a-z]*\s+R[ae]{2}ding|Discussion|Conclusions?|Memor\w*\s+Verse)\s*:/i;

// Most numbered points are laid out as a "N." item plus a tabbed heading, but a
// few are typed as one run (e.g. Lesson 9 point 3), so fall back to the text.
const INLINE_POINT = /^(\d+)\.\s+(?=[A-Z])/;

/**
 * Groups lines into paragraphs by vertical rhythm, then stitches them back
 * together across page breaks when the previous page ended mid-measure —
 * the sentence simply ran out of page.
 */
function toParagraphs(pages) {
  const paragraphs = [];
  let current = null;
  let carryOpen = false;                            // did the last page end mid-paragraph?

  const flush = () => {
    if (current && current.text.trim()) paragraphs.push(current);
    current = null;
  };

  pages.forEach(({ page, folio, lines }) => {
    lines.forEach((line, i) => {
      const previous = lines[i - 1];
      const isPageStart = i === 0;

      const gapBreak = previous ? previous.y - line.y > PARAGRAPH_GAP : false;

      // Centred display type and labelled lines ("Memory Verse:", "Revision:")
      // never continue the running text, whatever the page break implied.
      const startsBlock = line.numbered
        || line.centred
        || STRUCTURAL.test(line.text)
        || LABEL_LINE.test(line.text)
        || (isPageStart ? !carryOpen : gapBreak);

      if (startsBlock || !current) {
        flush();
        current = {
          page,
          folio,
          numbered: line.numbered,
          number: line.number,
          display: line.centred,
          atIndent: line.atIndent,
          text: line.text,
        };
      } else {
        // A line ending in a hyphen was broken mid-token ("Genesis 2:7-" /
        // "17"); rejoining it with a space would invent a range that isn't there.
        const separator = /-$/.test(current.text) ? '' : ' ';
        current.text += separator + line.text;
      }
    });

    const last = lines[lines.length - 1];
    carryOpen = Boolean(last && last.right >= last.rightEdge - FULL_LINE_SLACK);
    if (!carryOpen) flush();
  });

  flush();
  return paragraphs.map((p) => ({ ...p, text: tidy(p.text) }));
}

/* --- paragraphs -> lessons --------------------------------------- */

// Titles are the only all-caps text in the booklet. That is a surer signal
// than centring, because a title long enough to fill the measure reads as an
// ordinary justified line. The contents page is deliberately not used: it
// disagrees with the lesson pages (it lists Lesson 8 as "...Must Receive the
// New Life" where the lesson itself reads "...Must Have..."), and the lesson
// page is what a reader actually sees.
const isAllCaps = (text) => /[A-Z]/.test(text) && !/[a-z]/.test(text);

/* `kind` is the language-independent handle — styling and the French edition
   key off it, so only `label` changes between editions. */
const NOTE_LABELS = [
  { kind: 'revision', label: 'Revision', pattern: /^Revision\s*:\s*/i },
  // Lesson 8 prints it as "Scriture Raeding:"; the loose stems catch the typo
  // without swallowing an unrelated "Scripture ...:" lead-in.
  { kind: 'scriptureReading', label: 'Scripture Reading', pattern: /^Scri[a-z]*\s+R[ae]{2}ding\s*:\s*/i },
  { kind: 'discussion', label: 'Discussion', pattern: /^Discussion\s*:\s*/i },
  { kind: 'conclusion', label: 'Conclusion', pattern: /^Conclusions?\s*:\s*/i },
  { kind: 'memoryVerse', label: 'Memory Verse', pattern: /^Memor\w*\s+Verse\s*:\s*/i },
];
const QUESTIONS_HEADING = /^questions\s+to\s+be\s+answered$/i;

function matchNote(text) {
  return NOTE_LABELS.find((entry) => entry.pattern.test(text)) ?? null;
}

// Each memory verse is printed as the text followed by " - <reference>";
// separating them lets the reader see the citation set apart from the verse.
const VERSE_CITATION = /\s[-–—]\s*((?:[1-3]\s)?[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?\s\d+:\d+(?:[-–,\s\d:]*\d)?)\.?\s*$/;

/**
 * Turns the paragraphs following "Memory Verse:" into cited verses. A verse
 * broken over a page turn arrives as two paragraphs with the citation only on
 * the last, so text accumulates until a citation closes it off.
 */
function buildVerses(entries) {
  const verses = [];
  let buffer = '';

  for (const entry of entries) {
    const match = VERSE_CITATION.exec(entry);
    const body = tidy(`${buffer} ${match ? entry.slice(0, match.index) : entry}`);
    if (match) {
      verses.push({ text: body, reference: tidy(match[1]) });
      buffer = '';
    } else {
      buffer = body;
    }
  }

  if (buffer) verses.push({ text: buffer, reference: null });
  return verses;
}

function parseLessons(paragraphs) {
  const parts = [];
  const lessons = [];

  let lesson = null;
  let partNumber = null;
  let pendingPart = null;
  let expectTitle = false;
  let titleLines = [];

  let mode = 'body';                                // 'body' | 'memoryVerse' | 'questions'
  let memoryHeader = null;
  let memoryBody = [];

  const closeMemoryVerse = () => {
    if (mode === 'memoryVerse' && memoryHeader && lesson) {
      lesson.blocks.push({
        type: 'memoryVerse',
        reference: tidy(memoryHeader.replace(NOTE_LABELS[4].pattern, '')).replace(/[.;]$/, ''),
        verses: buildVerses(memoryBody),
      });
    }
    memoryHeader = null;
    memoryBody = [];
  };

  const closeLesson = () => {
    closeMemoryVerse();
    mode = 'body';
    lesson = null;
  };

  const commitTitle = () => {
    if (lesson && !lesson.title && titleLines.length) {
      lesson.title = titleCase(titleLines.join(' '));
    }
    titleLines = [];
    expectTitle = false;
  };

  for (const paragraph of paragraphs) {
    const { text } = paragraph;

    const partMatch = /^PART\s+(\d+)$/i.exec(text);
    if (partMatch) {
      commitTitle();
      closeLesson();
      partNumber = Number(partMatch[1]);
      pendingPart = { number: partNumber, title: '', lines: [] };
      parts.push(pendingPart);
      continue;
    }

    const lessonMatch = /^LESSON\s+(\d+)$/i.exec(text);
    if (lessonMatch) {
      commitTitle();
      closeLesson();
      if (pendingPart) {
        pendingPart.title = titleCase(pendingPart.lines.join(' '));
        delete pendingPart.lines;
        pendingPart = null;
      }
      lesson = {
        number: Number(lessonMatch[1]),
        part: partNumber,
        page: paragraph.folio ?? paragraph.page,
        title: '',
        blocks: [],
      };
      lessons.push(lesson);
      expectTitle = true;
      titleLines = [];
      continue;
    }

    // Display type immediately after a PART/LESSON marker is its title.
    const isTitleLine = paragraph.display || isAllCaps(text);

    if (pendingPart && isTitleLine) {
      pendingPart.lines.push(text);
      continue;
    }

    if (expectTitle) {
      if (isTitleLine) {
        titleLines.push(text);
        continue;
      }
      commitTitle();
    }

    if (!lesson) continue;                          // front/back matter, kept out of the lessons

    if (QUESTIONS_HEADING.test(text)) {
      closeMemoryVerse();
      mode = 'questions';
      lesson.blocks.push({ type: 'questions', items: [] });
      continue;
    }

    const note = matchNote(text);

    if (note?.label === 'Memory Verse') {
      closeMemoryVerse();
      mode = 'memoryVerse';
      memoryHeader = text;
      memoryBody = [];
      continue;
    }

    if (note) {
      closeMemoryVerse();
      mode = 'body';
      lesson.blocks.push({
        type: 'note',
        kind: note.kind,
        label: note.label,
        text: tidy(text.replace(note.pattern, '')),
      });
      continue;
    }

    if (mode === 'memoryVerse') {
      if (paragraph.numbered) {
        closeMemoryVerse();
        mode = 'body';
      } else {
        memoryBody.push(text);
        continue;
      }
    }

    if (mode === 'questions') {
      const block = lesson.blocks[lesson.blocks.length - 1];
      if (block?.type !== 'questions') {
        mode = 'body';
      } else if (paragraph.numbered) {
        block.items.push(text);
        continue;
      } else if (block.items.length && paragraph.atIndent) {
        // Hanging at the indent: the tail of the question above.
        block.items[block.items.length - 1] = tidy(`${block.items[block.items.length - 1]} ${text}`);
        continue;
      } else if (!block.items.length) {
        continue;
      } else {
        mode = 'body';                                // back at the margin: new prose
      }
    }

    if (paragraph.numbered) {
      lesson.blocks.push({ type: 'heading', number: paragraph.number, text: titleCase(text) });
      continue;
    }

    // A point typed as a single run rather than marker-plus-tab. Keep it tight
    // so a paragraph that merely opens with a numeral isn't promoted.
    const inline = INLINE_POINT.exec(text);
    if (inline && text.length < 70 && !/[.!?]$/.test(text)) {
      lesson.blocks.push({
        type: 'heading',
        number: Number(inline[1]),
        text: titleCase(text.replace(INLINE_POINT, '')),
      });
      continue;
    }

    lesson.blocks.push({ type: 'paragraph', text });
  }

  commitTitle();
  closeLesson();

  return { parts: parts.filter((p) => p.title), lessons };
}

/* --- driver ------------------------------------------------------- */

const [, , input, output, language = 'en'] = process.argv;

if (!input || !output) {
  console.error('usage: node scripts/extract-manual.mjs <input.pdf> <output.json> [lang]');
  process.exit(1);
}

const data = new Uint8Array(fs.readFileSync(input));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

const pages = [];
for (let n = 1; n <= doc.numPages; n += 1) {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  pages.push({ page: n, ...toLines(content.items, n) });
}

const paragraphs = toParagraphs(pages);
const { parts, lessons } = parseLessons(paragraphs);

const manual = {
  id: 'get-ready-to-win-souls',
  language,
  title: 'Get Ready to Win Souls',
  subtitle: "'Unleashed to Win Souls in All Spheres' Project",
  publisher: 'The Church of Pentecost / Ghana Evangelism Committee',
  copyright: '© Ghana Evangelism Committee, 2025. Reproduced for study use within The Church of Pentecost.',
  // Part of the document rather than app chrome, so they travel with the
  // edition and are translated alongside it.
  labels: {
    lesson: 'Lesson',
    part: 'Part',
    memoryVerse: 'Memory Verse',
    questions: 'Questions to be Answered',
  },
  parts,
  lessons,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manual, null, 2)}\n`, 'utf8');

const count = (lesson, type) => lesson.blocks.filter((b) => b.type === type).length;
console.log(`${lessons.length} lessons, ${parts.length} parts -> ${output}`);
for (const lesson of lessons) {
  const questions = lesson.blocks.find((b) => b.type === 'questions')?.items.length ?? 0;
  console.log(
    `  Lesson ${String(lesson.number).padStart(2)} p.${String(lesson.page).padStart(2)}`
    + ` | ${count(lesson, 'heading')} points, ${count(lesson, 'paragraph')} paras,`
    + ` ${questions} questions, ${count(lesson, 'memoryVerse') ? 'verse' : 'NO VERSE'}`
    + ` | ${lesson.title}`
  );
}
