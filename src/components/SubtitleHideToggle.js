import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SubtitleHideToggle.css';

const SubtitleHideToggle = ({ isHidden, onToggle }) => {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => {
    // Load hidden state from localStorage
    const savedHidden = localStorage.getItem('subtitle_hidden');
    return savedHidden === 'true' || isHidden;
  });

  // Save hidden state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('subtitle_hidden', hidden.toString());
  }, [hidden]);

  // Sync with parent component
  useEffect(() => {
    if (hidden !== isHidden) {
      setHidden(isHidden);
    }
  }, [isHidden]);

  const handleToggle = () => {
    const newHiddenState = !hidden;
    setHidden(newHiddenState);
    if (onToggle) {
      onToggle(newHiddenState);
    }
  };

  return (
    <div className="subtitle-hide-toggle-container">
      <button
        className={`subtitle-hide-toggle ${hidden ? 'hidden' : 'visible'}`}
        onClick={handleToggle}
        title={hidden ? t('subtitleSettings.showSubtitlesTooltip', 'Hiện phụ đề và thiết lập') : t('subtitleSettings.hideSubtitlesTooltip', 'Ẩn tất cả phụ đề và thiết lập')}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {hidden ? (
            // Eye icon for show subtitles
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </>
          ) : (
            // Eye-off icon for hide subtitles
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </>
          )}
        </svg>
        <span className="toggle-label">
          {hidden ? t('subtitleSettings.showSubtitles', 'Hiện phụ đề') : t('subtitleSettings.hideSubtitles', 'Ẩn phụ đề')}
        </span>
      </button>
    </div>
  );
};

export default SubtitleHideToggle; 