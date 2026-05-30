import React from 'react';
import './LanguageSelector.css';

function LanguageSelector({ language, setLanguage }) {
  return (
    <div className="language-selector" data-testid="language-selector">
      <button 
        className={language === 'en' ? 'active' : ''} 
        onClick={() => setLanguage('en')}
        data-testid="lang-en"
      >
        English
      </button>
      <button 
        className={language === 'fr' ? 'active' : ''} 
        onClick={() => setLanguage('fr')}
        data-testid="lang-fr"
      >
        Français
      </button>
    </div>
  );
}
export default LanguageSelector;
