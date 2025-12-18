import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PROMPT_PRESETS } from '../../services/geminiService';
import { getFileSizeRecommendations } from '../../utils/errorHandler';
import './FileUploadInput.css';

const FileUploadInput = ({ uploadedFile, setUploadedFile, className, onStatusChange }) => {
  const { t } = useTranslation();
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);


  const fileInputRef = useRef(null);
  const [selectedPresetId, setSelectedPresetId] = useState(() => localStorage.getItem('selected_preset_id') || PROMPT_PRESETS[0].id);

  // Maximum file size in MB (1GB = 1024MB) - Reduced to prevent server overload
  const MAX_FILE_SIZE_MB = 1024;


  // Supported file formats - wrapped in useMemo to avoid dependency issues
  const SUPPORTED_VIDEO_FORMATS = useMemo(() => [
    "video/mp4", "video/mpeg", "video/mov", "video/avi", "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp"
  ], []);

  const SUPPORTED_AUDIO_FORMATS = useMemo(() => [
    "audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac", "audio/mpeg"
  ], []);

  // Add state to track prompt changes and force re-render
  const [promptVersion, setPromptVersion] = useState(0);

  // Thêm state cho menu
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const promptMenuRef = useRef(null);



  // Đóng menu khi click ra ngoài
  useEffect(() => {
    if (!showPromptMenu) return;
    function handleClickOutside(e) {
      if (promptMenuRef.current && !promptMenuRef.current.contains(e.target)) {
        setShowPromptMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPromptMenu]);

  // Get current prompt name and color
  const getCurrentPromptInfo = useCallback(() => {
    const selectedPresetId = localStorage.getItem('selected_preset_id');
    const customPrompt = localStorage.getItem('transcription_prompt');
    
    // Mapping for short Vietnamese names of presets
    const presetNameMapping = {
      'general': 'Nhận diện lời nói',
      'extract-text': 'Trích xuất phụ đề (HardSub)',
      'combined-subtitles': 'Phụ đề kết hợp',
      'focus-lyrics': 'Trích xuất lời bài hát',
      'describe-video': 'Mô tả video',
      'chaptering': 'Phân chương',
      'diarize-speakers': 'Nhận diện người nói'
    };

    // Mapping for prompt colors (same as in settings)
    const presetColorMapping = {
      'general': 'prompt-color-general',
      'extract-text': 'prompt-color-extract',
      'combined-subtitles': 'prompt-color-combined',
      'focus-lyrics': 'prompt-color-lyrics',
      'describe-video': 'prompt-color-describe',
      'chaptering': 'prompt-color-chapter',
      'diarize-speakers': 'prompt-color-speakers'
    };
    
    // First priority: If there's a selected preset, show its name and color
    if (selectedPresetId) {
      const preset = PROMPT_PRESETS.find(p => p.id === selectedPresetId);
      if (preset) {
        return {
          name: presetNameMapping[preset.id] || preset.purposeVi || preset.title,
          colorClass: presetColorMapping[preset.id] || 'prompt-color-default'
        };
      }
    }
    
    // Second priority: If there's a custom prompt but no preset selected, analyze the prompt
    if (customPrompt && customPrompt.trim() !== '') {
      // Try to extract a meaningful name from the custom prompt
      const promptText = customPrompt.trim();
      const firstLine = promptText.split('\n')[0];
      
      // If the first line looks like a title/name, use it
      if (firstLine.length < 50 && !firstLine.includes('{contentType}')) {
        return {
          name: firstLine,
          colorClass: 'prompt-color-custom'
        };
      }
      
      // Otherwise, try to find a descriptive name from the prompt content
      if (promptText.includes('transcribe') || promptText.includes('phiên âm')) {
        return {
          name: t('fileUpload.transcriptionPrompt', 'Transcription Prompt'),
          colorClass: 'prompt-color-general'
        };
      } else if (promptText.includes('extract') || promptText.includes('trích xuất')) {
        return {
          name: t('fileUpload.extractionPrompt', 'Extraction Prompt'),
          colorClass: 'prompt-color-extract'
        };
      } else if (promptText.includes('translate') || promptText.includes('dịch')) {
        return {
          name: t('fileUpload.translationPrompt', 'Translation Prompt'),
          colorClass: 'prompt-color-translate'
        };
      } else if (promptText.includes('describe') || promptText.includes('mô tả')) {
        return {
          name: t('fileUpload.descriptionPrompt', 'Description Prompt'),
          colorClass: 'prompt-color-describe'
        };
      } else if (promptText.includes('lyrics') || promptText.includes('lời bài hát')) {
        return {
          name: t('fileUpload.lyricsPrompt', 'Lyrics Prompt'),
          colorClass: 'prompt-color-lyrics'
        };
      } else if (promptText.includes('speaker') || promptText.includes('người nói')) {
        return {
          name: t('fileUpload.speakerPrompt', 'Speaker Identification Prompt'),
          colorClass: 'prompt-color-speakers'
        };
      } else if (promptText.includes('chapter') || promptText.includes('chương')) {
        return {
          name: t('fileUpload.chapterPrompt', 'Chapter Prompt'),
          colorClass: 'prompt-color-chapter'
        };
      } else {
        return {
          name: t('fileUpload.customPrompt', 'Custom Prompt'),
          colorClass: 'prompt-color-custom'
        };
      }
    }
    
    // Default: Use the first preset name and color
    return {
      name: presetNameMapping['general'] || PROMPT_PRESETS[0].purposeVi || PROMPT_PRESETS[0].title,
      colorClass: presetColorMapping['general'] || 'prompt-color-default'
    };
  }, [t, promptVersion]);

  // Check if file is a video - wrapped in useCallback to avoid dependency issues
  const isVideoFile = useCallback((mimeType) => {
    return SUPPORTED_VIDEO_FORMATS.includes(mimeType);
  }, [SUPPORTED_VIDEO_FORMATS]);

  // Check if file is an audio - wrapped in useCallback to avoid dependency issues
  const isAudioFile = useCallback((mimeType) => {
    return SUPPORTED_AUDIO_FORMATS.includes(mimeType);
  }, [SUPPORTED_AUDIO_FORMATS]);

  // Display file information - wrapped in useCallback to avoid dependency issues
  const displayFileInfo = useCallback((file) => {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const mediaType = isVideoFile(file.type) ? 'Video' : 'Audio';

    setFileInfo({
      name: file.name,
      type: file.type,
      size: `${fileSizeMB} MB`,
      mediaType
    });
  }, [isVideoFile]);

  // Update fileInfo when uploadedFile changes (for auto-downloaded files)
  useEffect(() => {
    if (uploadedFile) {
      displayFileInfo(uploadedFile);
    }
  }, [uploadedFile, displayFileInfo]);

  // Listen for changes in selected preset with improved logic
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'selected_preset_id' || event.key === 'transcription_prompt') {
        // Increment version to force re-render
        setPromptVersion(prev => prev + 1);
        // Also update fileInfo if it exists
        setFileInfo(prev => prev ? { ...prev } : null);
        
        // Reset file input to allow re-upload of the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab changes)
    const handlePresetChange = () => {
      setPromptVersion(prev => prev + 1);
      setFileInfo(prev => prev ? { ...prev } : null);
      
      // Reset file input to allow re-upload of the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    window.addEventListener('preset-changed', handlePresetChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('preset-changed', handlePresetChange);
    };
  }, []);

  useEffect(() => {
    setSelectedPresetId(localStorage.getItem('selected_preset_id') || PROMPT_PRESETS[0].id);
  }, [promptVersion]);

  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    localStorage.setItem('selected_preset_id', presetId);
    const preset = PROMPT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      localStorage.setItem('transcription_prompt', preset.prompt);
      window.dispatchEvent(new CustomEvent('preset-changed', { detail: { presetId } }));
    }
    setPromptVersion(prev => prev + 1);
  };

  // Validate file type and size
  const validateFile = (file) => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(t('fileUpload.sizeError', 'Kích thước tập tin vượt quá giới hạn tối đa {{size}} MB. Để tránh lỗi server, vui lòng sử dụng file nhỏ hơn hoặc nén lại video.', { size: MAX_FILE_SIZE_MB }));
      return false;
    }

    // Check file type
    if (!isVideoFile(file.type) && !isAudioFile(file.type)) {
      const errorMessage = t('fileUpload.formatError', 'Định dạng tập tin không được hỗ trợ. Vui lòng tải lên tập tin video hoặc audio được hỗ trợ.');
      if (onStatusChange) {
        onStatusChange({ message: errorMessage, type: 'error' });
      } else {
        setError(errorMessage);
      }
      return false;
    }

    // Show warning for files larger than 200MB
    if (fileSizeMB > 200) {
      const warningMessage = t('fileUpload.largeSizeWarning', 'File có dung lượng {{size}}MB quá lớn, cần nén hoặc chia nhỏ video dưới 200MB để tránh quá tải', { size: fileSizeMB.toFixed(2) });
      
      if (onStatusChange) {
        onStatusChange({ message: warningMessage, type: 'warning' });
      } else {
        setError(warningMessage);
      }
      // Don't return false - let the file proceed but show warning
    }

    // Clear error and status messages for files under 200MB
    if (fileSizeMB <= 200) {
      setError('');
      if (onStatusChange) {
        onStatusChange({ message: '', type: '' });
      }
    }
    return true;
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  // Process the file
  const processFile = async (file) => {
    if (file) {
      // Debug file info
      console.log('📁 File info:', {
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + 'MB',
        fileType: file.type
      });
      
      if (validateFile(file)) {
        let finalFile = file;
        
        // Just process the file normally
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`📁 Processing ${fileSizeMB.toFixed(1)}MB file`);

        // Clear ALL video-related storage first
        localStorage.removeItem('current_video_url');
        localStorage.removeItem('current_file_cache_id');
        if (localStorage.getItem('current_file_url')) {
          URL.revokeObjectURL(localStorage.getItem('current_file_url'));
          localStorage.removeItem('current_file_url');
        }

        // Create a new object URL for the file
        const objectUrl = URL.createObjectURL(finalFile);
        localStorage.setItem('current_file_url', objectUrl);

        // Clear any selected YouTube video state - handled by parent component

        console.log('📁 Final file info:', {
          name: finalFile.name,
          size: (finalFile.size / (1024 * 1024)).toFixed(2) + 'MB',
          type: finalFile.type
        });
        
        setUploadedFile(finalFile);
        displayFileInfo(finalFile);
      } else {
        setUploadedFile(null);
        setFileInfo(null);
        if (localStorage.getItem('current_file_url')) {
          URL.revokeObjectURL(localStorage.getItem('current_file_url'));
          localStorage.removeItem('current_file_url');
        }
      }
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`file-upload-input ${isDragOver ? 'drag-over' : ''} ${className || ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".mp4,.mov,.avi,.mp3,.wav,.aac,.ogg"
        className="hidden-file-input"
      />

      {!uploadedFile ? (
        <div className="upload-content">
          <svg className="upload-icon" viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h3>{t('inputMethods.dragDropText')}</h3>
          <p>{t('inputMethods.orText')}</p>
          <p className="browse-text">{t('inputMethods.browse')}</p>
          <p className="upload-help-text">{t('inputMethods.supportedFormats')}</p>
          <p className="upload-help-text">{t('inputMethods.maxFileSize')}</p>
          <p className="upload-help-text">💡 Khuyến nghị nén hoặc chia nhỏ video dưới 200MB để đảm bảo xử lý ổn định</p>
        </div>
      ) : (
        <div className="file-info-card">
          {fileInfo && isVideoFile(fileInfo.type) ? (
            <svg className="file-type-icon video" viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
          ) : (
            <svg className="file-type-icon audio" viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          )}

          <div className="file-info-content">
            <h4 className="file-name">{fileInfo?.name || uploadedFile?.name || 'File'}</h4>
            <div className="file-tags">
              <span className="file-badge">{fileInfo?.mediaType || (uploadedFile && isVideoFile(uploadedFile.type) ? 'VIDEO' : 'AUDIO')}</span>
              {uploadedFile && isVideoFile(uploadedFile.type) && (
                <>
                  <span className="file-badge format-badge">{uploadedFile.type.split('/')[1].toUpperCase()}</span>
                  {(uploadedFile.size / (1024 * 1024)) > 200 && (
                    <span className="file-badge compress-badge">LARGE</span>
                  )}
                  {(uploadedFile.size / (1024 * 1024)) > 500 && (
                    <span className="file-badge size-badge">HD</span>
                  )}
                </>
              )}
              {uploadedFile && isAudioFile(uploadedFile.type) && (
                <span className="file-badge format-badge">{uploadedFile.type.split('/')[1].toUpperCase()}</span>
              )}
            </div>
            
            {/* File Size Info Section */}
            <div className="file-size-section">
              <div className="file-size-info">
                <span className="size-label">Dung lượng:</span>
                <span className="size-value">{fileInfo?.size || (uploadedFile ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB` : '')}</span>
              </div>
            </div>
            

            

            
            <div className="file-actions">
              <button
                type="button"
                className={`current-prompt ${getCurrentPromptInfo().colorClass}`}
                onClick={e => { e.stopPropagation(); setShowPromptMenu(v => !v); }}
                title="Chọn cách lấy phụ đề"
                style={{ cursor: 'pointer' }}
              >
                {t('fileUpload.usingPrompt', 'Using:')} {getCurrentPromptInfo().name}
                <span style={{ marginLeft: 6, fontSize: 13, opacity: 0.7 }}>▼</span>
              </button>
              {showPromptMenu && (
                <div className="prompt-menu-dropdown" ref={promptMenuRef}>
                  {PROMPT_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`prompt-menu-item${selectedPresetId === preset.id ? ' selected' : ''}`}
                      onClick={e => { e.stopPropagation(); handleSelectPreset(preset.id); setShowPromptMenu(false); }}
                    >
                      <span className={`prompt-menu-dot ${preset.id}`}></span>
                      {preset.title}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="remove-file-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileInfo(null);
                  setUploadedFile(null);
                  if (localStorage.getItem('current_file_url')) {
                    URL.revokeObjectURL(localStorage.getItem('current_file_url'));
                    localStorage.removeItem('current_file_url');
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                {t('fileUpload.remove', 'Remove')}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default FileUploadInput;