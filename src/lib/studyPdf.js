/* ============================================================
   Study → PDF
   Lays the study out natively (selectable, searchable text)
   rather than screenshotting the DOM. Mirrors the section
   order and voice of StudyViewer: Times stands in for
   Newsreader, Helvetica for Inter, gold for the labels.

   jsPDF is ~350kB, so it is imported on demand — the reading
   experience shouldn't pay for a feature most sessions skip.
   ============================================================ */

import { splitManualReferences, getManual } from './manual';
import { t, studyEyebrow } from './i18n';

const PAGE = { width: 210, height: 297 };            // A4, mm
const MARGIN = { top: 22, bottom: 20, x: 22 };
const CONTENT_WIDTH = PAGE.width - MARGIN.x * 2;

const ACCENT = [217, 164, 65];                       // --accent  #d9a441
const INK = [26, 24, 22];
const MUTED = [120, 113, 104];

// jsPDF's core fonts are Latin-1 only. French copy is fine; a stray
// smart quote or bullet from the CMS is not, so fold the usual suspects.
const LATIN1_SUBSTITUTES = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'",
  '“': '"', '”': '"', '„': '"',
  '–': '-', '—': '-', '…': '...',
  '•': '-', '→': '->', ' ': ' ',
};

function sanitize(value) {
  return String(value ?? '')
    .replace(/[‘’‚‛“”„–—…•→ ]/g, (c) => LATIN1_SUBSTITUTES[c])
    .replace(/[^\x00-\xFF]/g, '')                    // drop anything Latin-1 can't carry (emoji, ✦)
    .trim();
}

/* --- church logo -------------------------------------------------
   Served from public/ and precached by the PWA (includeAssets in
   vite.config.js), so this resolves offline too. Read once per
   session; a failure just drops the logo rather than the download. */

const LOGO = { width: 34, height: 17 };              // mm, preserves the 283x142 source ratio
let logoPromise = null;

function loadLogo() {
  if (!logoPromise) {
    logoPromise = fetch(`${import.meta.env?.BASE_URL ?? '/'}logo.png`)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('logo unavailable'))))
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }))
      .catch(() => {
        logoPromise = null;                          // don't cache a failure; a later export can retry
        return null;
      });
  }
  return logoPromise;
}

// The hyphen separator keeps the eyebrow inside Latin-1, which jsPDF's
// core fonts are limited to.
const buildEyebrow = (study, language) => studyEyebrow(study, language, '-');

export function buildFileName(study) {
  const week = study.week ? `week-${study.week}` : 'study';
  const topic = sanitize(study.topic)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return topic ? `${week}-${topic}.pdf` : `${week}.pdf`;
}

/**
 * Renders a study document into a jsPDF instance.
 * Exported for testing; use downloadStudyPdf for the user-facing action.
 */
