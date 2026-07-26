import { render, screen, fireEvent } from '@testing-library/react';
import StudyProse from './StudyProse';

// The exact strings the French studies carry — the referral that used to
// leave readers hunting for a booklet they didn't have.
const TOPIC = 'Déployés pour Gagner des Âmes – Leçon 3: Dieu a Donné à l’Humanité la Vie';
const INTRO = '(Se Référer au Manuel Préparez-vous à Gagner des Âmes) 88 88';

describe('StudyProse', () => {
  it('renders ordinary prose as a paragraph', () => {
    render(<StudyProse text="God gave humankind life." topic={TOPIC} language="fr" />);
    expect(screen.getByText('God gave humankind life.')).toBeInTheDocument();
    expect(screen.queryByTestId('manual-reference')).not.toBeInTheDocument();
  });

  it('turns the referral into an openable manual excerpt', () => {
    render(<StudyProse text={INTRO} topic={TOPIC} language="fr" />);

    expect(screen.getByTestId('manual-reference')).toBeInTheDocument();
    expect(screen.getByText(/Leçon 3: Dieu a Donné à l’Humanité la Vie/)).toBeInTheDocument();
    // The raw referral text — and its stray page numbers — must not survive.
    expect(screen.queryByText(/Se Référer au Manuel/)).not.toBeInTheDocument();
    expect(screen.queryByText(/88 88/)).not.toBeInTheDocument();
  });

  it('reveals the manual lesson in place, in the reader’s language', () => {
    render(<StudyProse text={INTRO} topic={TOPIC} language="fr" />);

    expect(screen.queryByTestId('manual-lesson-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /lire ici/i }));

    expect(screen.getByTestId('manual-lesson-3')).toBeInTheDocument();
    expect(screen.getByText(/Dieu est le Donateur de la Vie/)).toBeInTheDocument();
    expect(screen.getByText('Verset à Mémoriser')).toBeInTheDocument();
    expect(screen.getByText('Questions Auxquelles Répondre')).toBeInTheDocument();
    expect(screen.getByText('Lecture Biblique')).toBeInTheDocument();
  });

  it('serves the English lesson to an English reader', () => {
    render(<StudyProse text={INTRO} topic={TOPIC} language="en" />);
    fireEvent.click(screen.getByRole('button', { name: /read it here/i }));

    expect(screen.getByText(/God is the Giver of Life/)).toBeInTheDocument();
    expect(screen.getByText('Memory Verse')).toBeInTheDocument();
  });

  it('marks the French text as an unofficial translation', () => {
    render(<StudyProse text={INTRO} topic={TOPIC} language="fr" />);
    fireEvent.click(screen.getByRole('button', { name: /lire ici/i }));
    expect(screen.getByText(/non officielle/i)).toBeInTheDocument();
  });

  it('adds no such caveat to the English edition', () => {
    render(<StudyProse text={INTRO} topic={TOPIC} language="en" />);
    fireEvent.click(screen.getByRole('button', { name: /read it here/i }));
    expect(screen.queryByText(/non officielle/i)).not.toBeInTheDocument();
  });

  it('collapses again', () => {
    render(<StudyProse text={INTRO} topic={TOPIC} language="fr" />);
    const toggle = screen.getByRole('button', { name: /lire ici/i });

    fireEvent.click(toggle);
    expect(screen.getByTestId('manual-lesson-3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /masquer/i }));
    expect(screen.queryByTestId('manual-lesson-3')).not.toBeInTheDocument();
  });

  it('keeps the surrounding prose readable', () => {
    render(
      <StudyProse
        text={`Read the passage together. ${INTRO} Then discuss it as a group.`}
        topic={TOPIC}
        language="fr"
      />
    );

    expect(screen.getByText('Read the passage together.')).toBeInTheDocument();
    expect(screen.getByText('Then discuss it as a group.')).toBeInTheDocument();
    expect(screen.getByTestId('manual-reference')).toBeInTheDocument();
  });

  it('flags a referral it cannot pin to a lesson rather than dropping it', () => {
    render(<StudyProse text="(See the manual)" topic="Gospel Sunday" language="en" />);
    expect(screen.getByTestId('manual-reference')).toBeInTheDocument();
    expect(screen.getByText(/Lesson not identified/i)).toBeInTheDocument();
  });

  it('renders nothing for empty text', () => {
    const { container } = render(<StudyProse text="" topic={TOPIC} language="fr" />);
    expect(container).toBeEmptyDOMElement();
  });
});
