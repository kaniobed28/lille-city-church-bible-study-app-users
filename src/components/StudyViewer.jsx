import React, { useRef, useState, useCallback } from 'react';
import { downloadStudyPdf } from '../lib/studyPdf';
import { t, studyEyebrow } from '../lib/i18n';
import StudyProse from './StudyProse';
import './StudyViewer.css';

function StudyViewer({ study, onVerseClick, language = 'en' }) {
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const copy = t(language);

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
        <p>{copy.emptyViewer}</p>
      </div>
    );
  }

  const eyebrow = studyEyebrow(study, language);

  const handleDownload = async () => {
    setDownloadError(false);
    setDownloading(true);
    try {
      await downloadStudyPdf(study, language);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="study-viewer" data-testid="study-viewer" ref={scrollRef} onScroll={handleScroll}>
      <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

      <article className="viewer-measure">
        <header className="viewer-header">
          <div className="viewer-header-top">
            <p className="viewer-week">{eyebrow}</p>
            <button
              type="button"
              className="viewer-download"
              onClick={handleDownload}
              disabled={downloading}
              title={copy.downloadPdf}
            >
              <span aria-hidden="true">↓</span> {downloading ? copy.preparing : copy.pdf}
            </button>
          </div>
          <h1 className="viewer-topic">{study.topic}</h1>
          {downloadError && (
            <p className="viewer-download-error" role="alert">
              {copy.pdfError}
            </p>
          )}
        </header>

        <div className="viewer-content">
        {study.mainTexts && (
          <div className="viewer-section main-texts">
            <h3>{copy.mainTexts}</h3>
            <p
              className={onVerseClick ? "clickable-verse" : ""}
              onClick={() => onVerseClick && onVerseClick(study.mainTexts)}
              title={onVerseClick ? copy.readVerseInAssistant : ""}
            >
              {study.mainTexts}
            </p>
          </div>
        )}

        {study.memoryVerse && (
          <div className="viewer-section memory-verse">
            <h3>{copy.memoryVerse}</h3>
            <blockquote
              className={onVerseClick ? "clickable-verse" : ""}
              onClick={() => onVerseClick && onVerseClick(study.memoryVerse)}
              title={onVerseClick ? copy.readVerseInAssistant : ""}
            >
              {study.memoryVerse}
            </blockquote>
          </div>
        )}

        {study.objectives && study.objectives.length > 0 && (
          <div className="viewer-section">
            <h3>{copy.objectives}</h3>
            <ol className="objectives-list">
              {study.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ol>
          </div>
        )}

        {study.introduction && (
          <div className="viewer-section">
            <h3>{copy.introduction}</h3>
            <StudyProse text={study.introduction} topic={study.topic} language={language} />
          </div>
        )}

        {study.questions && study.questions.length > 0 && (
          <div className="viewer-section">
            <h3>{copy.questionsAndAnswers}</h3>
            {study.questions.map((q, i) => (
              <div key={i} className="qa-block">
                <p className="qa-question">{q.question}</p>
                {study.hideAnswers !== false ? (
                  <p className="qa-hidden-msg">🔒 {copy.answersHidden}</p>
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
            <h3>{copy.lifeApplication}</h3>
            <ol className="life-app-list">
              {study.lifeApplications.map((app, i) => (
                <li key={i}>{app}</li>
              ))}
            </ol>
          </div>
        )}

        {study.conclusion && (
          <div className="viewer-section conclusion">
            <h3>{copy.conclusion}</h3>
            <StudyProse text={study.conclusion} topic={study.topic} language={language} />
          </div>
        )}
        </div>
      </article>
    </div>
  );
}
export default StudyViewer;
