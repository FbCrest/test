import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/ProgressStatus.css';

const ProgressStatus = ({ message, type = 'loading', progress = null, showProgress = true }) => {
  const { t } = useTranslation();
  const [currentProgress, setCurrentProgress] = useState(progress !== null ? progress : 0);

  // Update progress when prop changes
  useEffect(() => {
    if (progress !== null) {
      setCurrentProgress(progress);
    }
  }, [progress]);

  // Auto-increment progress for loading states if no specific progress is provided
  useEffect(() => {
    if (type === 'loading' && progress === null && showProgress) {
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= 90) return prev; // Don't go to 100% until actually complete
          return prev + Math.random() * 5; // Random increment between 0-5%
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [type, progress, showProgress]);

  return (
    <div className={`progress-status ${type}`}>
      <div className="progress-status-content">
        <div className="progress-status-message">
          {message}
        </div>
        
        {showProgress && (
          <div className="progress-status-bar-container">
            <div className="progress-status-bar">
              <div 
                className="progress-status-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
              />
            </div>
            <div className="progress-status-percentage">
              {Math.round(currentProgress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressStatus; 