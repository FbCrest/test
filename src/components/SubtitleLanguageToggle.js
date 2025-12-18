import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SubtitleLanguageToggle.css';

const SubtitleLanguageToggle = ({ hasTranslation, targetLanguage, onLanguageChange, isHidden = false }) => {
  const { t } = useTranslation();
  const [isTranslated, setIsTranslated] = useState(() => {
    // Nếu không có bản dịch, luôn là phụ đề gốc
    if (!hasTranslation) return false;
    // Nếu có bản dịch, lấy trạng thái cuối cùng của người dùng từ localStorage
    const storedLanguage = localStorage.getItem('subtitle_language');
    return storedLanguage === 'translated';
  });

  useEffect(() => {
    // Nếu không có bản dịch, luôn là phụ đề gốc
    if (!hasTranslation && isTranslated) {
      setIsTranslated(false);
      localStorage.setItem('subtitle_language', 'original');
      if (onLanguageChange) {
        onLanguageChange('original');
      }
    }
    // Nếu có bản dịch, giữ nguyên trạng thái toggle theo người dùng
  }, [hasTranslation]);

  const handleToggle = (value) => {
    setIsTranslated(value);
    const languageValue = value ? 'translated' : 'original';
    localStorage.setItem('subtitle_language', languageValue);
    if (onLanguageChange) {
      onLanguageChange(languageValue);
    }
  };

  return (
    <div className={`subtitle-language-toggle-container ${isHidden ? 'hidden' : ''}`}>
      <div className="toggle-wrapper">
        <button
          className={`toggle-option ${!isTranslated ? 'active' : ''}`}
          onClick={() => handleToggle(false)}
        >
          <span className="toggle-label">{t('subtitleSettings.original', 'Gốc')}</span>
        </button>
        <button
          className={`toggle-option ${isTranslated ? 'active' : ''}`}
          onClick={() => handleToggle(true)}
        >
          <span className="toggle-label">
            {t('subtitleSettings.translated', 'Đã dịch')}
            {targetLanguage && <span className="target-language">({targetLanguage})</span>}
          </span>
        </button>
        {!hasTranslation ? (
          <div className="toggle-hint-inline">
            {t('subtitleSettings.noTranslationHint', 'Chưa có bản dịch')}
          </div>
        ) : (
          <div className="toggle-hint-inline" style={{ color: '#4caf50' }}>
            {t('subtitleSettings.hasTranslationHint', 'Đã có bản dịch')}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleLanguageToggle; 