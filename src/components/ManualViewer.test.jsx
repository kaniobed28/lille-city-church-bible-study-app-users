import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ManualViewer from './ManualViewer';

describe('ManualViewer', () => {
  const setup = (props = {}) => {
    const onSelectLesson = vi.fn();
    const onClose = vi.fn();
    render(
      <ManualViewer
        lessonNumber={3}
        language="en"
        onSelectLesson={onSelectLesson}
        onClose={onClose}
        {...props}
      />
    );
    return { onSelectLesson, onClose };
  };

  it('reads a lesson of the manual', () => {
    setup();
    expect(screen.getByTestId('manual-viewer')).toBeInTheDocument();
    expect(screen.getByText('Get Ready to Win Souls')).toBeInTheDocument();
    expect(screen.getByTestId('manual-lesson-3')).toBeInTheDocument();
    expect(screen.getByText('God Gave Humankind Life')).toBeInTheDocument();
  });

  it('shows which part of the booklet the lesson belongs to', () => {
    setup();
    expect(screen.getByText(/Part 2:/)).toBeInTheDocument();
  });

  it('steps to the next and previous lesson', () => {
    const { onSelectLesson } = setup();

    fireEvent.click(screen.getByRole('button', { name: /Lesson 4/ }));
    expect(onSelectLesson).toHaveBeenCalledWith(4);

    fireEvent.click(screen.getByRole('button', { name: /Lesson 2/ }));
    expect(onSelectLesson).toHaveBeenCalledWith(2);
  });

  it('has no previous step on the first lesson, nor a next on the last', () => {
    const { unmount } = render(
      <ManualViewer lessonNumber={1} language="en" onSelectLesson={() => {}} onClose={() => {}} />
    );
    expect(screen.queryByRole('button', { name: /← Lesson/ })).not.toBeInTheDocument();
    unmount();

    render(<ManualViewer lessonNumber={12} language="en" onSelectLesson={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /Lesson \d+ →/ })).not.toBeInTheDocument();
  });

  it('returns to the study', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /back to study/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing for a lesson that is not in the manual', () => {
    const { container } = render(
      <ManualViewer lessonNumber={99} language="en" onSelectLesson={() => {}} onClose={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('reads the French edition for a French reader', () => {
    render(<ManualViewer lessonNumber={3} language="fr" onSelectLesson={() => {}} onClose={() => {}} />);

    expect(screen.getByText('Préparez-vous à Gagner des Âmes')).toBeInTheDocument();
    expect(screen.getByText('Dieu a Donné à l’Humanité la Vie')).toBeInTheDocument();
    expect(screen.getByText(/Partie 2:/)).toBeInTheDocument();
    expect(screen.getByText(/non officielle/i)).toBeInTheDocument();
    expect(screen.queryByText('God Gave Humankind Life')).not.toBeInTheDocument();
  });

  it('steps between lessons in French too', () => {
    const onSelectLesson = vi.fn();
    render(
      <ManualViewer lessonNumber={3} language="fr" onSelectLesson={onSelectLesson} onClose={() => {}} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Leçon 4/ }));
    expect(onSelectLesson).toHaveBeenCalledWith(4);
  });

  it('credits the publisher in the masthead and the copyright line', () => {
    setup();
    expect(screen.getByText(/The Church of Pentecost \/ Ghana Evangelism Committee/)).toBeInTheDocument();
    expect(screen.getByText(/© Ghana Evangelism Committee, 2025/)).toBeInTheDocument();
  });
});
