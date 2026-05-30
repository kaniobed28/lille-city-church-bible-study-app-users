import React from 'react';
import './StudyViewer.css';

function StudyViewer({ study, onVerseClick }) {
  if (!study) {
    return <div className="viewer-empty" data-testid="viewer-empty">Select a study from the sidebar</div>;
  }

  return (
    <div className="study-viewer" data-testid="study-viewer">
      <header className="viewer-header">
        <h2 className="viewer-week">Week {study.week}: {study.type}</h2>
        <h1 className="viewer-topic">{study.topic}</h1>
      </header>
      
      <div className="viewer-content">
        {study.mainTexts && (
          <div className="viewer-section main-texts">
            <h3>Main Texts</h3>
            <p 
              className={onVerseClick ? "clickable-verse" : ""} 
              onClick={() => onVerseClick && onVerseClick(study.mainTexts)}
              title={onVerseClick ? "Click to read in AI Assistant" : ""}
            >
              {study.mainTexts}
            </p>
          </div>
        )}
        
        {study.memoryVerse && (
          <div className="viewer-section memory-verse">
            <h3>Memory Verse</h3>
            <blockquote 
              className={onVerseClick ? "clickable-verse" : ""}
              onClick={() => onVerseClick && onVerseClick(study.memoryVerse)}
              title={onVerseClick ? "Click to read in AI Assistant" : ""}
            >
              {study.memoryVerse}
            </blockquote>
          </div>
        )}

        {study.introduction && (
          <div className="viewer-section">
            <h3>Introduction</h3>
            <p>{study.introduction}</p>
          </div>
        )}

        {study.questions && study.questions.length > 0 && (
          <div className="viewer-section">
            <h3>Questions & Answers</h3>
            {study.questions.map((q, i) => (
              <div key={i} className="qa-block">
                <p className="qa-question">{q.question}</p>
                {study.hideAnswers !== false ? (
                  <p className="qa-hidden-msg">🔒 Answers will be revealed by the admin after the studies.</p>
                ) : (
                  q.answers.map((ans, j) => (
                    <p key={j} className="qa-answer">{ans}</p>
                  ))
                )}
              </div>
            ))}
          </div>
        )}

        {study.lifeApplications && study.lifeApplications.length > 0 && !study.hideLifeApplications && (
          <div className="viewer-section">
            <h3>Life Application</h3>
            <ul className="life-app-list">
              {study.lifeApplications.map((app, i) => (
                <li key={i}>{app}</li>
              ))}
            </ul>
          </div>
        )}

        {study.conclusion && (
          <div className="viewer-section conclusion">
            <h3>Conclusion</h3>
            <p>{study.conclusion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default StudyViewer;
