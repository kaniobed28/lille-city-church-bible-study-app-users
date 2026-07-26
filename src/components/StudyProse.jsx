import React, { useState } from 'react';
import { splitManualReferences, getManual } from '../lib/manual';
import { t } from '../lib/i18n';
import ManualLesson from './ManualLesson';
import './StudyProse.css';

/**
 * A referral the study makes to the reference booklet, rendered as something
 * the reader can open instead of a dead instruction to go and find a PDF.
 */
function ManualReference({ reference, language }) {
  const [isOpen, setIsOpen] = useState(false);
  const { manual } = getManual(language);
  const copy = t(language);
  const { lesson } = reference;

  return (
    <aside className={`manual-ref ${isOpen ? 'open' : ''}`} data-testid="manual-reference">
      <div className="manual-ref-head">
        <div className="manual-ref-titles">
          <p className="manual-ref-eyebrow">{copy.fromTheManual}</p>
          <p className="manual-ref-title">
            {manual.title}
            {lesson && (
              <span className="manual-ref-lesson"> · {manual.labels.lesson} {lesson.number}: {lesson.title}</span>
            )}
          </p>
        </div>

        {lesson ? (
          <button
            type="button"
            className="manual-ref-toggle"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
          >
            {isOpen ? copy.hide : copy.readItHere}
            <span className="manual-ref-chevron" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
          </button>
        ) : (
          <span className="manual-ref-unresolved">{copy.lessonNotIdentified}</span>
        )}
      </div>

      {isOpen && lesson && (
        <div className="manual-ref-body">
          {manual.translationNote && (
            <p className="manual-ref-language-note">{manual.translationNote}</p>
          )}
          <ManualLesson lesson={lesson} headingLevel={4} language={language} />
        </div>
      )}
    </aside>
  );
}

/**
 * Renders a block of study prose, lifting any referral to the reference
 * manual out of the sentence and into an openable excerpt.
 */
function StudyProse({ text, topic, language, className }) {
  const segments = splitManualReferences(text, { topic, language });

  if (!segments.length) return null;

  return (
    <>
      {segments.map((segment, i) => (
        segment.type === 'reference'
          ? <ManualReference key={i} reference={segment} language={language} />
          : <p key={i} className={className}>{segment.text.trim()}</p>
      ))}
    </>
  );
}

export default StudyProse;
