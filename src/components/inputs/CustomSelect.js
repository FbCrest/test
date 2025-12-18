import React, { useState, useRef, useEffect } from 'react';
import '../../styles/components/custom-select.css';

/**
 * CustomSelect - Dropdown thay thế <select> với hiệu ứng mượt, hỗ trợ optgroup, custom scrollbar
 * @param {string} value - Giá trị đang chọn
 * @param {function} onChange - Hàm gọi khi chọn option mới
 * @param {Array} options - [{ value, label, group? }]
 * @param {string} placeholder - Placeholder khi chưa chọn
 * @param {string} className - Thêm class cho container
 * @param {boolean} disabled - Vô hiệu hóa dropdown
 */
const CustomSelect = ({ value, onChange, options, placeholder, className = '', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(null);
  const ref = useRef();

  // Gom nhóm optgroup nếu có
  const grouped = options.reduce((acc, opt) => {
    const group = opt.group || '__default__';
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {});

  // Lấy option đang chọn
  const selected = options.find(opt => opt.value === value);

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Xử lý chọn option
  const handleSelect = (opt) => {
    if (disabled) return;
    onChange && onChange(opt.value);
    setOpen(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const flat = options;
    let idx = highlighted == null ? flat.findIndex(opt => opt.value === value) : highlighted;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted(i => (i == null ? 0 : (i + 1) % flat.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted(i => (i == null ? flat.length - 1 : (i - 1 + flat.length) % flat.length));
      } else if (e.key === 'Enter' && idx >= 0) {
        e.preventDefault();
        handleSelect(flat[idx]);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, highlighted, options, value]);

  return (
    <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`} ref={ref}>
      <button
        type="button"
        className={`custom-select-btn${open ? ' open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="custom-select-label">
          {selected ? selected.label : (placeholder || 'Chọn...')}
        </span>
        <span className="custom-select-arrow">▼</span>
      </button>
      {open && (
        <div className="custom-select-dropdown" role="listbox">
          {Object.entries(grouped).map(([group, opts], gi) => (
            <div key={group} className="custom-select-group">
              {group !== '__default__' && <div className="custom-select-group-label">{group}</div>}
              {opts.map((opt, oi) => {
                const flatIdx = options.findIndex(o => o.value === opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`custom-select-option${value === opt.value ? ' selected' : ''}${highlighted === flatIdx ? ' highlighted' : ''}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlighted(flatIdx)}
                    role="option"
                    aria-selected={value === opt.value}
                    tabIndex={-1}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect; 