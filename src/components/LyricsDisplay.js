import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/LyricsDisplay.css';
import TimelineVisualization from './lyrics/TimelineVisualization';
import LyricItem from './lyrics/LyricItem';
import LyricsHeader from './lyrics/LyricsHeader';
import { useLyricsEditor } from '../hooks/useLyricsEditor';
import { VariableSizeList as List } from 'react-window';
import { convertToSRT } from '../utils/subtitleConverter';
import { extractYoutubeVideoId } from '../utils/videoDownloader';
import { downloadTXT, downloadSRT, downloadJSON } from '../utils/fileUtils';
import { completeDocument, summarizeDocument } from '../services/geminiService';
import DownloadOptionsModal from './DownloadOptionsModal';
import CustomRadio from './inputs/CustomRadio';

// Helper function to download files
const downloadFile = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Virtualized row renderer for lyrics
const VirtualizedLyricRow = ({ index, style, data }) => {
  const {
    lyrics,
    currentIndex,
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
    timeFormat
  } = data;

  const lyric = lyrics[index];
  const hasNextLyric = index < lyrics.length - 1;

  return (
    <div style={style}>
      <LyricItem
        key={index}
        lyric={lyric}
        index={index}
        isCurrentLyric={index === currentIndex}
        currentTime={currentTime}
        allowEditing={allowEditing}
        isDragging={isDragging}
        onLyricClick={onLyricClick}
        onMouseDown={onMouseDown}
        getLastDragEnd={getLastDragEnd}
        onDelete={onDelete}
        onTextEdit={onTextEdit}
        onInsert={onInsert}
        onMerge={onMerge}
        onMove={onMove}
        hasNextLyric={hasNextLyric}
        timeFormat={timeFormat}
      />
    </div>
  );
};

