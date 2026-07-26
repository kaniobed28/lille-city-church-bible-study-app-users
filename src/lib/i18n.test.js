import { t, studyType, studyEyebrow, DEFAULT_LANGUAGE } from './i18n';

describe('t', () => {
  it('returns English and French copy', () => {
    expect(t('en').appTitle).toBe('Bible Study App');
    expect(t('fr').appTitle).toBe('Application d’Étude Biblique');
  });

  it('keeps the church’s name in the browser tab in both languages', () => {
    expect(t('en').documentTitle).toContain('Lille City Church');
    expect(t('fr').documentTitle).toContain('Lille City Church');
  });

  it('falls back to English for an unknown or missing language', () => {
    expect(t('de')).toBe(t('en'));
    expect(t()).toBe(t(DEFAULT_LANGUAGE));
  });

  // A missing key renders as "undefined" on screen, so the two dictionaries
  // must stay in step as copy is added.
  it('defines every English key in French too, and nothing extra', () => {
    expect(Object.keys(t('fr')).sort()).toEqual(Object.keys(t('en')).sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(t('fr'))) {
      if (typeof value === 'string') expect(value.trim(), key).not.toBe('');
    }
  });

  it('keeps the suggestion chips the same shape in both languages', () => {
    expect(t('fr').suggestions).toHaveLength(t('en').suggestions.length);
  });

  it('builds the tapped-verse request in the reader’s language', () => {
    expect(t('en').verseRequest('John 3:16')).toContain('John 3:16');
    expect(t('fr').verseRequest('Jean 3:16')).toContain('Jean 3:16');
    expect(t('fr').verseRequest('Jean 3:16')).toMatch(/verset biblique/i);
  });
});

describe('studyType', () => {
  it('translates the types the CMS uses', () => {
    expect(studyType('Bible Study', 'fr')).toBe('Étude Biblique');
    expect(studyType('Gospel Sunday', 'fr')).toBe('Dimanche d’Évangélisation');
  });

  it('leaves English untouched', () => {
    expect(studyType('Bible Study', 'en')).toBe('Bible Study');
  });

  // A type added in the CMS must still show, not vanish.
  it('passes an unknown type through rather than dropping it', () => {
    expect(studyType('Baptism Service', 'fr')).toBe('Baptism Service');
    expect(studyType(undefined, 'fr')).toBeUndefined();
  });
});

describe('studyEyebrow', () => {
  it('leads with the week for ordinary studies', () => {
    const study = { week: '30', type: 'Gospel Sunday' };
    expect(studyEyebrow(study, 'en')).toBe('Week 30 · Gospel Sunday');
    expect(studyEyebrow(study, 'fr')).toBe('Semaine 30 · Dimanche d’Évangélisation');
  });

  it('leads with the type for home cells and special events', () => {
    expect(studyEyebrow({ week: '4', type: 'Home Cell' }, 'fr')).toBe('Cellule de Maison · Semaine 4');
    expect(studyEyebrow({ type: 'Special Event' }, 'fr')).toBe('Événement Spécial');
  });

  it('takes a separator, so the PDF can stay inside Latin-1', () => {
    expect(studyEyebrow({ week: '2', type: 'Bible Study' }, 'fr', '-')).toBe('Semaine 2 - Étude Biblique');
  });
});
