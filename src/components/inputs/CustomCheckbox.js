import React from 'react';
import '../../styles/components/custom-checkbox.css';

/**
 * CustomCheckbox - Checkbox custom mượt, đẹp
 * @param {boolean} checked
 * @param {function} onChange
 * @param {string} label
 * @param {string} className
 * @param {boolean} disabled
 * @param {string} id
 */
const CustomCheckbox = ({ checked, onChange, label, className = '', disabled = false, id }) => {
  return (
    <label className={`custom-checkbox-container ${className} ${disabled ? 'disabled' : ''}`}> 
      <input
        type="checkbox"
        checked={checked}
        onChange={e => !disabled && onChange && onChange(e.target.checked)}
        disabled={disabled}
        id={id}
      />
      <span className="custom-checkbox-box">
        {checked && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 10 18 4 12" />
          </svg>
        )}
      </span>
      {label && <span className="custom-checkbox-label">{label}</span>}
    </label>
  );
};

export default CustomCheckbox; 