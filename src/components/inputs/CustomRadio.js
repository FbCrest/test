import React from 'react';
import '../../styles/components/custom-radio.css';

/**
 * CustomRadio - Radio button custom mượt, đẹp
 * @param {boolean} checked
 * @param {function} onChange
 * @param {string} label
 * @param {string} className
 * @param {boolean} disabled
 * @param {string} id
 * @param {string} name
 * @param {string} value
 */
const CustomRadio = ({ checked, onChange, label, className = '', disabled = false, id, name, value }) => {
  return (
    <label className={`custom-radio-container ${className} ${disabled ? 'disabled' : ''}`}> 
      <input
        type="radio"
        checked={checked}
        onChange={e => !disabled && onChange && onChange(e)}
        disabled={disabled}
        id={id}
        name={name}
        value={value}
      />
      <span className="custom-radio-circle">
        {checked && <span className="custom-radio-dot" />}
      </span>
      {label && <span className="custom-radio-label">{label}</span>}
    </label>
  );
};

export default CustomRadio; 