export async function createStudyPdf(study, language = study?.language) {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const copy = t(language);
  let y = MARGIN.top;

  /* --- layout primitives --- */

  const newPage = () => {
    doc.addPage();
    y = MARGIN.top;
  };

  // Reserve vertical space; break to a new page when the block won't fit.
  const reserve = (height) => {
    if (y + height > PAGE.height - MARGIN.bottom) newPage();
  };

  const text = (content, { font = 'times', style = 'normal', size = 11, color = INK, lineHeight = 1.5, indent = 0, gap = 0 } = {}) => {
    const body = sanitize(content);
    if (!body) return;

    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);

    const width = CONTENT_WIDTH - indent;
    const lines = doc.splitTextToSize(body, width);
    const step = (size * lineHeight) / 2.835;        // pt → mm

    lines.forEach((line) => {
      reserve(step);
      doc.text(line, MARGIN.x + indent, y);
      y += step;
    });
    y += gap;
  };

  const sectionLabel = (label) => {
    reserve(16);                                     // don't strand a label at a page foot
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(sanitize(label).toUpperCase(), MARGIN.x, y, { charSpace: 0.35 });
    y += 5;
  };

  const list = (items, { indent = 6 } = {}) => {
    items.forEach((item, i) => {
      const marker = `${i + 1}.`;
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...INK);

      const lines = doc.splitTextToSize(sanitize(item), CONTENT_WIDTH - indent);
      const step = (11 * 1.5) / 2.835;

      reserve(step);
      doc.text(marker, MARGIN.x, y);                 // marker rides the first line
      lines.forEach((line, j) => {
        if (j > 0) reserve(step);
        doc.text(line, MARGIN.x + indent, y);
        y += step;
      });
      y += 2;
    });
    y += 1;
  };

  /* --- study prose, with its manual referrals resolved ---
     A study that says "refer to the manual" would export as the same dead
     instruction, so referrals are noted inline and the lessons they point to
     are reprinted at the end — the download stands on its own. */

  const referenced = new Map();
  const { manual } = getManual(language);

  const prose = (value) => {
    splitManualReferences(value, { topic: study.topic, language })
      .forEach((segment) => {
        if (segment.type !== 'reference') {
          text(segment.text, { gap: 3 });
          return;
        }

        if (segment.lesson) {
          referenced.set(segment.lesson.number, segment.lesson);
          text(
            `From ${manual.title} - ${manual.labels.lesson} ${segment.lesson.number}: ${segment.lesson.title}`
            + ` (${copy.reprintedAtEnd}).`,
            { font: 'helvetica', style: 'italic', size: 9.5, color: MUTED, gap: 3 }
          );
        } else {
          text(copy.refersToManual(manual.title), {
            font: 'helvetica', style: 'italic', size: 9.5, color: MUTED, gap: 3,
          });
        }
      });
  };

  /* --- header --- */

  if (logo) {
    doc.addImage(logo, 'PNG', MARGIN.x, y, LOGO.width, LOGO.height, undefined, 'FAST');
    y += LOGO.height + 9;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  doc.text(sanitize(buildEyebrow(study, language)).toUpperCase(), MARGIN.x, y, { charSpace: 0.4 });
  y += 8;

  text(study.topic, { style: 'normal', size: 22, lineHeight: 1.2, gap: 3 });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(MARGIN.x, y, MARGIN.x + CONTENT_WIDTH, y);
  y += 8;

  /* --- sections, in StudyViewer order --- */

  if (study.mainTexts) {
    sectionLabel(copy.mainTexts);
    text(study.mainTexts, { style: 'italic', gap: 3 });
  }

  if (study.memoryVerse) {
    sectionLabel(copy.memoryVerse);
    const before = y;
    text(study.memoryVerse, { style: 'italic', indent: 6, gap: 3 });
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(MARGIN.x, before - 3.5, MARGIN.x, y - 5);   // gold rule, as in the blockquote
  }

  if (study.objectives?.length) {
    sectionLabel(copy.objectives);
    list(study.objectives);
  }

  if (study.introduction) {
    sectionLabel(copy.introduction);
    prose(study.introduction);
  }

  if (study.questions?.length) {
    sectionLabel(copy.questionsAndAnswers);
    const answersHidden = study.hideAnswers !== false;

    study.questions.forEach((q, i) => {
      text(`${i + 1}. ${q.question}`, { style: 'bold', gap: 1 });
      if (answersHidden) {
        text(copy.answersHidden, {
          font: 'helvetica', size: 9, color: MUTED, indent: 6, gap: 3,
        });
      } else {
        (q.answers || []).forEach((answer) => text(answer, { indent: 6, gap: 1 }));
        y += 2;
      }
    });
  }

  if (study.lifeApplications?.length && !study.hideLifeApplications) {
    sectionLabel(copy.lifeApplication);
    list(study.lifeApplications);
  }

  if (study.conclusion) {
    sectionLabel(copy.conclusion);
    prose(study.conclusion);
  }

  /* --- the manual lessons this study leans on --- */

  for (const lesson of referenced.values()) {
    newPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT);
    doc.text(sanitize(`From ${manual.title}`).toUpperCase(), MARGIN.x, y, { charSpace: 0.4 });
    y += 8;

    text(`${manual.labels.lesson} ${lesson.number}: ${lesson.title}`, { size: 17, lineHeight: 1.25, gap: 3 });

    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.4);
    doc.line(MARGIN.x, y, MARGIN.x + CONTENT_WIDTH, y);
    y += 7;

    for (const block of lesson.blocks) {
      if (block.type === 'note') {
        sectionLabel(block.label);
        text(block.text, { gap: 2 });
      } else if (block.type === 'heading') {
        text(`${block.number}. ${block.text}`, { style: 'bold', gap: 1 });
      } else if (block.type === 'paragraph') {
        text(block.text, { gap: 2 });
      } else if (block.type === 'memoryVerse') {
        sectionLabel(`${manual.labels.memoryVerse} - ${block.reference}`);
        block.verses.forEach((verse) => {
          text(verse.text, { style: 'italic', indent: 6, gap: 0 });
          if (verse.reference) {
            text(`- ${verse.reference}`, { font: 'helvetica', size: 8.5, color: MUTED, indent: 6, gap: 2 });
          }
        });
      } else if (block.type === 'questions') {
        sectionLabel(manual.labels.questions);
        list(block.items);
      }
    }

    text(manual.copyright, { font: 'helvetica', size: 7.5, color: MUTED, gap: 0 });
  }

  /* --- footer: page numbers, added once the page count is known --- */

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(sanitize(copy.pdfFooter), MARGIN.x, PAGE.height - 12);
    doc.text(`${page} / ${pages}`, PAGE.width - MARGIN.x, PAGE.height - 12, { align: 'right' });
  }

  doc.setProperties({
    title: sanitize(study.topic),
    subject: sanitize(buildEyebrow(study, language)),
    creator: 'Lille City Church Bible Study',
  });

  return doc;
}

export async function downloadStudyPdf(study, language) {
  if (!study) return;
  const doc = await createStudyPdf(study, language);
  doc.save(buildFileName(study));
}
