import React, { useRef, useState, useCallback } from 'react';
import './StudyViewer.css';

function StudyViewer({ study, onVerseClick }) {
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    setProgress(scrollable > 0 ? Math.min(1, el.scrollTop / scrollable) : 0);
  }, []);

  if (!study) {
    return (
      <div className="viewer-empty" data-testid="viewer-empty">
        <span className="viewer-empty-mark" aria-hidden="true">✦</span>
        <p>Select a study from the sidebar to begin reading.</p>
      </div>
    );
  }

  const eyebrow =
    study.type === 'Home Cell' || study.type === 'Special Event'
      ? `${study.type}${study.week ? ` · Week ${study.week}` : ''}`
      : `Week ${study.week} · ${study.type}`;

  return (
    <div className="study-viewer" data-testid="study-viewer" ref={scrollRef} onScroll={handleScroll}>
      <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

      <article className="viewer-measure">
        <header className="viewer-header">
          <p className="viewer-week">{eyebrow}</p>
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

        {study.objectives && study.objectives.length > 0 && (
          <div className="viewer-section">
            <h3>Objectives</h3>
            <ol className="objectives-list">
              {study.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ol>
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
            <ol className="life-app-list">
              {study.lifeApplications.map((app, i) => (
                <li key={i}>{app}</li>
              ))}
            </ol>
          </div>
        )}

        {study.conclusion && (
          <div className="viewer-section conclusion">
            <h3>Conclusion</h3>
            <p>{study.conclusion}</p>
          </div>
        )}
        </div>
      </article>
    </div>
  );
}
export default StudyViewer;
