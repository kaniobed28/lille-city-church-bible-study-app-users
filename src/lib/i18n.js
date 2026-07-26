/* ============================================================
   Interface copy, in the reader's language

   Deliberately a plain object rather than an i18n library: there
   are two languages, no pluralisation rules to speak of, and no
   runtime locale loading. Keys are grouped by where they appear.

   Study *content* is not translated here — it comes from Firestore
   in the chosen language, and the reference manual carries its own
   text (see lib/manual.js). This file is only the chrome around it.
   ============================================================ */

const STRINGS = {
  en: {
    appTitle: 'Bible Study App',
    // The browser tab and the installed PWA — keeps the church's name, which
    // the in-page heading leaves to the logo.
    documentTitle: 'Lille City Church Bible Study',
    toggleMenu: 'Toggle menu',
    closeMenu: 'Close menu',
    topics: 'Topics',
    loadingStudies: 'Loading studies',
    loadingStudy: 'Loading study',

    /* sidebar */
    noStudies: 'No studies available',
    week: 'Week',
    referenceManual: 'Reference Manual',

    /* study viewer */
    emptyViewer: 'Select a study from the sidebar to begin reading.',
    downloadPdf: 'Download this study as a PDF',
    pdf: 'PDF',
    preparing: 'Preparing…',
    pdfError: 'Could not generate the PDF. Please try again.',
    mainTexts: 'Main Texts',
    memoryVerse: 'Memory Verse',
    objectives: 'Objectives',
    introduction: 'Introduction',
    questionsAndAnswers: 'Questions & Answers',
    lifeApplication: 'Life Application',
    conclusion: 'Conclusion',
    answersHidden: 'Answers will be revealed by the admin after the studies.',
    readVerseInAssistant: 'Click to read in AI Assistant',

    /* manual */
    fromTheManual: 'From the manual',
    readItHere: 'Read it here',
    hide: 'Hide',
    lessonNotIdentified: 'Lesson not identified',
    backToStudy: 'Back to study',
    reprintedAtEnd: 'reprinted at the end of this document',
    refersToManual: (title) => `This study refers to the ${title} manual.`,

    /* assistant */
    companion: 'Study Companion',
    reading: 'Reading:',
    greeting:
      "Peace be with you. I'm your Lille City Church study companion. Ask me to explain a verse, quote scripture, jump to another week, or switch language — I'm reading this study alongside you.",
    suggestions: [
      "Explain this week's memory verse",
      'Give me John 3:16 (NKJV)',
      'What is the main point of this study?',
      'Passe en français',
    ],
    askPlaceholder: 'Ask about a verse, or say “go to week 3”…',
    // Sent to the assistant when a verse in the study is tapped.
    verseRequest: (verse) =>
      `Please provide the following Bible verse: ${verse}. Use the NKJV version unless I have previously asked for a different version.`,
    messageCompanion: 'Message the study companion',
    newConversation: 'New conversation',
    startNewConversation: 'Start a new conversation',
    closeAssistant: 'Close assistant',
    openCompanion: 'Open study companion',
    askCompanion: 'Ask the Companion',
    assistantTyping: 'Assistant is typing',
    sendMessage: 'Send message',
    bibleStudyAssistant: 'Bible study assistant',
    rateLimit:
      "We're going a little fast and reached the free-tier limit. Give it about 30–60 seconds, then try again.",
    assistantUnreachable:
      "I couldn't reach the assistant just now. Please check your connection and try again in a moment.",

    /* theme */
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',

    /* pdf footer */
    pdfFooter: 'Lille City Church - Bible Study',
  },

  fr: {
    appTitle: 'Application d’Étude Biblique',
    documentTitle: 'Étude Biblique – Lille City Church',
    toggleMenu: 'Afficher ou masquer le menu',
    closeMenu: 'Fermer le menu',
    topics: 'Thèmes',
    loadingStudies: 'Chargement des études',
    loadingStudy: 'Chargement de l’étude',

    noStudies: 'Aucune étude disponible',
    week: 'Semaine',
    referenceManual: 'Manuel de Référence',

    emptyViewer: 'Choisissez une étude dans le menu pour commencer la lecture.',
    downloadPdf: 'Télécharger cette étude en PDF',
    pdf: 'PDF',
    preparing: 'Préparation…',
    pdfError: 'Impossible de générer le PDF. Veuillez réessayer.',
    mainTexts: 'Textes Principaux',
    memoryVerse: 'Verset à Mémoriser',
    objectives: 'Objectifs',
    introduction: 'Introduction',
    questionsAndAnswers: 'Questions & Réponses',
    lifeApplication: 'Application Pratique',
    conclusion: 'Conclusion',
    answersHidden: 'Les réponses seront révélées par l’administrateur après les études.',
    readVerseInAssistant: 'Cliquez pour lire dans l’Assistant IA',

    fromTheManual: 'Extrait du manuel',
    readItHere: 'Lire ici',
    hide: 'Masquer',
    lessonNotIdentified: 'Leçon non identifiée',
    backToStudy: 'Retour à l’étude',
    reprintedAtEnd: 'reproduite à la fin de ce document',
    refersToManual: (title) => `Cette étude renvoie au manuel ${title}.`,

    companion: 'Compagnon d’Étude',
    reading: 'Lecture :',
    greeting:
      'Que la paix soit avec vous. Je suis votre compagnon d’étude de Lille City Church. Demandez-moi d’expliquer un verset, de citer les Écritures, d’aller à une autre semaine ou de changer de langue — je lis cette étude avec vous.',
    suggestions: [
      'Explique le verset à mémoriser de cette semaine',
      'Donne-moi Jean 3:16',
      'Quel est le point principal de cette étude ?',
      'Switch to English',
    ],
    askPlaceholder: 'Posez une question sur un verset, ou dites « va à la semaine 3 »…',
    verseRequest: (verse) =>
      `Donne-moi le verset biblique suivant : ${verse}. Utilise la version Louis Segond, sauf si j’ai demandé une autre version auparavant.`,
    messageCompanion: 'Écrire au compagnon d’étude',
    newConversation: 'Nouvelle conversation',
    startNewConversation: 'Démarrer une nouvelle conversation',
    closeAssistant: 'Fermer l’assistant',
    openCompanion: 'Ouvrir le compagnon d’étude',
    askCompanion: 'Demander au Compagnon',
    assistantTyping: 'L’assistant écrit',
    sendMessage: 'Envoyer le message',
    bibleStudyAssistant: 'Assistant d’étude biblique',
    rateLimit:
      'Nous allons un peu vite et avons atteint la limite de l’offre gratuite. Patientez environ 30 à 60 secondes, puis réessayez.',
    assistantUnreachable:
      'Je n’ai pas pu joindre l’assistant à l’instant. Vérifiez votre connexion et réessayez dans un moment.',

    switchToLight: 'Passer en mode clair',
    switchToDark: 'Passer en mode sombre',

    pdfFooter: 'Lille City Church - Étude Biblique',
  },
};

