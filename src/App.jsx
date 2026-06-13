import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';
import LanguageSelector from './components/LanguageSelector';
import StudySidebar from './components/StudySidebar';
import StudyViewer from './components/StudyViewer';
import AiChat from './components/AiChat';
import ThemeToggle from './components/ThemeToggle';
function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');
  const [studies, setStudies] = useState([]);
  const [selectedStudyIndex, setSelectedStudyIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  // Subscribe to Firestore studies when language changes
  useEffect(() => {
    setLoading(true);
    const collectionName = language === 'en' ? 'english_studies' : 'french_studies';
    
    // We order by week if we assume the week is stored as a sortable field or we just fetch everything.
    // Assuming 'week' is a string like "Week 1", "Week 2", it might sort alphabetically (1, 10, 11, 2). 
    // To keep it simple, let's just fetch and let the JSON structure's original order persist if possible, 
    // but Firestore doesn't guarantee order without orderBy. We will add an `orderId` when uploading.
    const q = query(collection(db, collectionName), orderBy('orderId'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.isPublished !== false) {
          fetched.push({ id: d.id, ...data });
        }
      });
      setStudies(fetched);
      
      // Attempt to restore the user's previously selected study by orderId
      const savedOrderId = localStorage.getItem('app_saved_orderId');
      let targetIndex = 0;
      if (savedOrderId !== null && fetched.length > 0) {
        const foundIndex = fetched.findIndex(s => s.orderId && s.orderId.toString() === savedOrderId);
        if (foundIndex !== -1) {
          targetIndex = foundIndex;
        }
      }
      setSelectedStudyIndex(targetIndex);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching studies from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  const currentStudy = studies[selectedStudyIndex] || null;

  // Cache the currently viewed study so it persists on refresh
  useEffect(() => {
    if (currentStudy && currentStudy.orderId !== undefined) {
      localStorage.setItem('app_saved_orderId', currentStudy.orderId.toString());
    }
  }, [currentStudy]);

  const [aiQuery, setAiQuery] = useState('');

  const handleSelectStudy = (index) => {
    setSelectedStudyIndex(index);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleVerseClick = (verse) => {
    setAiQuery(`Please provide the following Bible verse: ${verse}. Use the NKJV version unless I have previously asked for a different version.`);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Toggle menu">
            ☰
          </button>
          <h1 className="app-title" data-testid="main-title">Bible Study App</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LanguageSelector language={language} setLanguage={setLanguage} />
          <ThemeToggle />
        </div>
      </header>
      
      <main className="dashboard-layout">
        <aside className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header-mobile">
            <h2>Topics</h2>
            <button className="close-btn" onClick={toggleSidebar}>✕</button>
          </div>
          {loading ? (
             <div className="sidebar-empty">Loading...</div>
          ) : (
            <StudySidebar 
              studies={studies} 
              selectedStudyIndex={selectedStudyIndex}
              onSelectStudy={handleSelectStudy}
            />
          )}
        </aside>
        
        {isSidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}

        <section className="viewer-container">
          {loading ? (
            <div className="viewer-empty">Loading study...</div>
          ) : (
            <StudyViewer study={currentStudy} onVerseClick={handleVerseClick} />
          )}
        </section>
      </main>

      <AiChat 
        currentStudy={currentStudy} 
        setLanguage={setLanguage} 
        studies={studies} 
        onSelectStudy={handleSelectStudy} 
        externalQuery={aiQuery}
        clearExternalQuery={() => setAiQuery('')}
      />
    </div>
  );
}

export default App;
