import React, { useState, useRef, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/timeFormatter';

// Continuous progress indicator component
const ContinuousProgressIndicator = ({ lyric, isCurrentLyric, currentTime }) => {
  const progressRef = useRef(null);
  const animationRef = useRef(null);
  const videoRef = useRef(document.querySelector('video')); // Reference to the video element

  // Function to update the progress indicator
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateProgress = () => {
    if (!progressRef.current || !isCurrentLyric) return;

    // Get the current time from the video element if available, otherwise use the prop
    const video = videoRef.current;
    const time = video && !video.paused ? video.currentTime : currentTime;

    // Calculate the progress percentage
    const progress = Math.min(1, Math.max(0, (time - lyric.start) / (lyric.end - lyric.start)));

    // Update the transform
    progressRef.current.style.transform = `scaleX(${progress})`;

    // Continue the animation if this is the current lyric
    if (isCurrentLyric) {
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  };

  // Set up the animation when the component mounts or when isCurrentLyric changes
  useEffect(() => {
    // If this is the current lyric, start the animation
    if (isCurrentLyric) {
      // Make sure we have the latest video reference
      videoRef.current = document.querySelector('video');

      // Start the animation
      animationRef.current = requestAnimationFrame(updateProgress);
    }

    // Clean up the animation when the component unmounts or when isCurrentLyric changes
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCurrentLyric, lyric, updateProgress]); // Include the entire lyric object to handle any changes

  // Update when currentTime changes (for seeking)
  useEffect(() => {
    if (isCurrentLyric) {
      updateProgress();
    }
  }, [currentTime, isCurrentLyric, updateProgress]); // Include isCurrentLyric in the dependency array

  // Only render if this is the current lyric
  if (!isCurrentLyric) return null;

  return (
    <div
      ref={progressRef}
      className="progress-indicator"
      style={{
        width: '100%',
        transform: `scaleX(${Math.min(1, Math.max(0, (currentTime - lyric.start) / (lyric.end - lyric.start)))})` // Initial value
      }}
    />
  );
};

const LyricItem = ({
  lyric,
  index,
  isCurrentLyric,
  currentTime,
  allowEditing,
  isDragging,
  onLyricClick,
  onMouseDown,
  getLastDragEnd,
  onDelete,
  onTextEdit,
  onInsert,
  onMerge,
  onMove,
  hasNextLyric,
  onUpdateLyrics
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(lyric.text);
  const textInputRef = useRef(null);

  // State for showing insert arrows
  const [showInsertArrows, setShowInsertArrows] = useState(false);
  const insertTimeoutRef = useRef(null);

  // State for showing merge arrows
  const [showMergeArrows, setShowMergeArrows] = useState(false);
  const mergeTimeoutRef = useRef(null);

  // State for drag type (merge or move)
  const [dragType, setDragType] = useState(null); // 'merge' or 'move'
  // State for drop zone highlight
  const [dropZone, setDropZone] = useState(null); // 'top', 'middle', 'bottom', or null

  // State for editing time
  const [editingTime, setEditingTime] = useState({ field: null, value: '' }); // {field: 'start'|'end', value: string}

  // Helper: format seconds to MM:SS.mm
  const formatTimeInput = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.round((seconds - Math.floor(seconds)) * 100).toString().padStart(2, '0');
    return `${m}:${s}.${ms}`;
  };
  // Helper: parse MM:SS.mm to seconds
  const parseTimeInput = (str) => {
    const match = str.match(/^(\d{2}):(\d{2})\.(\d{2})$/);
    if (!match) return null;
    const m = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    const ms = parseInt(match[3], 10);
    return m * 60 + s + ms / 100;
  };

  // Handle insert container mouse enter
  const handleInsertMouseEnter = () => {
    if (insertTimeoutRef.current) {
      clearTimeout(insertTimeoutRef.current);
      insertTimeoutRef.current = null;
    }
    setShowInsertArrows(true);
  };

  // Handle insert container mouse leave
  const handleInsertMouseLeave = () => {
    insertTimeoutRef.current = setTimeout(() => {
      // Check if the mouse is over any arrow button before hiding
      const arrowButtons = document.querySelectorAll('.insert-lyric-button-container .arrow-button');
      let isOverArrow = false;

      arrowButtons.forEach(button => {
        if (button.matches(':hover')) {
          isOverArrow = true;
        }
      });

      if (!isOverArrow) {
        setShowInsertArrows(false);
      }
    }, 300); // 300ms delay before hiding
  };

  // Handle merge container mouse enter
  const handleMergeMouseEnter = () => {
    if (mergeTimeoutRef.current) {
      clearTimeout(mergeTimeoutRef.current);
      mergeTimeoutRef.current = null;
    }
    setShowMergeArrows(true);
  };

  // Handle merge container mouse leave
  const handleMergeMouseLeave = () => {
    mergeTimeoutRef.current = setTimeout(() => {
      // Check if the mouse is over any arrow button before hiding
      const arrowButtons = document.querySelectorAll('.merge-lyrics-button-container .arrow-button');
      let isOverArrow = false;

      arrowButtons.forEach(button => {
        if (button.matches(':hover')) {
          isOverArrow = true;
        }
      });

      if (!isOverArrow) {
        setShowMergeArrows(false);
      }
    }, 300); // 300ms delay before hiding
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (insertTimeoutRef.current) {
        clearTimeout(insertTimeoutRef.current);
      }
      if (mergeTimeoutRef.current) {
        clearTimeout(mergeTimeoutRef.current);
      }
    };
  }, []);

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(lyric.text);
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
        // Auto-resize textarea
        textInputRef.current.style.height = 'auto';
        textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
      }
    }, 0);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setEditText(newText);
    
    // Auto-resize textarea
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
      textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
    }
  };

  const handleTextSubmit = () => {
    if (editText.trim() !== lyric.text) {
      onTextEdit(index, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only submit on Enter without Shift (Shift+Enter creates new line)
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(lyric.text);
    }
  };

  // Handle insert above
  const handleInsertAbove = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // For first lyric, insert at position 0
    // For other lyrics, insert at the position before the current lyric
    onInsert(index > 0 ? index - 1 : 0);
  };

  // Handle insert below
  const handleInsertBelow = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // Always insert at the current position
    // For last lyric, this will add a new lyric at the end
    onInsert(index);
  };

  // Handle merge with above
  const handleMergeAbove = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (index > 0) {
      onMerge(index - 1);
    }
  };

  // Handle merge with below
  const handleMergeBelow = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasNextLyric) {
      onMerge(index);
    }
  };

  // Handle double click to edit time
  const handleTimeDoubleClick = (field) => {
    setEditingTime({ field, value: formatTimeInput(lyric[field]) });
  };
  // Handle input change
  const handleTimeInputChange = (e) => {
    setEditingTime(et => ({ ...et, value: e.target.value }));
  };
  // Handle blur or Enter
  const handleTimeInputBlur = (field) => {
    const seconds = parseTimeInput(editingTime.value);
    if (seconds !== null && seconds >= 0) {
      // Gọi cập nhật thời gian cho phụ đề
      if (field === 'start' && seconds < lyric.end) {
        onTextEdit && onTextEdit(index, lyric.text); // giữ text
        if (typeof onUpdateLyrics === 'function') {
          onUpdateLyrics(prev => prev.map((l, i) => i === index ? { ...l, start: seconds } : l));
        } else {
          lyric.start = seconds;
        }
      } else if (field === 'end' && seconds > lyric.start) {
        onTextEdit && onTextEdit(index, lyric.text);
        if (typeof onUpdateLyrics === 'function') {
          onUpdateLyrics(prev => prev.map((l, i) => i === index ? { ...l, end: seconds } : l));
        } else {
          lyric.end = seconds;
        }
      }
    }
    setEditingTime({ field: null, value: '' });
  };

  return (
    <div className="lyric-item-container">
      <div
        data-lyric-index={index}
        className={`lyric-item ${isCurrentLyric ? 'current' : ''} ${dragType ? `drag-${dragType}` : ''} ${dropZone ? `drop-zone-${dropZone}` : ''}`}
        onClick={() => {
          if (Date.now() - getLastDragEnd() < 100) {
            return;
          }
          onLyricClick(lyric.start);
        }}
        onDoubleClick={() => {
          if (allowEditing) {
            setIsEditing(true);
            setEditText(lyric.text);
            setTimeout(() => {
              if (textInputRef.current) {
                textInputRef.current.focus();
                textInputRef.current.style.height = 'auto';
                textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
              }
            }, 0);
          }
        }}
        draggable={allowEditing && !isEditing}
        onDragStart={e => {
          if (!allowEditing || isEditing) { e.preventDefault(); return; }
          // Determine drag type based on Shift key
          const isMoveDrag = e.shiftKey;
          setDragType(isMoveDrag ? 'move' : 'merge');
          // Add visual feedback to the dragged element
          e.currentTarget.style.opacity = '0.7';
          // BỎ hiệu ứng nghiêng khi kéo
          // e.currentTarget.style.transform = 'rotate(2deg)';
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({
            index: index,
            type: isMoveDrag ? 'move' : 'merge'
          }));
          e.currentTarget.classList.add('dragging');
        }}
        onDragEnd={e => {
          e.currentTarget.classList.remove('dragging');
          e.currentTarget.style.opacity = '';
          // e.currentTarget.style.transform = '';
          setDragType(null);
        }}
        onDragOver={e => {
          if (!allowEditing || isEditing) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const height = rect.height;
          let zone = null;
          if (offsetY < height * 0.25) zone = 'top';
          else if (offsetY > height * 0.75) zone = 'bottom';
          else zone = 'middle';
          setDropZone(zone);
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add('drag-over');
        }}
        onDragLeave={e => {
          e.currentTarget.classList.remove('drag-over');
          setDropZone(null);
        }}
        onDrop={e => {
          if (!allowEditing || isEditing) return;
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const height = rect.height;
          let zone = null;
          if (offsetY < height * 0.25) zone = 'top';
          else if (offsetY > height * 0.75) zone = 'bottom';
          else zone = 'middle';
          setDropZone(null);
          try {
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const fromIndex = dragData.index;
            const toIndex = index;
            if (fromIndex === toIndex) return;
            if (zone === 'top') {
              onMove(fromIndex, toIndex);
            } else if (zone === 'bottom') {
              onMove(fromIndex, toIndex + (fromIndex < toIndex ? 0 : 1));
            } else {
              // middle
              if (fromIndex < toIndex) {
                onMerge(fromIndex);
              } else {
                onMerge(toIndex);
              }
            }
          } catch (error) {
            // Fallback for old format (just index number)
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = index;
            if (fromIndex === toIndex) return;
            if (zone === 'top') {
              onMove(fromIndex, toIndex);
            } else if (zone === 'bottom') {
              onMove(fromIndex, toIndex + (fromIndex < toIndex ? 0 : 1));
            } else {
              if (fromIndex < toIndex) {
                onMerge(fromIndex);
              } else {
                onMerge(toIndex);
              }
            }
          }
        }}
        onMouseDown={e => {
          // Nếu bấm vào nút, textarea thì không drag
          if (
            e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.closest('button') ||
            e.target.closest('textarea') ||
            e.target.closest('.lyric-text-input') ||
            e.target.closest('.lyric-controls') ||
            e.target.closest('.timing-controls')
          ) {
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          
          // Nếu đang trong chế độ edit, không cho phép drag
          if (isEditing) {
            e.stopPropagation();
            e.preventDefault();
            return;
          }
        }}
        title={allowEditing ? t('lyrics.dragInstructions', 'Drag and drop a subtitle above or below to move it. Drop in the middle of another subtitle to merge them.') : ''}
      >
        <div className="lyric-content">
          {/* Controls moved to the left */}
          {allowEditing && (
            <div className="lyric-controls">
              <button
                className="edit-lyric-btn"
                onClick={handleEditClick}
                title={t('lyrics.editTooltip', 'Edit lyrics')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                className="delete-lyric-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
                title={t('lyrics.deleteTooltip', 'Delete lyrics')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              {/* Always show insert and merge buttons for all lyrics */}
              <div
                className="insert-lyric-button-container"
                onMouseEnter={handleInsertMouseEnter}
                onMouseLeave={handleInsertMouseLeave}
              >
                <div
                  className="insert-lyric-button"
                  title={t('lyrics.insertTooltip', 'Add new line')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                {showInsertArrows && (
                  <div className="arrow-buttons">
                    <button
                      className="arrow-button up"
                      onClick={handleInsertAbove}
                      title={t('lyrics.insertAbove', 'Add above')}
                      onMouseEnter={() => {
                        if (insertTimeoutRef.current) {
                          clearTimeout(insertTimeoutRef.current);
                          insertTimeoutRef.current = null;
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </button>
                    <button
                      className="arrow-button down"
                      onClick={handleInsertBelow}
                      title={t('lyrics.insertBelow', 'Add below')}
                      onMouseEnter={() => {
                        if (insertTimeoutRef.current) {
                          clearTimeout(insertTimeoutRef.current);
                          insertTimeoutRef.current = null;
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div
                className="merge-lyrics-button-container"
                onMouseEnter={handleMergeMouseEnter}
                onMouseLeave={handleMergeMouseLeave}
              >
                <div
                  className="merge-lyrics-button"
                  title={t('lyrics.mergeTooltip', 'Merge lyrics')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M8 18h8M8 6h8M12 2v20"/>
                  </svg>
                </div>
                {showMergeArrows && (
                  <div className="arrow-buttons">
                    <button
                      className="arrow-button up"
                      onClick={handleMergeAbove}
                      title={t('lyrics.mergeAbove', 'Merge with above')}
                      disabled={index <= 0}
                      onMouseEnter={() => {
                        if (mergeTimeoutRef.current) {
                          clearTimeout(mergeTimeoutRef.current);
                          mergeTimeoutRef.current = null;
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </button>
                    <button
                      className="arrow-button down"
                      onClick={handleMergeBelow}
                      title={t('lyrics.mergeBelow', 'Merge with below')}
                      disabled={!hasNextLyric}
                      onMouseEnter={() => {
                        if (mergeTimeoutRef.current) {
                          clearTimeout(mergeTimeoutRef.current);
                          mergeTimeoutRef.current = null;
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="lyric-text">
            {isEditing ? (
              <textarea
                ref={textInputRef}
                value={editText}
                onChange={handleTextChange}
                onBlur={handleTextSubmit}
                onKeyDown={handleKeyPress}
                className="lyric-text-input"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => e.stopPropagation()}
                onMouseMove={e => e.stopPropagation()}
                style={{ 
                  resize: 'none', 
                  minHeight: '24px',
                  cursor: 'text',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text'
                }}
              />
            ) : (
              <span onClick={(e) => {
                e.stopPropagation(); // Stop propagation to prevent double click handling
                if (!isEditing) {
                  onLyricClick(lyric.start);
                }
              }}>
                {lyric.text.split('\n').map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </span>
            )}
          </div>

          {/* Timing controls slightly to the left */}
          {allowEditing && (
            <div className="timing-controls">
              <span
                className={`time-control start-time ${isDragging(index, 'start') ? 'dragging' : ''}`}
                onMouseDown={(e) => onMouseDown(e, index, 'start')}
                onDoubleClick={() => handleTimeDoubleClick('start')}
              >
                {editingTime.field === 'start' ? (
                  <input
                    type="text"
                    value={editingTime.value}
                    onChange={handleTimeInputChange}
                    onBlur={() => handleTimeInputBlur('start')}
                    onKeyDown={e => { if (e.key === 'Enter') handleTimeInputBlur('start'); }}
                    style={{ width: 70, fontSize: '1em', borderRadius: 4, border: '1px solid #aaa', padding: '2px 4px' }}
                    autoFocus
                  />
                ) : (
                  formatTime(lyric.start, 'hms_ms')
                )}
              </span>

              <span className="time-separator">-</span>

              <span
                className={`time-control end-time ${isDragging(index, 'end') ? 'dragging' : ''}`}
                onMouseDown={(e) => onMouseDown(e, index, 'end')}
                onDoubleClick={() => handleTimeDoubleClick('end')}
              >
                {editingTime.field === 'end' ? (
                  <input
                    type="text"
                    value={editingTime.value}
                    onChange={handleTimeInputChange}
                    onBlur={() => handleTimeInputBlur('end')}
                    onKeyDown={e => { if (e.key === 'Enter') handleTimeInputBlur('end'); }}
                    style={{ width: 70, fontSize: '1em', borderRadius: 4, border: '1px solid #aaa', padding: '2px 4px' }}
                    autoFocus
                  />
                ) : (
                  formatTime(lyric.end, 'hms_ms')
                )}
              </span>
            </div>
          )}
        </div>

        <ContinuousProgressIndicator
          lyric={lyric}
          isCurrentLyric={isCurrentLyric}
          currentTime={currentTime}
        />
      </div>
    </div>
  );
};

// Use memo to prevent unnecessary re-renders
const MemoizedLyricItem = memo(LyricItem, (prevProps, nextProps) => {
  // Only re-render if these props change
  if (prevProps.isCurrentLyric !== nextProps.isCurrentLyric) return false;
  if (prevProps.isCurrentLyric && prevProps.currentTime !== nextProps.currentTime) return false;
  if (prevProps.lyric !== nextProps.lyric) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;
  if (prevProps.isEditing !== nextProps.isEditing) return false;
  if (prevProps.onMove !== nextProps.onMove) return false;

  // Don't re-render for other prop changes
  return true;
});

export default MemoizedLyricItem;
