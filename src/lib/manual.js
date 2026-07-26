/* ============================================================
   The reference manual, in the app

   Studies routinely defer to an outside booklet — "(Se Référer au
   Manuel Préparez-vous à Gagner des Âmes)" — which left the reader
   at a dead end: the app had no idea what that manual was. The
   booklet is now extracted into src/data (see scripts/extract-manual.mjs)
   so a referral can be opened and read in place.

   Resolving a referral to a lesson goes, in order:
     1. a lesson number inside the referral itself
     2. a lesson number in the study's topic — the common case, since
        topics read "... – Leçon 3: Dieu a Donné à l'Humanité la Vie"
     3. nothing, in which case the referral still resolves to the
        manual as a whole rather than to dead text
   ============================================================ */

import manualEn from '../data/manual.en.json';
import manualFr from '../data/manual.fr.json';

/* Keyed by app language. The English edition is extracted from the printed
   booklet; the French one is a working translation of it, structurally
   identical block for block, and carries a `translationNote` the UI shows so
   no one mistakes it for the church's published French wording. Drop in the
   official "Préparez-vous à Gagner des Âmes" here when it is available. */
const MANUALS = { en: manualEn, fr: manualFr };
const FALLBACK_LANGUAGE = 'en';

export function getManual(language = FALLBACK_LANGUAGE) {
  const manual = MANUALS[language] ?? MANUALS[FALLBACK_LANGUAGE];
  return { manual, isTranslated: Boolean(MANUALS[language]) };
}

export function getManualLesson(number, language = FALLBACK_LANGUAGE) {
  const { manual } = getManual(language);
  return manual.lessons.find((lesson) => lesson.number === Number(number)) ?? null;
}

/* --- detecting a referral ----------------------------------------- */

/* The cue phrases that introduce a referral, in both editions. Kept as a
   source string so the whole-referral pattern can be composed from it. */
const CUE = [
  'se\\s+r[ée]f[ée]rer\\s+au\\s+manuel',
  'r[ée]f[ée]r(?:ez|er)[-\\s]?vous\\s+au\\s+manuel',
  '(?:consulter|voir)\\s+le\\s+manuel',
  '(?:refer\\s+to|see|consult)\\s+the\\s+[^),.\\n]{0,60}?manual',
  '(?:refer\\s+to|see|consult)\\s+the\\s+manual',
].join('|');

/* A referral may trail the printed page number — often duplicated, as in
   "88 88", an artefact of how the studies were imported from the booklet. */
const PAGE_NUMBERS = '(?:[\\s\\u00a0]*\\d{1,3}\\b)*';

/* Two shapes, and the difference matters. A bracketed referral is fenced by
   its closing bracket, so it may safely contain full stops ("Manual, p. 88").
   A bare one has no such fence and must stop at the end of its own sentence,
   or "Refer to the manual before the meeting. Then pray." would swallow the
   instruction that follows it. Bracketed is tried first, so a referral inside
   brackets is never picked up by the looser pattern. */
const REFERRAL = new RegExp(
  `\\([^)\\n]*?(?:${CUE})[^)\\n]*\\)${PAGE_NUMBERS}`
  + `|(?:${CUE})[^.)\\n]*${PAGE_NUMBERS}`,
  'gi'
);

const LESSON_NUMBER = /(?:le[çc]on|lesson)\s*(?:n[o°]?\s*)?(\d{1,2})/i;

/** Pulls a lesson number out of free text, e.g. a topic or a referral. */
export function findLessonNumber(text) {
  const match = LESSON_NUMBER.exec(String(text ?? ''));
  return match ? Number(match[1]) : null;
}

/**
 * Splits study prose into readable text and the referrals embedded in it.
 * Returns a flat list of segments so a caller can render the text as prose
 * and the referrals as something the reader can actually open.
 *
 * @returns {Array<{type: 'text', text: string} | {type: 'reference', raw: string, lesson: object|null, lessonNumber: number|null}>}
 */
export function splitManualReferences(text, { topic = '', language = FALLBACK_LANGUAGE } = {}) {
  const source = String(text ?? '');
  if (!source.trim()) return [];

  const segments = [];
  let cursor = 0;

  REFERRAL.lastIndex = 0;
  let match;

  while ((match = REFERRAL.exec(source)) !== null) {
    // A zero-length match would spin the loop; guard before anything else.
    if (!match[0].trim()) {
      REFERRAL.lastIndex += 1;
      continue;
    }

    if (match.index > cursor) {
      segments.push({ type: 'text', text: source.slice(cursor, match.index) });
    }

    const lessonNumber = findLessonNumber(match[0]) ?? findLessonNumber(topic);

    segments.push({
      type: 'reference',
      raw: match[0].trim(),
      lessonNumber,
      lesson: lessonNumber === null ? null : getManualLesson(lessonNumber, language),
    });

    cursor = match.index + match[0].length;
  }

  if (cursor < source.length) {
    segments.push({ type: 'text', text: source.slice(cursor) });
  }

  // Collapse the whitespace a lifted referral leaves behind, and drop
  // fragments that were nothing but that whitespace.
  return segments
    .map((segment) => (segment.type === 'text'
      ? { ...segment, text: segment.text.replace(/\s{2,}/g, ' ').replace(/\s+([,;.])/g, '$1') }
      : segment))
    .filter((segment) => segment.type !== 'text' || segment.text.trim());
}

/** True when the text defers to the manual anywhere. */
export function hasManualReference(text) {
  REFERRAL.lastIndex = 0;
  return REFERRAL.test(String(text ?? ''));
}

/* --- plain text, for the assistant and the PDF export -------------- */

/** Renders a lesson as plain text — used to brief the AI and to export. */
export function lessonToText(lesson, language = FALLBACK_LANGUAGE) {
  if (!lesson) return '';

  const { manual } = getManual(language);
  const { labels } = manual;
  const lines = [`${labels.lesson} ${lesson.number}: ${lesson.title}`];

  for (const block of lesson.blocks) {
    if (block.type === 'note') lines.push(`${block.label}: ${block.text}`);
    else if (block.type === 'heading') lines.push(`${block.number}. ${block.text}`);
    else if (block.type === 'paragraph') lines.push(block.text);
    else if (block.type === 'memoryVerse') {
      lines.push(`${labels.memoryVerse}: ${block.reference}`);
      block.verses.forEach((verse) => {
        lines.push(verse.reference ? `${verse.text} - ${verse.reference}` : verse.text);
      });
    } else if (block.type === 'questions') {
      lines.push(`${labels.questions}:`);
      block.items.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    }
  }

  return lines.join('\n');
}
