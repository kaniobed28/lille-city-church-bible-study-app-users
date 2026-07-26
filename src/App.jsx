import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { t } from './lib/i18n';
import './App.css';
import LanguageSelector from './components/LanguageSelector';
import StudySidebar from './components/StudySidebar';
import StudyViewer from './components/StudyViewer';
import ManualViewer from './components/ManualViewer';
import AiChat from './components/AiChat';
import ThemeToggle from './components/ThemeToggle';
function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');
  const [studies, setStudies] = useState([]);
  const [selectedStudyIndex, setSelectedStudyIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Non-null when the reader is in the reference manual rather than a study.
  const [manualLesson, setManualLesson] = useState(null);

  const copy = t(language);

  useEffect(() => {
    localStorage.setItem('app_language', language);
    // Screen readers and the browser announce the page in the right language.
    document.documentElement.lang = language;
    document.title = copy.documentTitle;
  }, [language, copy.documentTitle]);

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
    setManualLesson(null);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleSelectManualLesson = (lessonNumber) => {
    setManualLesson(lessonNumber);
    setIsSidebarOpen(false);
  };

  const handleVerseClick = (verse) => {
    setAiQuery(copy.verseRequest(verse));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label={copy.toggleMenu}>
            ☰
          </button>
          <h1 className="app-title" data-testid="main-title">{copy.appTitle}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LanguageSelector language={language} setLanguage={setLanguage} />
          <ThemeToggle language={language} />
        </div>
      </header>
      
      <main className="dashboard-layout">
        <aside className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header-mobile">
            <h2>{copy.topics}</h2>
            <button className="close-btn" onClick={toggleSidebar} aria-label={copy.closeMenu}>✕</button>
          </div>
          {loading ? (
            <div className="study-sidebar" aria-busy="true" aria-label={copy.loadingStudies}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="sidebar-item skeleton-item">
                  <div className="skeleton skeleton-line short"></div>
                  <div className="skeleton skeleton-line"></div>
                </div>
              ))}
            </div>
          ) : (
            <StudySidebar
              studies={studies}
              selectedStudyIndex={selectedStudyIndex}
              onSelectStudy={handleSelectStudy}
              language={language}
              activeManualLesson={manualLesson}
              onSelectManualLesson={handleSelectManualLesson}
            />
          )}
        </aside>
        
        {isSidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}

        <section className="viewer-container">
          {loading ? (
            <div className="study-viewer" aria-busy="true" aria-label={copy.loadingStudy}>
              <div className="viewer-measure">
                <div className="skeleton skeleton-line short" style={{ width: '30%', height: '0.9rem' }}></div>
                <div className="skeleton skeleton-line" style={{ width: '75%', height: '2.25rem', margin: '1rem 0 2.5rem' }}></div>
                <div className="skeleton skeleton-line" style={{ width: '25%', height: '0.9rem', marginBottom: '1rem' }}></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line" style={{ width: '85%' }}></div>
                <div className="skeleton skeleton-line" style={{ width: '40%', height: '0.9rem', margin: '2.5rem 0 1rem' }}></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line" style={{ width: '70%' }}></div>
              </div>
            </div>
          ) : manualLesson !== null ? (
            <ManualViewer
              lessonNumber={manualLesson}
              language={language}
              onSelectLesson={setManualLesson}
              onClose={() => setManualLesson(null)}
            />
          ) : (
            <StudyViewer study={currentStudy} onVerseClick={handleVerseClick} language={language} />
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
        language={language}
      />
    </div>
  );
}

export default App;
