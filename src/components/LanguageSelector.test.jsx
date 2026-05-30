import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import LanguageSelector from './LanguageSelector';

describe('LanguageSelector', () => {
  it('renders buttons correctly', () => {
    render(<LanguageSelector language="en" setLanguage={() => {}} />);
    expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    expect(screen.getByTestId('lang-fr')).toBeInTheDocument();
  });

  it('highlights the active language', () => {
    render(<LanguageSelector language="fr" setLanguage={() => {}} />);
    expect(screen.getByTestId('lang-fr')).toHaveClass('active');
    expect(screen.getByTestId('lang-en')).not.toHaveClass('active');
  });

  it('calls setLanguage on click', () => {
    const setLanguage = vi.fn();
    render(<LanguageSelector language="en" setLanguage={setLanguage} />);
    
    fireEvent.click(screen.getByTestId('lang-fr'));
    expect(setLanguage).toHaveBeenCalledWith('fr');
  });
});
