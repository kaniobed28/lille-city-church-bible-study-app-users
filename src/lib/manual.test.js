import {
  getManual,
  getManualLesson,
  findLessonNumber,
  hasManualReference,
  splitManualReferences,
  lessonToText,
} from './manual';

// The topic and introduction exactly as they read in the French studies —
// this referral is what sent readers off to a booklet they didn't have.
const FRENCH_TOPIC = 'Déployés pour Gagner des Âmes – Leçon 3: Dieu a Donné à l’Humanité la Vie';
const FRENCH_INTRO = '(Se Référer au Manuel Préparez-vous à Gagner des Âmes) 88 88';

describe('manual data', () => {
  it('carries every lesson of the booklet', () => {
    const { manual } = getManual('en');
    expect(manual.lessons).toHaveLength(12);
    expect(manual.parts).toHaveLength(4);
    expect(manual.lessons.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('gives every lesson a title, a memory verse and questions', () => {
    const { manual } = getManual('en');
    for (const lesson of manual.lessons) {
      expect(lesson.title).toBeTruthy();
      expect(lesson.blocks.some((b) => b.type === 'memoryVerse')).toBe(true);
      expect(lesson.blocks.some((b) => b.type === 'questions' && b.items.length > 0)).toBe(true);
      expect(lesson.blocks.some((b) => b.type === 'paragraph')).toBe(true);
    }
  });

  it('serves the French edition to French readers', () => {
    const { manual, isTranslated } = getManual('fr');
    expect(isTranslated).toBe(true);
    expect(manual.language).toBe('fr');
    expect(manual.title).toBe('Préparez-vous à Gagner des Âmes');
    expect(manual.labels.lesson).toBe('Leçon');
  });

  it('flags the French edition as an unofficial translation', () => {
    // Church teaching material: readers must not mistake this for the
    // published French booklet.
    expect(getManual('fr').manual.translationNote).toMatch(/non officielle/i);
    expect(getManual('en').manual.translationNote).toBeUndefined();
  });

  it('falls back to English for a language with no edition', () => {
    const { manual, isTranslated } = getManual('de');
    expect(isTranslated).toBe(false);
    expect(manual.language).toBe('en');
  });

  // The two editions are rendered by the same components and cited by the
  // same lesson numbers, so any structural drift is a bug.
  it('keeps the French edition structurally identical to the English', () => {
    const en = getManual('en').manual;
    const fr = getManual('fr').manual;

    expect(fr.lessons.map((l) => l.number)).toEqual(en.lessons.map((l) => l.number));
    expect(fr.parts.map((p) => p.number)).toEqual(en.parts.map((p) => p.number));

    en.lessons.forEach((enLesson, i) => {
      const frLesson = fr.lessons[i];
      expect(frLesson.title).toBeTruthy();
      expect(frLesson.page).toBe(enLesson.page);
      expect(frLesson.part).toBe(enLesson.part);
      expect(frLesson.blocks.map((b) => b.type)).toEqual(enLesson.blocks.map((b) => b.type));
      expect(frLesson.blocks.map((b) => b.kind ?? null)).toEqual(enLesson.blocks.map((b) => b.kind ?? null));

      enLesson.blocks.forEach((enBlock, j) => {
        const frBlock = frLesson.blocks[j];
        if (enBlock.type === 'questions') expect(frBlock.items).toHaveLength(enBlock.items.length);
        if (enBlock.type === 'memoryVerse') expect(frBlock.verses).toHaveLength(enBlock.verses.length);
        if (enBlock.type === 'heading') expect(frBlock.number).toBe(enBlock.number);
      });
    });
  });

  it('leaves no English text behind in the French edition', () => {
    const fr = getManual('fr').manual;
    const text = fr.lessons
      .flatMap((l) => [l.title, ...l.blocks.flatMap((b) => (
        b.type === 'questions' ? b.items
          : b.type === 'memoryVerse' ? b.verses.map((v) => v.text)
            : [b.text, b.label]
      ))])
      .filter(Boolean)
      .join(' ');

    // Give-away English function words that no French sentence would contain.
    expect(text).not.toMatch(/\b(the|and|you must|which|because|through)\b/i);
    expect(text).toMatch(/\b(que|dans|nous|vous|pour)\b/);
  });

  it('looks a lesson up by number', () => {
    expect(getManualLesson(3).title).toBe('God Gave Humankind Life');
    expect(getManualLesson(99)).toBeNull();
  });
});

describe('findLessonNumber', () => {
  it.each([
    ['Leçon 3: Dieu a Donné à l’Humanité la Vie', 3],
    ['Lesson 12 — How to Disciple People', 12],
    ['LEÇON 7', 7],
    ['Lecon 5 sans accent', 5],
    ['Week 30 · Gospel Sunday', null],
  ])('reads %s', (text, expected) => {
    expect(findLessonNumber(text)).toBe(expected);
  });
});

describe('hasManualReference', () => {
  it.each([
    FRENCH_INTRO,
    'Se référer au manuel',
    '(Refer to the Get Ready to Win Souls Manual)',
    'Please consult the manual before the meeting.',
    'Voir le manuel pour plus de détails',
  ])('detects %s', (text) => {
    expect(hasManualReference(text)).toBe(true);
  });

  it('leaves ordinary prose alone', () => {
    expect(hasManualReference('God gave humankind life, and the Church proclaims it.')).toBe(false);
    expect(hasManualReference('')).toBe(false);
  });
});

describe('splitManualReferences', () => {
  it('resolves the French referral to the matching manual lesson, in French', () => {
    const segments = splitManualReferences(FRENCH_INTRO, { topic: FRENCH_TOPIC, language: 'fr' });

    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('reference');
    expect(segments[0].lessonNumber).toBe(3);
    // Matches the wording the study's own topic uses for this lesson.
    expect(segments[0].lesson.title).toBe('Dieu a Donné à l’Humanité la Vie');
  });

  it('resolves the same referral to the English lesson for English readers', () => {
    const segments = splitManualReferences(FRENCH_INTRO, { topic: FRENCH_TOPIC, language: 'en' });
    expect(segments[0].lesson.title).toBe('God Gave Humankind Life');
  });

  it('swallows the duplicated page numbers left by the import', () => {
    const [segment] = splitManualReferences(FRENCH_INTRO, { topic: FRENCH_TOPIC });
    expect(segment.raw).toContain('88');
    // Nothing but the referral should survive — no orphaned "88 88" text.
    expect(splitManualReferences(FRENCH_INTRO, { topic: FRENCH_TOPIC })).toHaveLength(1);
  });

  it('keeps the prose around a referral', () => {
    const segments = splitManualReferences(
      'Read the passage together. (Se Référer au Manuel Préparez-vous à Gagner des Âmes) Then discuss.',
      { topic: FRENCH_TOPIC }
    );

    expect(segments.map((s) => s.type)).toEqual(['text', 'reference', 'text']);
    expect(segments[0].text.trim()).toBe('Read the passage together.');
    expect(segments[2].text.trim()).toBe('Then discuss.');
  });

  it('stops an unbracketed referral at the end of its sentence', () => {
    const segments = splitManualReferences(
      'Read the passage. Refer to the manual before the meeting. Then pray together.',
      { topic: FRENCH_TOPIC }
    );

    expect(segments.map((s) => s.type)).toEqual(['text', 'reference', 'text']);
    expect(segments[2].text).toContain('Then pray together.');
    expect(segments[1].raw).not.toContain('Then pray');
  });

  it('prefers a lesson number stated inside the referral itself', () => {
    const segments = splitManualReferences('(Refer to the manual, Lesson 9)', {
      topic: 'Leçon 3: something else',
    });
    expect(segments[0].lessonNumber).toBe(9);
    expect(segments[0].lesson.title).toBe('The Witness Must Prepare Themselves');
  });

  it('still flags a referral it cannot pin to a lesson', () => {
    const segments = splitManualReferences('(See the manual)', { topic: 'Gospel Sunday' });
    expect(segments[0].type).toBe('reference');
    expect(segments[0].lessonNumber).toBeNull();
    expect(segments[0].lesson).toBeNull();
  });

  it('returns plain prose untouched', () => {
    const segments = splitManualReferences('God gave humankind life.', {});
    expect(segments).toEqual([{ type: 'text', text: 'God gave humankind life.' }]);
  });

  it('handles empty input', () => {
    expect(splitManualReferences('', {})).toEqual([]);
    expect(splitManualReferences(null, {})).toEqual([]);
  });

  it('is re-runnable — the shared regex does not carry state between calls', () => {
    const first = splitManualReferences(FRENCH_INTRO, { topic: FRENCH_TOPIC });
    const second = splitManualReferences(FRENCH_INTRO, { topic: FRENCH_TOPIC });
    expect(second).toEqual(first);
  });
});

describe('lessonToText', () => {
  it('renders a lesson as briefable plain text', () => {
    const text = lessonToText(getManualLesson(3));

    expect(text).toContain('Lesson 3: God Gave Humankind Life');
    expect(text).toContain('Scripture Reading:');
    expect(text).toContain('Memory Verse:');
    expect(text).toContain('Questions to be Answered:');
    expect(text).toContain('God is the Giver of Life');
  });

  it('is empty for a missing lesson', () => {
    expect(lessonToText(null)).toBe('');
  });
});
