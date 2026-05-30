import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import './App.css';
import LanguageSelector from './components/LanguageSelector';
import StudySidebar from './components/StudySidebar';
import StudyViewer from './components/StudyViewer';

function App() {
  const [language, setLanguage] = useState('en');
  const [studies, setStudies] = useState([]);
  const [selectedStudyIndex, setSelectedStudyIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setSelectedStudyIndex(0);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching studies from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  const currentStudy = studies[selectedStudyIndex] || null;

  const handleSelectStudy = (index) => {
    setSelectedStudyIndex(index);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
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
          <img src="/logo.png" alt="Church Logo" className="app-logo" onError={(e) => e.target.style.display='none'} />
          <h1 className="app-title" data-testid="main-title">Bible Study App</h1>
        </div>
        <LanguageSelector language={language} setLanguage={setLanguage} />
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
            <StudyViewer study={currentStudy} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
