import React, { useRef, useState, useCallback } from 'react';
import { getManual } from '../lib/manual';
import { t } from '../lib/i18n';
import ManualLesson from './ManualLesson';
import './ManualViewer.css';

/**
 * The reference manual as a reading surface of its own — the same shell as
 * the study viewer, so moving between a study and the booklet it cites feels
 * like turning a page rather than leaving the app.
 */
function ManualViewer({ lessonNumber, language, onSelectLesson, onClose }) {
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    setProgress(scrollable > 0 ? Math.min(1, el.scrollTop / scrollable) : 0);
  }, []);

  const { manual } = getManual(language);
  const copy = t(language);
  const index = manual.lessons.findIndex((l) => l.number === lessonNumber);
  const lesson = manual.lessons[index];

  if (!lesson) return null;

  const part = manual.parts.find((p) => p.number === lesson.part);
  const previous = manual.lessons[index - 1];
  const next = manual.lessons[index + 1];

  const goTo = (target) => {
    onSelectLesson(target.number);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  return (
    <div className="study-viewer" data-testid="manual-viewer" ref={scrollRef} onScroll={handleScroll}>
      <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

      <article className="viewer-measure">
        <header className="viewer-header">
          <div className="viewer-header-top">
            <p className="viewer-week">
              {copy.referenceManual}{part ? ` · ${manual.labels.part} ${part.number}: ${part.title}` : ''}
            </p>
            <button type="button" className="viewer-download" onClick={onClose}>
              <span aria-hidden="true">←</span> {copy.backToStudy}
            </button>
          </div>
          <h1 className="viewer-topic">{manual.title}</h1>
          <p className="manual-viewer-sub">{manual.subtitle} · {manual.publisher}</p>
        </header>

        {manual.translationNote && (
          <p className="manual-viewer-note">{manual.translationNote}</p>
        )}

        <ManualLesson lesson={lesson} headingLevel={2} language={language} />

        <nav className="manual-viewer-nav" aria-label={copy.referenceManual}>
          {previous ? (
            <button type="button" className="manual-viewer-step" onClick={() => goTo(previous)}>
              <span className="manual-viewer-step-dir">← {manual.labels.lesson} {previous.number}</span>
              <span className="manual-viewer-step-title">{previous.title}</span>
            </button>
          ) : <span />}

          {next && (
            <button type="button" className="manual-viewer-step next" onClick={() => goTo(next)}>
              <span className="manual-viewer-step-dir">{manual.labels.lesson} {next.number} →</span>
              <span className="manual-viewer-step-title">{next.title}</span>
            </button>
          )}
        </nav>

        <p className="manual-viewer-copyright">{manual.copyright}</p>
      </article>
    </div>
  );
}

export default ManualViewer;
