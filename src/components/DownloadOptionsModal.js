import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ModelDropdown from './ModelDropdown';
import PromptEditor from './PromptEditor';
// Import default prompts from geminiService if needed in the future
// import { getDefaultConsolidatePrompt, getDefaultSummarizePrompt } from '../services/geminiService';
import '../styles/DownloadOptionsModal.css';

/**
 * Modal component for download and processing options
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onDownload - Function to handle download
 * @param {Function} props.onProcess - Function to handle processing (consolidate/summarize)
 * @param {boolean} props.hasTranslation - Whether translation is available
 * @param {boolean} props.hasOriginal - Whether original subtitles are available
 * @returns {JSX.Element} - Rendered component
 */
const DownloadOptionsModal = ({
  isOpen,
  onClose,
  onDownload,
  onProcess,
  hasTranslation = false,
  hasOriginal = true
}) => {
  const { t } = useTranslation();
  const [subtitleSource, setSubtitleSource] = useState('original');
  const [fileFormat, setFileFormat] = useState('srt');
  const [processType, setProcessType] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
  });
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [customConsolidatePrompt, setCustomConsolidatePrompt] = useState(
    localStorage.getItem('custom_prompt_consolidate') || null
  );
  const [customSummarizePrompt, setCustomSummarizePrompt] = useState(
    localStorage.getItem('custom_prompt_summarize') || null
  );

  const modalRef = useRef(null);

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

  // Handle download button click
  const handleDownload = () => {
    onDownload(subtitleSource, fileFormat);
    onClose();
  };

  // Handle process button click
  const handleProcess = () => {
    onProcess(subtitleSource, processType, selectedModel);
    onClose();
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('gemini_model', modelId);
  };

  const handleSavePrompt = (prompt) => {
    if (processType === 'consolidate') {
      setCustomConsolidatePrompt(prompt);
      localStorage.setItem('custom_prompt_consolidate', prompt);
    } else if (processType === 'summarize') {
      setCustomSummarizePrompt(prompt);
      localStorage.setItem('custom_prompt_summarize', prompt);
    }
    setIsPromptEditorOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="download-options-modal" ref={modalRef}>
        <div className="modal-header">
          <h3>{t('download.options', 'Download Options')}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Subtitle source selection */}
          <div className="option-group">
            <h4>{t('download.subtitleSource', 'Subtitle Source')}</h4>
            <div className="radio-group">
              <label className={`radio-option ${!hasOriginal ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  name="subtitle-source"
                  value="original"
                  checked={subtitleSource === 'original'}
                  onChange={() => setSubtitleSource('original')}
                  disabled={!hasOriginal}
                />
                <span>{t('download.original', 'Original')}</span>
              </label>
              <label className={`radio-option ${!hasTranslation ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  name="subtitle-source"
                  value="translated"
                  checked={subtitleSource === 'translated'}
                  onChange={() => setSubtitleSource('translated')}
                  disabled={!hasTranslation}
                />
                <span>{t('download.translated', 'Translated')}</span>
              </label>
            </div>
          </div>

          {/* Action tabs */}
          <div className="tabs">
            <div
              className={`tab ${fileFormat ? 'active' : ''}`}
              onClick={() => {
                setFileFormat('srt');
                setProcessType(null);
              }}
            >
              {t('download.downloadFiles', 'Download Files')}
            </div>
            <div
              className={`tab ${processType ? 'active' : ''}`}
              onClick={() => {
                setFileFormat(null);
                setProcessType('consolidate');
              }}
            >
              {t('download.processText', 'Process Text')}
            </div>
          </div>

          {/* File format options */}
          {fileFormat && (
            <div className="option-group">
              <h4>{t('download.fileFormat', 'File Format')}</h4>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="file-format"
                    value="srt"
                    checked={fileFormat === 'srt'}
                    onChange={() => setFileFormat('srt')}
                  />
                  <span>SRT</span>
                  <div className="info-icon-container" title={t('download.srtInfo', 'Standard subtitle format with timestamps')}>
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="file-format"
                    value="json"
                    checked={fileFormat === 'json'}
                    onChange={() => setFileFormat('json')}
                  />
                  <span>JSON</span>
                  <div className="info-icon-container" title={t('download.jsonInfo', 'Structured data format for programmatic use')}>
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="file-format"
                    value="txt"
                    checked={fileFormat === 'txt'}
                    onChange={() => setFileFormat('txt')}
                  />
                  <span>TXT</span>
                  <div className="info-icon-container" title={t('download.txtInfo', 'Plain text format without timestamps')}>
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Process type options */}
          {processType && (
            <div className="option-group">
              <h4>{t('download.processType', 'Process Type')}</h4>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="process-type"
                    value="consolidate"
                    checked={processType === 'consolidate'}
                    onChange={() => setProcessType('consolidate')}
                  />
                  <span>{t('download.consolidate', 'Consolidate')}</span>
                  <div className="info-icon-container" title={t('download.consolidateInfo', 'Combine and improve the text content')}>
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="process-type"
                    value="summarize"
                    checked={processType === 'summarize'}
                    onChange={() => setProcessType('summarize')}
                  />
                  <span>{t('download.summarize', 'Summarize')}</span>
                  <div className="info-icon-container" title={t('download.summarizeInfo', 'Create a summary of the content')}>
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Model selection for processing */}
          {processType && (
            <div className="option-group">
              <h4>{t('download.model', 'Model')}</h4>
              <ModelDropdown
                onModelSelect={handleModelSelect}
                selectedModel={selectedModel}
                buttonClassName="modal-model-dropdown"
                headerText={t('download.selectModel', 'Select model for processing')}
              />
            </div>
          )}

          {/* Prompt editing for processing */}
          {processType && (
            <div className="option-group">
              <h4>{t('download.prompt', 'Prompt')}</h4>
              <button
                className="edit-prompt-button"
                onClick={() => setIsPromptEditorOpen(true)}
                title={t('promptEditor.editPromptTooltip', 'Edit Gemini prompt')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                {t('promptEditor.editPrompt', 'Edit Prompt')}
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
          {fileFormat ? (
            <button className="main-action-btn download-btn" onClick={handleDownload}>
              {t('download.download', 'Download')}
            </button>
          ) : (
            <button className="action-button process-button" onClick={handleProcess}>
              {processType === 'consolidate' ? t('download.consolidate', 'Consolidate') : t('download.summarize', 'Summarize')}
            </button>
          )}
        </div>

        <PromptEditor
          isOpen={isPromptEditorOpen}
          onClose={() => setIsPromptEditorOpen(false)}
          initialPrompt={
            processType === 'consolidate' 
              ? (customConsolidatePrompt || `Please consolidate and improve the following text. Make it more coherent, fix any grammatical errors, and ensure it flows naturally while preserving the original meaning and key information.

Text to consolidate:
{textContent}`)
              : (customSummarizePrompt || `Please provide a comprehensive summary of the following text. Include the main points, key information, and important details while maintaining clarity and accuracy.

Text to summarize:
{textContent}`)
          }
          onSave={handleSavePrompt}
          title={
            processType === 'consolidate' 
              ? t('promptEditor.editConsolidatePrompt', 'Edit Consolidate Prompt')
              : t('promptEditor.editSummarizePrompt', 'Edit Summarize Prompt')
          }
          description={
            processType === 'consolidate'
              ? t('promptEditor.customizeConsolidateDesc', 'Customize how Gemini consolidates your text.')
              : t('promptEditor.customizeSummarizeDesc', 'Customize how Gemini summarizes your text.')
          }
        />
      </div>
    </div>
  );
};

export default DownloadOptionsModal;
