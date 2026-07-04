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
});