const LyricsDisplay = ({
  matchedLyrics,
  currentTime,
  onLyricClick,
  duration,
  onUpdateLyrics,
  allowEditing = false,
  seekTime = null,
  timeFormat = 'seconds',
  onSaveSubtitles = null, // New callback for when subtitles are saved
  videoSource = null, // Video source URL for audio analysis
  originalSubtitles = null, // The original, unedited subtitles
  translatedSubtitles = null, // Translated subtitles
  videoTitle = 'subtitles', // Video title for download filenames
  onRenderWithSubtitles = null, // Function to render with subtitles
  onRenderWithTranslatedSubtitles = null, // Function to render with translated subtitles
  targetLanguage = null // Target language for translated subtitles
}) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [centerTimelineAt, setCenterTimelineAt] = useState(null);
  const rowHeights = useRef({});
  const [txtContent, setTxtContent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedDocument, setProcessedDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showWaveform, setShowWaveform] = useState(() => {
    // Load from localStorage, default to true if not set
    return localStorage.getItem('show_waveform') !== 'false';
  });
  const [exportSubtitleSource, setExportSubtitleSource] = useState('original');

  // Function to calculate row height based on text content
  const getRowHeight = index => {
    // If we already calculated this height, return it
    if (rowHeights.current[index] !== undefined) {
      return rowHeights.current[index];
    }

    const lyric = matchedLyrics[index];
    if (!lyric) return 50; // Default height

    // Calculate height based on text length
    const text = lyric.text || '';
    const lineCount = text.split('\n').length; // Count actual line breaks
    const estimatedLines = Math.ceil(text.length / 40); // Estimate based on characters per line
    const lines = Math.max(lineCount, estimatedLines);

    // Base height + additional height per line
    const height = 50 + (lines > 1 ? (lines - 1) * 20 : 0);

    // Cache the calculated height
    rowHeights.current[index] = height;
    return height;
  };

  // Reset row heights when lyrics change
  useEffect(() => {
    rowHeights.current = {};
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [matchedLyrics]);

  // Listen for changes to the show_waveform setting in localStorage
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'show_waveform') {
        setShowWaveform(event.newValue !== 'false');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const {
    lyrics,
    isSticky,
    setIsSticky,
    isAtOriginalState,
    isAtSavedState,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleReset,
    startDrag,
    handleDrag,
    endDrag,
    isDragging,
    getLastDragEnd,
    handleDeleteLyric,
    handleTextEdit,
    handleInsertLyric,
    handleMergeLyrics,
    handleMoveLyric,
    updateSavedLyrics
  } = useLyricsEditor(Array.isArray(matchedLyrics) ? matchedLyrics : [], onUpdateLyrics);

  // Find current lyric index based on time
  const currentIndex = lyrics.findIndex((lyric, index) => {
    const nextLyric = lyrics[index + 1];
    return currentTime >= lyric.start &&
      (nextLyric ? currentTime < nextLyric.start : currentTime <= lyric.end);
  });

  // Reference to the virtualized list
  const listRef = useRef(null);

  // Auto-scroll to the current lyric with accurate positioning
  useEffect(() => {
    if (currentIndex >= 0 && listRef.current) {
      // Scroll to the current index in the virtualized list
      listRef.current.scrollToItem(currentIndex, 'center');
    }
  }, [currentIndex]);

  // Watch for seekTime changes to center the timeline
  useEffect(() => {
    if (seekTime !== null) {
      // Center the timeline on the seek time
      setCenterTimelineAt(seekTime);

    }
  }, [seekTime]);

  // Handle download request from modal
  const handleDownload = (source, format) => {
    // Always use the true original or true translated subtitles
    const subtitlesToUse = source === 'translated' ? translatedSubtitles : originalSubtitles;

    if (subtitlesToUse && subtitlesToUse.length > 0) {
      let langSuffix = '';
      if (source === 'translated') {
        const safeTargetLanguage = targetLanguage ? targetLanguage : 'translated';
        langSuffix = `_${safeTargetLanguage.toLowerCase().replace(/\s+/g, '_')}`;
      }
      const baseFilename = `${videoTitle || 'subtitles'}${langSuffix}`;

      switch (format) {
        case 'srt':
          downloadSRT(subtitlesToUse, `${baseFilename}.srt`);
          break;
        case 'json':
          downloadJSON(subtitlesToUse, `${baseFilename}.json`);
          break;
        case 'txt':
          const content = downloadTXT(subtitlesToUse, `${baseFilename}.txt`);
          setTxtContent(content);
          break;
        default:
          break;
      }
    } else {
      // [LOG_REMOVED] LyricsDisplay render:No subtitles available for download, source:', source, 'subtitlesToUse:', subtitlesToUse);
    }
  };


  // Handle process request from modal
  const handleProcess = async (source, processType, model) => {
    const subtitlesToUse = source === 'translated' ? translatedSubtitles : lyrics;

    if (!subtitlesToUse || subtitlesToUse.length === 0) return;

    // First, get the text content if we don't have it yet
    let textContent = txtContent;
    if (!textContent) {
      textContent = subtitlesToUse.map(subtitle => subtitle.text).join('\n\n');
      setTxtContent(textContent);
    }

    setIsProcessing(true);
    try {
      let result;
      if (processType === 'consolidate') {
        result = await completeDocument(textContent, model);
      } else if (processType === 'summarize') {
        result = await summarizeDocument(textContent, model);
      }

      setProcessedDocument(result);

      // Show a temporary success message
      const successMessage = document.createElement('div');
      successMessage.className = 'save-success-message';
      successMessage.textContent = processType === 'consolidate'
        ? t('output.documentCompleted', 'Document completed successfully')
        : t('output.summaryCompleted', 'Summary completed successfully');
      document.body.appendChild(successMessage);

      // Remove the message after 3 seconds
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);

      // Download the processed document
      const langSuffix = source === 'translated' ? '_translated' : '';
      const filename = `${videoTitle || 'subtitles'}_${processType === 'consolidate' ? 'completed' : 'summary'}${langSuffix}.txt`;
      downloadFile(result, filename);
    } catch (err) {
      console.error(`Error ${processType === 'consolidate' ? 'completing' : 'summarizing'} document:`, err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to save current subtitles to cache
  const handleSave = async () => {
    try {
      // Get the current video source
      const currentVideoUrl = localStorage.getItem('current_youtube_url');
      const currentFileUrl = localStorage.getItem('current_file_url');
      let cacheId = null;

      if (currentVideoUrl) {
        // For YouTube videos
        cacheId = extractYoutubeVideoId(currentVideoUrl);
      } else if (currentFileUrl) {
        // For uploaded files, the cacheId is already stored
        cacheId = localStorage.getItem('current_file_cache_id');
      }

      if (!cacheId) {
        console.error('No cache ID found for current media');
        // [LOG_REMOVED] 'Debug info - localStorage values:', {
        //   currentVideoUrl,
        //   currentFileUrl,
        //   currentFileCacheId: localStorage.getItem('current_file_cache_id')
        // });
        return;
      }

      // Save to cache
      const response = await fetch('http://localhost:3004/api/save-subtitles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cacheId,
          subtitles: lyrics
        })
      });

      const result = await response.json();
      if (result.success) {
        // [LOG_REMOVED] 'Subtitles saved successfully');
        // Show a temporary success message
        const saveMessage = document.createElement('div');
        saveMessage.className = 'save-success-message';
        saveMessage.textContent = t('output.subtitlesSaved', 'Progress saved successfully');
        document.body.appendChild(saveMessage);

        // Remove the message after 3 seconds
        setTimeout(() => {
          if (document.body.contains(saveMessage)) {
            document.body.removeChild(saveMessage);
          }
        }, 3000);

        // Update the saved lyrics state in the editor
        updateSavedLyrics();

        // Call the callback if provided to update parent component state
        if (onSaveSubtitles) {
          onSaveSubtitles(lyrics);
        }
      } else {
        console.error('Failed to save subtitles:', result.error);
      }
    } catch (err) {
      console.error('Error saving subtitles:', err);
    }
  };

  // Setup drag event handlers with performance optimizations
  const handleMouseDown = (e, index, field) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(index, field, e.clientX, lyrics[index][field]);

    // Use passive event listeners for better performance
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });

    // Add a class to the body to indicate dragging is in progress
    document.body.classList.add('lyrics-dragging');
  };

  // Use a throttled mouse move handler
  const lastMoveTimeRef = useRef(0);
  const handleMouseMove = (e) => {
    e.preventDefault();

    // Throttle mousemove events
    const now = performance.now();
    if (now - lastMoveTimeRef.current < 16) { // ~60fps
      return;
    }
    lastMoveTimeRef.current = now;

    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      handleDrag(e.clientX, duration);
    });
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.classList.remove('lyrics-dragging');
    endDrag();
  };



  return (
    <div className={`lyrics-display ${Object.keys(isDragging()).length > 0 ? 'dragging-active' : ''}`}>
      <div className="controls-timeline-container">
        <LyricsHeader
          allowEditing={allowEditing}
          isSticky={isSticky}
          setIsSticky={setIsSticky}
          canUndo={canUndo}
          canRedo={canRedo}
          isAtOriginalState={isAtOriginalState}
          isAtSavedState={isAtSavedState}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onReset={handleReset}
          onSave={handleSave}
          zoom={zoom}
          setZoom={setZoom}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
        />

        <TimelineVisualization
          lyrics={lyrics}
          currentTime={currentTime}
          duration={duration}
          onTimelineClick={onLyricClick}
          zoom={zoom}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          centerOnTime={centerTimelineAt}
          timeFormat={timeFormat}
          videoSource={videoSource}
          showWaveform={showWaveform}
        />
      </div>

      <div className="lyrics-container-wrapper">
        {lyrics.length > 0 && (
          <List
            ref={listRef}
            className="lyrics-container"
            height={300} // Reduced height for more compact view
            width="100%"
            itemCount={lyrics.length}
            itemSize={getRowHeight} // Dynamic row heights based on content
            overscanCount={5} // Number of items to render outside of the visible area
            itemData={{
              lyrics,
              currentIndex,
              currentTime,
              allowEditing,
              isDragging,
              onLyricClick: (time) => {
                // Center the timeline on the clicked lyric
                setCenterTimelineAt(time);
                // Reset the center time in the next frame to allow future clicks to work
                requestAnimationFrame(() => {
                  setCenterTimelineAt(null);
                });
                // Call the original onLyricClick function
                onLyricClick(time);
              },
              onMouseDown: handleMouseDown,
              getLastDragEnd,
              onDelete: handleDeleteLyric,
              onTextEdit: handleTextEdit,
              onInsert: handleInsertLyric,
              onMerge: handleMergeLyrics,
              onMove: handleMoveLyric,
              timeFormat
            }}
          >
            {VirtualizedLyricRow}
          </List>
        )}
      </div>

      <div className="help-text-container">
        {allowEditing && (
          <div className="help-text">
            <p>{t('lyrics.timingInstructions')}</p>
            <p className="drag-instructions">
              {t('lyrics.dragInstructions', 'Drag and drop a subtitle above or below to move it. Drop in the middle of another subtitle to merge them.')}
            </p>
          </div>
        )}

        <div className="download-buttons">
          <button
            className="main-action-btn download-btn"
            onClick={() => setIsModalOpen(true)}
            disabled={!lyrics.length}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{t('download.downloadOptions', 'Download Subtitles')}</span>
          </button>

          <button
            className="main-action-btn export-btn"
            onClick={() => setIsExportModalOpen(true)}
            disabled={!lyrics.length}
            title={t('subtitleSettings.downloadWithSubtitlesTooltip', 'Download video with original subtitles')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Xuất video</span>
          </button>

          {/* Download Options Modal */}
          <DownloadOptionsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onDownload={handleDownload}
            onProcess={handleProcess}
            hasTranslation={translatedSubtitles && translatedSubtitles.length > 0}
            hasOriginal={lyrics && lyrics.length > 0}
          />

          {/* Export Modal */}
          {isExportModalOpen && (
            <div className="export-modal-overlay" onClick={() => setIsExportModalOpen(false)}>
              <div className="export-modal" onClick={(e) => e.stopPropagation()}>
                <div className="export-modal-header">
                  <h3>Xuất video</h3>
                  <button 
                    className="export-modal-close-button"
                    onClick={() => setIsExportModalOpen(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="export-modal-content">
                  <p>{t('lyrics.selectSubtitleType', 'Chọn loại phụ đề để xuất:')}</p>
                  
                  {/* Warning message */}
                  <div className="export-warning-message" style={{ 
                    backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                    border: '1px solid rgba(255, 193, 7, 0.3)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    margin: '12px 0',
                    color: '#ffc107',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    ⚠️ <strong>{t('common.note', 'Lưu ý')}:</strong> {t('lyrics.exportWarning', 'Chức năng xuất video đang trong giai đoạn thử nghiệm và có thể gây ra video bị đứng hình. Khuyến nghị xuất phụ đề và sử dụng ứng dụng bên thứ 3 (như DaVinci Resolve, Adobe Premiere) để chỉnh sửa video.')}
                  </div>
                  
                  <div className="export-modal-radio-group" style={{ display: 'flex', gap: '1.5rem', flexDirection: 'row', alignItems: 'center' }}>
                    <CustomRadio
                      name="export-subtitle-source"
                      value="original"
                      checked={exportSubtitleSource === 'original'}
                      onChange={() => setExportSubtitleSource('original')}
                      label={t('lyrics.originalSubtitles', 'Phụ đề gốc')}
                      className="export-modal-radio-option"
                    />
                    <CustomRadio
                      name="export-subtitle-source"
                      value="translated"
                      checked={exportSubtitleSource === 'translated'}
                      onChange={() => setExportSubtitleSource('translated')}
                      label={t('lyrics.translatedSubtitles', 'Phụ đề đã dịch')}
                      className={`export-modal-radio-option${!translatedSubtitles || !translatedSubtitles.length ? ' disabled' : ''}`}
                      disabled={!translatedSubtitles || !translatedSubtitles.length}
                    />
                  </div>
                </div>
                
                <div className="export-modal-footer">
                  <button 
                    className="export-modal-cancel-button"
                    onClick={() => setIsExportModalOpen(false)}
                  >
                    {t('lyrics.cancel', 'Hủy')}
                  </button>
                  
                  <button 
                    className="export-modal-action-button" 
                    onClick={() => {
                      // [LOG_REMOVED] 'Selected source:', exportSubtitleSource;
                      // [LOG_REMOVED] 'onRenderWithSubtitles:', onRenderWithSubtitles;
                      // [LOG_REMOVED] 'onRenderWithTranslatedSubtitles:', onRenderWithTranslatedSubtitles;
                      
                      if (exportSubtitleSource === 'original') {
                        // [LOG_REMOVED] 'Calling onRenderWithSubtitles';
                        if (onRenderWithSubtitles) {
                          onRenderWithSubtitles();
                        } else {
                          console.error('onRenderWithSubtitles function is not available');
                        }
                      } else {
                        // [LOG_REMOVED] 'Calling onRenderWithTranslatedSubtitles';
                        if (onRenderWithTranslatedSubtitles) {
                          onRenderWithTranslatedSubtitles();
                        } else {
                          console.error('onRenderWithTranslatedSubtitles function is not available');
                        }
                      }
                      setIsExportModalOpen(false);
                    }}
                  >
                    {t('lyrics.export', 'Xuất')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LyricsDisplay;