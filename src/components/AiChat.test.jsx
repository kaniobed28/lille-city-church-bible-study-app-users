import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import AiChat from './AiChat';

// The component builds a Gemini model on mount. Stub it so the test never
// reaches the network — we are checking the interface, not the assistant.
vi.mock('../lib/gemini', () => ({
  genAI: { getGenerativeModel: () => ({ startChat: () => ({ sendMessage: vi.fn() }) }) },
  aiTools: [],
}));

const open = (language) => {
  render(<AiChat language={language} currentStudy={null} studies={[]} />);
  fireEvent.click(screen.getByRole('button', { name: language === 'fr' ? /compagnon/i : /companion/i }));
};

describe('AiChat', () => {
  it('greets and prompts in English', () => {
    open('en');
    expect(screen.getByText('Study Companion')).toBeInTheDocument();
    expect(screen.getByText(/Peace be with you/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask about a verse/)).toBeInTheDocument();
    expect(screen.getByText("Explain this week's memory verse")).toBeInTheDocument();
  });

  it('greets and prompts in French', () => {
    open('fr');
    expect(screen.getByText('Compagnon d’Étude')).toBeInTheDocument();
    expect(screen.getByText(/Que la paix soit avec vous/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Posez une question sur un verset/)).toBeInTheDocument();
    expect(screen.getByText('Quel est le point principal de cette étude ?')).toBeInTheDocument();
  });

  it('offers the other language as a suggestion chip', () => {
    open('fr');
    expect(screen.getByText('Switch to English')).toBeInTheDocument();
  });

  it('shows the open study it is reading alongside', () => {
    render(<AiChat language="fr" currentStudy={{ topic: 'Dieu a Donné la Vie' }} studies={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /compagnon/i }));
    expect(screen.getByText(/Lecture :/)).toBeInTheDocument();
    expect(screen.getByText(/Dieu a Donné la Vie/)).toBeInTheDocument();
  });
});
