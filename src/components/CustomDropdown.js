import React, { useState, useRef, useEffect } from 'react';
import '../styles/CustomDropdown.css';

const CustomDropdown = ({ value, onChange, options, className = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      className={`custom-dropdown ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="custom-dropdown-value">
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <svg 
          className="custom-dropdown-arrow" 
          viewBox="0 0 24 24" 
          width="20" 
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-dropdown-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {option.value === value && (
                <svg 
                  className="check-icon" 
                  viewBox="0 0 24 24" 
                  width="16" 
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
