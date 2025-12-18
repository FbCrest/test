import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateSubtitles, completeDocument, summarizeDocument } from '../services/geminiService';
import { downloadSRT, downloadJSON, downloadTXT } from '../utils/fileUtils';
import { formatSecondsToSRTTime } from '../utils/timeUtils';
import ModelDropdown from './ModelDropdown';
import DownloadOptionsModal from './DownloadOptionsModal';
import PromptEditor from './PromptEditor';
import ProgressStatus from './ProgressStatus';
import '../styles/TranslationModal.css';

const TranslationModal = ({ isOpen, onClose, subtitles, videoTitle, onTranslationComplete }) => {
  const { t } = useTranslation();
  const [targetLanguage, setTargetLanguage] = useState(() => {
    return localStorage.getItem('translation_target_language') || 'Tiếng Việt';
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSubtitles, setTranslatedSubtitles] = useState(null);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
  });
  const [txtContent, setTxtContent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedDocument, setProcessedDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [customTranslationPrompt, setCustomTranslationPrompt] = useState(
    localStorage.getItem('custom_prompt_translation') || null
  );
  const [splitDuration, setSplitDuration] = useState(() => {
    return parseInt(localStorage.getItem('translation_split_duration') || '0');
  });
  const [translationStatus, setTranslationStatus] = useState('');
  const [translationProgress, setTranslationProgress] = useState(0);

  const statusRef = useRef(null);
  const modalRef = useRef(null);

  // Update selectedModel when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedModel = localStorage.getItem('gemini_model');
      if (storedModel && storedModel !== selectedModel) {
        setSelectedModel(storedModel);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedModel]);

  // Listen for translation status updates
  useEffect(() => {
    const handleTranslationStatus = (event) => {
      setTranslationStatus(event.detail.message);
      if (event.detail.progress !== undefined) {
        setTranslationProgress(event.detail.progress);
      }

      if (statusRef.current) {
        statusRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('translation-status', handleTranslationStatus);
    return () => window.removeEventListener('translation-status', handleTranslationStatus);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const handleTranslate = async () => {
    if (!targetLanguage.trim()) {
      setError(t('translation.languageRequired', 'Please enter a target language'));
      return;
    }

    if (!subtitles || subtitles.length === 0) {
      setError(t('translation.noSubtitles', 'No subtitles to translate'));
      return;
    }

    setError('');
    setIsTranslating(true);

    try {
      const result = await translateSubtitles(subtitles, targetLanguage, selectedModel, customTranslationPrompt, splitDuration);
      setTranslatedSubtitles(result);
      // [LOG_REMOVED] 'TranslationModal: Translation completed, calling onTranslationComplete with:', result);
      if (onTranslationComplete) {
        onTranslationComplete(result);
      } else {
        console.warn('TranslationModal: onTranslationComplete callback is not provided');
      }

      localStorage.setItem('translation_split_duration', splitDuration.toString());
    } catch (err) {
      setError(t('translation.error', 'Error translating subtitles. Please try again.'));
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle download request from modal
  const handleDownload = (source, format) => {
    const subtitlesToUse = source === 'translated' ? translatedSubtitles : subtitles;

    if (subtitlesToUse && subtitlesToUse.length > 0) {
      const langSuffix = source === 'translated' ? `_${targetLanguage.toLowerCase().replace(/\\s+/g, '_')}` : '';
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
    }
  };

  // Handle process request from modal
  const handleProcess = async (source, processType, model) => {
    const subtitlesToUse = source === 'translated' ? translatedSubtitles : subtitles;

    if (!subtitlesToUse || subtitlesToUse.length === 0) return;

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

      const successMessage = document.createElement('div');
      successMessage.className = 'save-success-message';
      successMessage.textContent = processType === 'consolidate'
        ? t('output.documentCompleted', 'Document completed successfully')
        : t('output.summaryCompleted', 'Summary completed successfully');
      document.body.appendChild(successMessage);

      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);

      const langSuffix = source === 'translated' ? `_${targetLanguage.toLowerCase().replace(/\\s+/g, '_')}` : '';
      const baseFilename = `${videoTitle || 'subtitles'}${langSuffix}`;
      const filename = processType === 'consolidate'
        ? `${baseFilename}_document.txt`
        : `${baseFilename}_summary.txt`;

      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error processing document:', err);
      setError(t('output.processingError', 'Error processing document. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('gemini_model', modelId);
  };

  const handleSavePrompt = (prompt) => {
    setCustomTranslationPrompt(prompt);
    localStorage.setItem('custom_prompt_translation', prompt);
    setIsPromptEditorOpen(false);
  };

  const handleReset = () => {
    setTranslatedSubtitles(null);
    setError('');
    setTranslationStatus('');
  };

  if (!isOpen) return null;

  return (
    <div className="translation-modal-overlay">
      <div className="translation-modal" ref={modalRef}>
        <div className="translation-modal-header">
          <h3>{t('translation.title', 'Dịch phụ đề')}</h3>
          <button
            className="translation-modal-close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="translation-modal-content">
          <p className="translation-description">
            {t('translation.description', 'Dịch phụ đề đã chỉnh sửa sang ngôn ngữ khác trong khi vẫn giữ nguyên thông tin thời gian.')}
          </p>

          {/* Status will be shown inline at the action row next to the button */}

          <div className="translation-controls">
            {/* Language input */}
            <div className="translation-row language-row">
              <div className="row-label">
                <label htmlFor="target-language">{t('translation.targetLanguage', 'Ngôn ngữ đích')}:</label>
              </div>
              <div className="row-content">
                <input
                  id="target-language"
                  type="text"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  placeholder={t('translation.languagePlaceholder', 'Nhập ngôn ngữ đích (ví dụ: English, French, Japanese)')}
                  disabled={isTranslating || translatedSubtitles !== null}
                  className="language-input"
                />
              </div>
            </div>

            {/* Model selection */}
            {!translatedSubtitles ? (
              <>
                <div className="translation-row model-row">
                  <div className="row-label">
                    <label>{t('translation.modelSelection', 'Mô hình')}:</label>
                  </div>
                  <div className="row-content">
                    <select
                      value={selectedModel}
                      onChange={e => {
                        setSelectedModel(e.target.value);
                        localStorage.setItem('gemini_model', e.target.value);
                      }}
                      className="translation-model-select"
                    >
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Độ chính xác cao nhất, tốc độ chậm, dễ quá tải)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Độ chính xác cao, tốc độ nhanh, ít quá tải)</option>
                      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Độ chính xác tốt, tốc độ rất nhanh, ổn định)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Độ chính xác khá, tốc độ cao, luôn sẵn sàng)</option>
                      <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Độ chính xác trung bình, nhanh nhất, luôn sẵn sàng)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Ổn định, độ chính xác cao, phổ biến)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ổn định, nhanh, luôn sẵn sàng)</option>
                    </select>
                  </div>
                </div>

                {/* Split duration selection */}
                <div className="translation-row split-duration-row">
                  <div className="row-label">
                    <label>{t('translation.splitDuration', 'Thời gian chia')}:</label>
                  </div>
                  <div className="row-content">
                    <select
                      className="split-duration-select"
                      value={splitDuration}
                      onChange={(e) => setSplitDuration(parseInt(e.target.value))}
                      disabled={isTranslating}
                    >
                      <option value="0">{t('translation.noSplit', 'Không chia')}</option>
                      <option value="60">{t('translation.split60s', '1 phút')}</option>
                      <option value="120">{t('translation.split120s', '2 phút')}</option>
                      <option value="300">{t('translation.split300s', '5 phút')}</option>
                    </select>
                    <div className="help-icon-container" title={t('translation.splitDurationHelp', 'Chia phụ đề thành các đoạn nhỏ hơn để dịch hiệu quả hơn')}>
                      <svg className="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Prompt editing */}
                <div className="translation-row prompt-row">
                  <div className="row-label">
                    <label>{t('translation.promptSettings', 'Lệnh')}:</label>
                  </div>
                  <div className="row-content">
                    <button
                      className="edit-prompt-button-with-text"
                      onClick={() => setIsPromptEditorOpen(true)}
                      title={t('promptEditor.editPromptTooltip', 'Chỉnh sửa lệnh Gemini')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                      <span>{t('promptEditor.editPrompt', 'Chỉnh sửa lệnh')}</span>
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="translation-row action-row">
                  <div className="row-content action-content">
                    <button
                      className="translate-button"
                      onClick={handleTranslate}
                      disabled={isTranslating || !targetLanguage.trim()}
                    >
                      {isTranslating ? (
                        <>
                          <span className="loading-spinner"></span>
                          {t('translation.translating', 'Đang dịch...')}
                        </>
                      ) : (
                        t('translation.translate', 'Dịch')
                      )}
                    </button>

                    {isTranslating && (
                      <div className="inline-progress">
                        <ProgressStatus
                          message={translationStatus || t('translation.translating', 'Đang dịch...')}
                          type="loading"
                          progress={translationProgress}
                          showProgress={true}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline status is rendered next to the button above */}

                <PromptEditor
                  isOpen={isPromptEditorOpen}
                  onClose={() => setIsPromptEditorOpen(false)}
                  initialPrompt={customTranslationPrompt || `Translate the following subtitles to {targetLanguage}.

IMPORTANT: You MUST preserve the exact SRT format with numbers and timestamps.
DO NOT modify the timestamps or subtitle numbers.
ONLY translate the text content between timestamps and blank lines.
DO NOT include any explanations, comments, or additional text in your response.

Format must be exactly:
1
00:01:23,456 --> 00:01:26,789
Translated text here

2
00:01:27,123 --> 00:01:30,456
Next translated text here

Here are the subtitles to translate:\n\n{subtitlesText}`}
                  onSave={handleSavePrompt}
                  title={t('promptEditor.editTranslationPrompt', 'Chỉnh sửa lệnh dịch')}
                  description={t('promptEditor.customizeTranslationDesc', 'Tùy chỉnh cách Gemini dịch phụ đề của bạn.')}
                />
              </>
            ) : (
              <div className="translation-row action-row">
                <div className="row-content action-content">
                  <button
                    className="reset-translation-button"
                    onClick={handleReset}
                  >
                    {t('translation.newTranslation', 'Bản dịch mới')}
                  </button>

                  <DownloadOptionsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onDownload={handleDownload}
                    onProcess={handleProcess}
                    hasTranslation={translatedSubtitles && translatedSubtitles.length > 0}
                    hasOriginal={subtitles && subtitles.length > 0}
                  />
                </div>
              </div>
            )}

            {/* Error message section */}
            {error && (
              <div className="translation-row error-row">
                <div className="row-content">
                  <div className="translation-error">{error}</div>
                </div>
              </div>
            )}

            {/* Translation Preview Section */}
            {translatedSubtitles && translatedSubtitles.length > 0 && (
              <div className="translation-preview">
                <div className="translation-preview-header">
                  <h4>{t('translation.preview', 'Xem trước bản dịch')}</h4>
                  <div className="translation-stats">
                    <span className="stats-item">
                      <strong>{translatedSubtitles.length}</strong> phụ đề đã dịch
                    </span>
                    <span className="stats-item">
                      <strong>{subtitles ? subtitles.length : 0}</strong> phụ đề gốc
                    </span>
                    <span className="stats-item">
                      Ngôn ngữ dịch: <strong>{targetLanguage}</strong>
                    </span>
                  </div>
                </div>
                <div className="translation-preview-content">
                  <div className="preview-subtitles-container">
                    {translatedSubtitles.slice(0, 5).map((subtitle, index) => {
                      // [LOG_REMOVED] 'TranslationModal: Preview subtitle', index, ':', subtitle);
                      return (
                        <div key={index} className="preview-subtitle-item">
                          <span className="preview-time">
                            {formatSecondsToSRTTime(subtitle.start)} {'-->'} {formatSecondsToSRTTime(subtitle.end)}
                          </span>
                          <span className="preview-text">{subtitle.text}</span>
                        </div>
                      );
                    })}
                  </div>
                  {translatedSubtitles.length > 5 && (
                    <div className="preview-more">
                      <div className="more-info">
                        <span className="more-text">
                          Hiển thị 5 phụ đề đầu tiên
                        </span>
                        <span className="more-count">
                          Còn {translatedSubtitles.length - 5} phụ đề khác
                        </span>
                      </div>
                      <div className="preview-progress">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${(5 / translatedSubtitles.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {translatedSubtitles.length <= 5 && (
                    <div className="preview-complete">
                      <span className="complete-text">
                        Hiển thị tất cả {translatedSubtitles.length} phụ đề đã dịch
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationModal; 