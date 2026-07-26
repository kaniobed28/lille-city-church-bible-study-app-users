import { render, screen } from '@testing-library/react';
import StudyViewer from './StudyViewer';

describe('StudyViewer', () => {
  const mockStudy = {
    week: '1',
    type: 'Bible Study',
    topic: 'Test Topic',
    mainTexts: 'John 3:16',
    memoryVerse: 'Jesus wept.',
    introduction: 'Intro text',
    rawQuestionsAndAnswers: 'Q1?',
    rawLifeApplication: 'Apply this.',
    conclusion: 'The end.'
  };

  it('renders empty state correctly', () => {
    render(<StudyViewer study={null} />);
    expect(screen.getByTestId('viewer-empty')).toBeInTheDocument();
  });

  it('renders study content correctly', () => {
    render(<StudyViewer study={mockStudy} />);

    expect(screen.getByTestId('study-viewer')).toBeInTheDocument();
    expect(screen.getByText('Week 1 · Bible Study')).toBeInTheDocument();
    expect(screen.getByText('Test Topic')).toBeInTheDocument();
    expect(screen.getByText('John 3:16')).toBeInTheDocument();
    expect(screen.getByText('Jesus wept.')).toBeInTheDocument();
    expect(screen.getByText('Intro text')).toBeInTheDocument();
  });

  it('renders its chrome in French', () => {
    render(<StudyViewer study={mockStudy} language="fr" />);

    expect(screen.getByText('Semaine 1 · Étude Biblique')).toBeInTheDocument();
    expect(screen.getByText('Textes Principaux')).toBeInTheDocument();
    expect(screen.getByText('Verset à Mémoriser')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    // The study's own text comes from Firestore and is never translated here.
    expect(screen.getByText('Intro text')).toBeInTheDocument();
  });

  it('shows the empty state in French', () => {
    render(<StudyViewer study={null} language="fr" />);
    expect(screen.getByText(/Choisissez une étude/)).toBeInTheDocument();
  });

  it('hides answers with a French notice', () => {
    render(
      <StudyViewer
        study={{ ...mockStudy, questions: [{ question: 'Pourquoi ?', answers: ['Parce que.'] }] }}
        language="fr"
      />
    );

    expect(screen.getByText(/révélées par l’administrateur/)).toBeInTheDocument();
    expect(screen.queryByText('Parce que.')).not.toBeInTheDocument();
  });
});
