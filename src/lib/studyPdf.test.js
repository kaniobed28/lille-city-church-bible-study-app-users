import { describe, it, expect, vi, afterEach } from 'vitest';
import { createStudyPdf, buildFileName } from './studyPdf';

// 1x1 transparent PNG
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function mockLogo() {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    blob: async () => new Blob([Uint8Array.from(atob(PIXEL), (c) => c.charCodeAt(0))], { type: 'image/png' }),
  })));
}

const study = {
  week: '3',
  type: 'Bible Study',
  topic: 'Walking in the Light',
  mainTexts: '1 John 1:5-10',
  memoryVerse: 'If we walk in the light, as he is in the light, we have fellowship.',
  objectives: ['Understand fellowship', 'Confess honestly'],
  introduction: 'John opens with a declaration about God.',
  questions: [{ question: 'What does light mean here?', answers: ['Purity and truth.'] }],
  lifeApplications: ['Keep short accounts with God.'],
  conclusion: 'Light exposes so that it can heal.',
};

describe('studyPdf', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('embeds the church logo when it loads', async () => {
    mockLogo();
    const doc = await createStudyPdf(study);
    expect(Object.keys(doc.internal.collections).some((k) => k.includes('addImage'))).toBe(true);
  });

  it('still produces a PDF when the logo cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const doc = await createStudyPdf(study);
    expect(doc.output('blob').size).toBeGreaterThan(0);
  });

  it('generates a multi-field study without throwing', async () => {
    const doc = await createStudyPdf(study);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.output('blob').size).toBeGreaterThan(0);
  });

  it('handles a sparse study with only a topic', async () => {
    await expect(createStudyPdf({ topic: 'Untitled', week: '1', type: 'Bible Study' })).resolves.toBeDefined();
  });

  it('folds non-Latin-1 characters instead of failing on them', async () => {
    await expect(
      createStudyPdf({ ...study, topic: 'Grâce — “vivre” dans la lumière ✦', conclusion: 'Fin… 🙏' })
    ).resolves.toBeDefined();
  });

  it('paginates long studies', async () => {
    const long = { ...study, introduction: 'Lorem ipsum dolor sit amet. '.repeat(400) };
    const doc = await createStudyPdf(long);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('names the file from the week and topic', () => {
    expect(buildFileName(study)).toBe('week-3-walking-in-the-light.pdf');
  });

  it('falls back when the topic is missing', () => {
    expect(buildFileName({ week: '2' })).toBe('week-2.pdf');
  });
});
