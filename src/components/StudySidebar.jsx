import React, { useState } from 'react';
import { getManual } from '../lib/manual';
import { t, studyType } from '../lib/i18n';
import './StudySidebar.css';

function StudySidebar({
  studies,
  selectedStudyIndex,
  onSelectStudy,
  language = 'en',
  activeManualLesson = null,
  onSelectManualLesson,
}) {
  // The manual is reference material, not the week's reading, so it stays
  // folded away until someone goes looking for it.
  const [isManualOpen, setIsManualOpen] = useState(false);
  const { manual } = getManual(language);
  const copy = t(language);

  const hasStudies = studies && studies.length > 0;

  return (
    <div className="study-sidebar" data-testid="study-sidebar">
      {hasStudies ? (
        studies.map((study, index) => (
          <div
            key={`${study.week || index}-${index}`}
            className={`sidebar-item ${index === selectedStudyIndex && activeManualLesson === null ? 'active' : ''}`}
            onClick={() => onSelectStudy(index)}
            data-testid={`sidebar-item-${index}`}
          >
            <div className="sidebar-week">
              {study.type === 'Home Cell' || study.type === 'Special Event'
                ? `${studyType(study.type, language)}${study.week ? ` (${copy.week} ${study.week})` : ''}`
                : `${copy.week} ${study.week}`}
            </div>
            <div className="sidebar-topic">{study.topic}</div>
          </div>
        ))
      ) : (
        <div className="sidebar-empty" data-testid="sidebar-empty">{copy.noStudies}</div>
      )}

      {onSelectManualLesson && (
        <div className="sidebar-manual">
          <button
            type="button"
            className="sidebar-manual-toggle"
            onClick={() => setIsManualOpen((open) => !open)}
            aria-expanded={isManualOpen}
          >
            <span className="sidebar-manual-label">{copy.referenceManual}</span>
            <span className="sidebar-manual-chevron" aria-hidden="true">{isManualOpen ? '▴' : '▾'}</span>
          </button>

          {isManualOpen && (
            <div className="sidebar-manual-list">
              <p className="sidebar-manual-title">{manual.title}</p>
              {manual.lessons.map((lesson) => (
                <button
                  type="button"
                  key={lesson.number}
                  className={`sidebar-manual-lesson ${activeManualLesson === lesson.number ? 'active' : ''}`}
                  onClick={() => onSelectManualLesson(lesson.number)}
                >
                  <span className="sidebar-manual-lesson-number">{lesson.number}</span>
                  <span className="sidebar-manual-lesson-title">{lesson.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StudySidebar;