/* The study `type` comes from Firestore and is written in English even in the
   French collection ("Week 30 · Gospel Sunday"). Translate the values we know
   and pass anything else through untouched, so a new type added in the CMS
   still displays rather than disappearing. */
const STUDY_TYPES = {
  fr: {
    'Bible Study': 'Étude Biblique',
    'Home Cell': 'Cellule de Maison',
    'Special Event': 'Événement Spécial',
    'Gospel Sunday': 'Dimanche d’Évangélisation',
    'Prayer Meeting': 'Réunion de Prière',
  },
};

export const DEFAULT_LANGUAGE = 'en';

/** The interface copy for a language, falling back to English. */
export function t(language = DEFAULT_LANGUAGE) {
  return STRINGS[language] ?? STRINGS[DEFAULT_LANGUAGE];
}

/** A study's type, translated when we recognise it. */
export function studyType(type, language = DEFAULT_LANGUAGE) {
  return STUDY_TYPES[language]?.[type] ?? type;
}

/**
 * The "Week 3 · Bible Study" line above a study. Home cells and special
 * events lead with the type instead, since their week is incidental.
 */
export function studyEyebrow(study, language = DEFAULT_LANGUAGE, separator = '·') {
  const copy = t(language);
  const type = studyType(study.type, language);

  if (study.type === 'Home Cell' || study.type === 'Special Event') {
    return `${type}${study.week ? ` ${separator} ${copy.week} ${study.week}` : ''}`;
  }
  return `${copy.week} ${study.week} ${separator} ${type}`;
}
