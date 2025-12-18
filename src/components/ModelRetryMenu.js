import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/ModelRetryMenu.css';
import { FiRefreshCw, FiChevronDown, FiZap, FiStar, FiAward, FiCpu, FiCheckCircle } from 'react-icons/fi';

/**
 * Component for the model selection dropdown menu for retrying segments
 * @param {Object} props - Component props
 * @param {number} props.segmentIndex - Index of the segment
 * @param {Function} props.onRetryWithModel - Function to retry with a specific model
 * @returns {JSX.Element} - Rendered component
 */
const ModelRetryMenu = ({ segmentIndex, onRetryWithModel }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // We don't need menuRef anymore
  // const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Position the dropdown relative to the button
  const positionDropdown = useCallback(() => {
    if (!buttonRef.current || !dropdownRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownEl = dropdownRef.current;

    // Position below the button
    dropdownEl.style.top = `${buttonRect.bottom + 8}px`;

    // Ensure the dropdown doesn't go off-screen to the right
    const rightEdge = buttonRect.right;
    const windowWidth = window.innerWidth;
    const dropdownWidth = 240; // Width from CSS

    if (rightEdge + dropdownWidth > windowWidth) {
      // Position to the left of the button's right edge
      dropdownEl.style.right = `${windowWidth - rightEdge}px`;
      dropdownEl.style.left = 'auto';
    } else {
      // Position aligned with button's left edge
      dropdownEl.style.left = `${buttonRect.left}px`;
      dropdownEl.style.right = 'auto';
    }
  }, []);

  // Handle button click
  const handleButtonClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle dropdown state
    setIsOpen(prev => !prev);
  }, []);

  // Position dropdown when it opens
  useEffect(() => {
    if (isOpen) {
      positionDropdown();

      // Add event listeners when dropdown is open
      const handleClickOutside = (e) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(e.target)
        ) {
          setIsOpen(false);
        }
      };

      const handleResize = () => {
        positionDropdown();
      };

      // Use capture phase to ensure we get the events first
      document.addEventListener('click', handleClickOutside, true);
      window.addEventListener('resize', handleResize);

      return () => {
        document.removeEventListener('click', handleClickOutside, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, positionDropdown]);

  // Model options with their icons and colors
  const modelOptions = [
    {
      id: 'gemini-2.5-pro',
      name: t('models.gemini25Pro', 'Gemini 2.5 Pro'),
      description: 'Độ chính xác cao nhất, tốc độ chậm, dễ quá tải',
      icon: <FiStar className="model-icon star-icon" />,
      color: 'var(--md-tertiary)',
      bgColor: 'rgba(var(--md-tertiary-rgb), 0.1)'
    },
    {
      id: 'gemini-2.5-flash-preview-05-20',
      name: t('models.gemini25Flash', 'Gemini 2.5 Flash'),
      description: 'Độ chính xác cao, tốc độ nhanh, ít quá tải',
      icon: <FiZap className="model-icon zap-icon" style={{ color: 'var(--md-tertiary)' }} />,
      color: 'var(--md-tertiary)',
      bgColor: 'rgba(var(--md-tertiary-rgb), 0.1)'
    },
    {
      id: 'gemini-2.5-flash-lite-preview-06-17',
      name: t('models.gemini25FlashLite', 'Gemini 2.5 Flash Lite'),
      description: 'Độ chính xác tốt, tốc độ rất nhanh, ổn định',
      icon: <FiCheckCircle className="model-icon stable-icon" />,
      color: 'var(--success-color)',
      bgColor: 'rgba(var(--success-color-rgb), 0.1)'
    },
    {
      id: 'gemini-2.0-flash',
      name: t('models.gemini20Flash', 'Gemini 2.0 Flash'),
      description: 'Độ chính xác khá, tốc độ cao, luôn sẵn sàng',
      icon: <FiZap className="model-icon zap-icon" />,
      color: 'var(--md-primary)',
      bgColor: 'rgba(var(--md-primary-rgb), 0.1)'
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: t('models.gemini20FlashLite', 'Gemini 2.0 Flash Lite'),
      description: 'Độ chính xác trung bình, nhanh nhất, luôn sẵn sàng',
      icon: <FiCpu className="model-icon cpu-icon" />,
      color: 'var(--success-color)',
      bgColor: 'rgba(var(--success-color-rgb), 0.1)'
    }
  ];

  // Handle model selection
  const handleModelSelect = useCallback((e, modelId) => {
    e.preventDefault();
    e.stopPropagation();

    // Close the dropdown immediately
    setIsOpen(false);

    // Call the retry function
    onRetryWithModel(segmentIndex, modelId);
  }, [onRetryWithModel, segmentIndex]);

  return (
    <div className={`model-retry-menu-container ${isOpen ? 'model-dropdown-open' : ''}`}>
      <button
        className={`segment-retry-btn model-retry-btn ${isOpen ? 'active-dropdown-btn' : ''}`}
        onClick={handleButtonClick}
        title={t('output.retryWithModel', 'Retry with different model')}
        ref={buttonRef}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <FiRefreshCw size={14} />
        <FiChevronDown size={10} className="dropdown-icon" />
      </button>

      {isOpen && (
        <div
          className="model-options-dropdown"
          ref={dropdownRef}
          role="menu"
        >
          <div className="model-options-header">
            {t('output.selectModel', 'Select model for retry')}
          </div>
          <div className="model-options-list">
            {modelOptions.map((model) => (
              <button
                key={model.id}
                className="model-option-btn"
                onClick={(e) => handleModelSelect(e, model.id)}
                style={{
                  '--model-color': model.color,
                  '--model-bg-color': model.bgColor
                }}
                role="menuitem"
              >
                <div className="model-option-icon">{model.icon}</div>
                <div className="model-option-text">
                  <div className="model-option-name">{model.name}</div>
                  <div className="model-option-description">{model.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelRetryMenu;
