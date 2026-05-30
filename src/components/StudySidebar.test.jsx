import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import StudySidebar from './StudySidebar';

describe('StudySidebar', () => {
  const mockStudies = [
    { week: '1', topic: 'Topic 1' },
    { week: '2', topic: 'Topic 2' }
  ];

  it('renders empty state correctly', () => {
    render(<StudySidebar studies={[]} />);
    expect(screen.getByTestId('sidebar-empty')).toBeInTheDocument();
  });

  it('renders a list of studies', () => {
    render(<StudySidebar studies={mockStudies} selectedStudyIndex={0} onSelectStudy={() => {}} />);
    expect(screen.getByTestId('sidebar-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-item-1')).toBeInTheDocument();
    expect(screen.getByText('Topic 1')).toBeInTheDocument();
  });

  it('highlights the selected study', () => {
    render(<StudySidebar studies={mockStudies} selectedStudyIndex={1} onSelectStudy={() => {}} />);
    expect(screen.getByTestId('sidebar-item-1')).toHaveClass('active');
    expect(screen.getByTestId('sidebar-item-0')).not.toHaveClass('active');
  });

  it('calls onSelectStudy on click', () => {
    const onSelectStudy = vi.fn();
    render(<StudySidebar studies={mockStudies} selectedStudyIndex={0} onSelectStudy={onSelectStudy} />);
    fireEvent.click(screen.getByTestId('sidebar-item-1'));
    expect(onSelectStudy).toHaveBeenCalledWith(1);
  });
});
