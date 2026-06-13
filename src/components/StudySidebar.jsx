import React from 'react';
import './StudySidebar.css';

function StudySidebar({ studies, selectedStudyIndex, onSelectStudy }) {
  if (!studies || studies.length === 0) {
    return <div className="sidebar-empty" data-testid="sidebar-empty">No studies available</div>;
  }

  return (
    <div className="study-sidebar" data-testid="study-sidebar">
      {studies.map((study, index) => (
        <div 
          key={`${study.week || index}-${index}`} 
          className={`sidebar-item ${index === selectedStudyIndex ? 'active' : ''}`}
          onClick={() => onSelectStudy(index)}
          data-testid={`sidebar-item-${index}`}
        >
          <div className="sidebar-week">
            {study.type === 'Home Cell' || study.type === 'Special Event' 
              ? `${study.type}${study.week ? ` (Week ${study.week})` : ''}` 
              : `Week ${study.week}`}
          </div>
          <div className="sidebar-topic">{study.topic}</div>
        </div>
      ))}
    </div>
  );
}
export default StudySidebar;
