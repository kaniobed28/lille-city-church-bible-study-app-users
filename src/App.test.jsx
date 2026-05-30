import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Mock the entire firebase/firestore module
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn((q, callback) => {
      // Simulate an immediate snapshot callback with mock data
      const mockSnapshot = {
        forEach: (fn) => {
          fn({
            id: 'mock-1',
            data: () => ({ week: '1', type: 'Bible Study', topic: 'Mock Topic' })
          });
        }
      };
      callback(mockSnapshot);
      return vi.fn(); // return a mock unsubscribe function
    }),
  };
});

// Mock the firebase.js initialization
vi.mock('./firebase', () => ({
  db: {}
}));

describe('App Component', () => {
  it('renders the main title and language selector', async () => {
    render(<App />);
    const titleElement = screen.getByTestId('main-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Bible Study App');
    expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    
    await waitFor(() => expect(screen.getByText('Week 1')).toBeInTheDocument());
  });

  it('renders sidebar and viewer', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('study-sidebar')).toBeInTheDocument());
    expect(screen.getByTestId('study-viewer')).toBeInTheDocument();
  });
});
