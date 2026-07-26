import React from 'react';
import { getManual } from '../lib/manual';
import './ManualLesson.css';

// Kebab-cased for the stylesheet. Driven by the block's language-independent
// `kind`, so the French edition keeps the same styling as the English one.
const noteClass = (kind) => `manual-note-${String(kind ?? 'note').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;

/**
 * Renders one lesson of the reference manual. Used both inline — where a
 * study defers to the booklet — and in the manual browser, so a referral
 * and a deliberate read look like the same document.
 */
function ManualLesson({ lesson, headingLevel = 3, language }) {
  if (!lesson) return null;

  const { manual } = getManual(language);
  const labels = manual.labels;
  const Heading = `h${headingLevel}`;
  const SubHeading = `h${Math.min(headingLevel + 1, 6)}`;

  return (
    <div className="manual-lesson" data-testid={`manual-lesson-${lesson.number}`}>
      <Heading className="manual-lesson-title">
        <span className="manual-lesson-number">{labels.lesson} {lesson.number}</span>
        {lesson.title}
      </Heading>

      {lesson.blocks.map((block, i) => {
        if (block.type === 'note') {
          return (
            <p key={i} className={`manual-note ${noteClass(block.kind)}`}>
              <span className="manual-note-label">{block.label}</span>
              {block.text}
            </p>
          );
        }

        if (block.type === 'heading') {
          return (
            <SubHeading key={i} className="manual-heading">
              <span className="manual-heading-number" aria-hidden="true">{block.number}</span>
              {block.text}
            </SubHeading>
          );
        }

        if (block.type === 'memoryVerse') {
          return (
            <blockquote key={i} className="manual-verse">
              <span className="manual-verse-label">{labels.memoryVerse}</span>
              {block.verses.map((verse, j) => (
                <p key={j} className="manual-verse-text">
                  {verse.text}
                  {verse.reference && <cite className="manual-verse-cite">{verse.reference}</cite>}
                </p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'questions') {
          return (
            <div key={i} className="manual-questions">
              <p className="manual-questions-label">{labels.questions}</p>
              <ol>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            </div>
          );
        }

        return <p key={i} className="manual-paragraph">{block.text}</p>;
      })}
    </div>
  );
}

export default ManualLesson;
