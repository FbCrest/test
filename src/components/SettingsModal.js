import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SettingsModal.css';
import { DEFAULT_TRANSCRIPTION_PROMPT, PROMPT_PRESETS, getUserPromptPresets, saveUserPromptPresets } from '../services/geminiService';
import { getAuthUrl, storeClientCredentials, getClientCredentials, hasValidTokens, clearOAuthData } from '../services/youtubeApiService';
import ModelDropdown from './ModelDropdown';
import CustomDropdown from './CustomDropdown';
import { FiStar, FiCpu, FiCheckCircle, FiSettings } from 'react-icons/fi';
import { FaCrown, FaCheckCircle, FaFlask, FaTools } from 'react-icons/fa';

// Tab icons
const ApiKeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

const ProcessingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="8" height="8" rx="2"/>
    <rect x="2" y="14" width="8" height="8" rx="2"/>
    <path d="M14 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/>
    <path d="M14 10v4"/>
    <path d="M12 12h4"/>
  </svg>
);

const CacheIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6A2 2 0 0 0 18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6Z"/>
    <path d="M8 4v4"/>
    <path d="M16 4v4"/>
    <path d="M4 10h16"/>
    <path d="M9 16l2 2 4-4"/>
  </svg>
);

const PromptIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M9 9h6"/>
    <path d="M9 13h6"/>
  </svg>
);

const AboutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const SettingsModal = ({ onClose, onSave, apiKeysSet, setApiKeysSet }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    // Load last active tab from localStorage or default to 'api-keys'
    return localStorage.getItem('settings_last_active_tab') || 'api-keys';
  });
  const [hasChanges, setHasChanges] = useState(false); // Track if any settings have changed
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [useOAuth, setUseOAuth] = useState(false);
  const [youtubeClientId, setYoutubeClientId] = useState('');
  const [youtubeClientSecret, setYoutubeClientSecret] = useState('');
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [loadingCacheInfo, setLoadingCacheInfo] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(3); // Default to 3 minutes
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash'); // Default model
  const [timeFormat, setTimeFormat] = useState('hms'); // Default to HH:MM:SS format
  const [showWaveform, setShowWaveform] = useState(true); // Default to showing waveform
  const [segmentOffsetCorrection, setSegmentOffsetCorrection] = useState(-3.0); // Default offset correction for second segment
  const [cacheDetails, setCacheDetails] = useState(null); // Store cache details
  const [cacheStatus, setCacheStatus] = useState({ message: '', type: '' }); // Status message for cache operations
  const [isUpdating, setIsUpdating] = useState(false); // State for update process
  const [updateStatus, setUpdateStatus] = useState({ message: '', type: '' }); // Status message for update process
  const [transcriptionPrompt, setTranscriptionPrompt] = useState(DEFAULT_TRANSCRIPTION_PROMPT); // Custom transcription prompt
  const [userPromptPresets, setUserPromptPresets] = useState([]); // User-created prompt presets
  const [showAddPresetForm, setShowAddPresetForm] = useState(false); // Toggle for add preset form
  const [newPresetTitle, setNewPresetTitle] = useState(''); // Title for new preset
  const [viewingPreset, setViewingPreset] = useState(null); // Currently viewing preset
  const [viewingPurpose, setViewingPurpose] = useState(null); // Currently viewing purpose in modal
  const [targetLanguage, setTargetLanguage] = useState(() => {
    return localStorage.getItem('translation_target_language') || '';
  }); // Target language for translation preset
  const textareaRef = useRef(null);

  // Danh sách các model Gemini cho tab Mô hình Gemini
  const geminiModels = [
    {
      id: 'gemini-2.5-pro',
      name: t('models.gemini25Pro', 'Gemini 2.5 Pro'),
      description: 'Độ chính xác cao nhất, context window lớn nhất',
    },
    {
      id: 'gemini-2.5-flash',
      name: t('models.gemini25Flash', 'Gemini 2.5 Flash'),
      description: 'Cân bằng tốt giữa tốc độ và chất lượng',
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: t('models.gemini25FlashLite', 'Gemini 2.5 Flash Lite'),
      description: 'Độ chính xác tốt, tốc độ rất nhanh, ổn định',
    },
    {
      id: 'gemini-2.0-flash-exp',
      name: t('models.gemini20FlashExp', 'Gemini 2.0 Flash'),
      description: 'Model thử nghiệm, tốc độ nhanh',
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: t('models.gemini20FlashLite', 'Gemini 2.0 Flash Lite'),
      description: 'Nhẹ nhất, nhanh nhất, tiết kiệm chi phí',
    },
    {
      id: 'gemini-1.5-pro',
      name: t('models.gemini15Pro', 'Gemini 1.5 Pro'),
      description: 'Ổn định, độ chính xác cao, phổ biến',
    },
    {
      id: 'gemini-1.5-flash',
      name: t('models.gemini15Flash', 'Gemini 1.5 Flash'),
      description: 'Ổn định, nhanh, luôn sẵn sàng',
    },
  ];

  // Thêm cấu hình bảo trì cho từng model
  const maintenanceStatus = {
    'gemini-2.5-pro': false,
    'gemini-2.5-flash': false,
    'gemini-2.5-flash-lite': false,
    'gemini-2.0-flash-exp': false,
    'gemini-2.0-flash-lite': false,
    'gemini-1.5-pro': false,
    'gemini-1.5-flash': false
  };

  // Save active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('settings_last_active_tab', activeTab);
  }, [activeTab]);

  // Store original settings for comparison
  const [originalSettings, setOriginalSettings] = useState({
    geminiApiKey: '',
    youtubeApiKey: '',
    segmentDuration: 3,
    geminiModel: 'gemini-2.0-flash',
    timeFormat: 'hms',
    showWaveform: true,
    segmentOffsetCorrection: -3.0,
    transcriptionPrompt: DEFAULT_TRANSCRIPTION_PROMPT,
    useOAuth: false,
    youtubeClientId: '',
    youtubeClientSecret: ''
  });

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = () => {
      const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
      const savedYoutubeKey = localStorage.getItem('youtube_api_key') || '';
      const savedSegmentDuration = parseInt(localStorage.getItem('segment_duration') || '3');
      const savedGeminiModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
      const savedTimeFormat = localStorage.getItem('time_format') || 'hms';
      const savedShowWaveform = localStorage.getItem('show_waveform') !== 'false'; // Default to true if not set
      const savedOffsetCorrection = parseFloat(localStorage.getItem('segment_offset_correction') || '-3.0');
      const savedTranscriptionPrompt = localStorage.getItem('transcription_prompt') || DEFAULT_TRANSCRIPTION_PROMPT;
      const savedUserPresets = getUserPromptPresets();
      const savedUseOAuth = localStorage.getItem('use_youtube_oauth') === 'true';
      const savedTargetLanguage = localStorage.getItem('translation_target_language') || '';
      const { clientId, clientSecret } = getClientCredentials();
      const authenticated = hasValidTokens();

      // Store original settings for comparison
      setOriginalSettings({
        geminiApiKey: savedGeminiKey,
        youtubeApiKey: savedYoutubeKey,
        segmentDuration: savedSegmentDuration,
        geminiModel: savedGeminiModel,
        timeFormat: savedTimeFormat,
        showWaveform: savedShowWaveform,
        segmentOffsetCorrection: savedOffsetCorrection,
        transcriptionPrompt: savedTranscriptionPrompt,
        useOAuth: savedUseOAuth,
        youtubeClientId: clientId,
        youtubeClientSecret: clientSecret
      });

      setGeminiApiKey(savedGeminiKey);
      setYoutubeApiKey(savedYoutubeKey);
      setSegmentDuration(savedSegmentDuration);
      setGeminiModel(savedGeminiModel);
      setTimeFormat(savedTimeFormat);
      setShowWaveform(savedShowWaveform);
      setSegmentOffsetCorrection(savedOffsetCorrection);
      setTranscriptionPrompt(savedTranscriptionPrompt);
      setUserPromptPresets(savedUserPresets);
      setUseOAuth(savedUseOAuth);
      setYoutubeClientId(clientId);
      setYoutubeClientSecret(clientSecret);
      setTargetLanguage(savedTargetLanguage);
      setIsAuthenticated(authenticated);
      setHasChanges(false); // Reset changes flag when loading settings
    };

    // Load settings initially
    loadSettings();

    // Check for OAuth success flag
    const oauthSuccess = localStorage.getItem('oauth_auth_success') === 'true';
    if (oauthSuccess) {
      // Refresh authentication status
      setIsAuthenticated(hasValidTokens());
    }

    // Set up event listener for storage changes
    const handleStorageChange = (event) => {
      if (event.key === 'youtube_oauth_token' || event.key === 'oauth_auth_success') {
        setIsAuthenticated(hasValidTokens());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Fetch cache information when component mounts
    fetchCacheInfo();

    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to fetch cache information
  const fetchCacheInfo = async () => {
    setLoadingCacheInfo(true);
    setCacheStatus({ message: '', type: '' }); // Reset status message

    try {
      const response = await fetch('http://localhost:3004/api/cache-info');
      const data = await response.json();

      if (data.success) {
        setCacheDetails(data.details);

        // If cache is empty, show a message
        if (data.details.totalCount === 0) {
          setCacheStatus({
            message: t('settings.cacheEmpty', 'Cache is empty. No files to clear.'),
            type: 'info'
          });
        }
      } else {
        throw new Error(data.error || 'Failed to fetch cache information');
      }
    } catch (error) {
      console.error('Error fetching cache info:', error);
      setCacheStatus({
        message: t('settings.cacheInfoError', 'Error fetching cache information: {{errorMessage}}', { errorMessage: error.message }),
        type: 'error'
      });
    } finally {
      setLoadingCacheInfo(false);
    }
  };

  // Handle selecting a preset
  const handleSelectPreset = (preset, customLanguage = '') => {
    // Save the selected preset ID
    localStorage.setItem('selected_preset_id', preset.id);
    
    // If it's the translation preset, replace the target language placeholder
    if (preset.id === 'translate-directly' && customLanguage) {
      // Replace 'TARGET_LANGUAGE' with the custom language in the prompt
      const updatedPrompt = preset.prompt.replace(/TARGET_LANGUAGE/g, customLanguage);
      setTranscriptionPrompt(updatedPrompt);
      // Save target language to localStorage
      localStorage.setItem('translation_target_language', customLanguage);
      // Save the updated prompt to localStorage
      localStorage.setItem('transcription_prompt', updatedPrompt);
    } else {
      setTranscriptionPrompt(preset.prompt);
      // Save the prompt to localStorage
      localStorage.setItem('transcription_prompt', preset.prompt);
    }
    
    // Dispatch event to notify other components about preset change
    window.dispatchEvent(new CustomEvent('preset-changed', { detail: { presetId: preset.id } }));
  };

  // Handle adding a new preset
  const handleAddPreset = () => {
    if (!newPresetTitle.trim()) {
      return; // Don't add empty title presets
    }

    const newPreset = {
      id: `user-${Date.now()}`,
      title: newPresetTitle,
      prompt: transcriptionPrompt
    };

    const updatedPresets = [...userPromptPresets, newPreset];
    setUserPromptPresets(updatedPresets);
    saveUserPromptPresets(updatedPresets);

    // Reset form
    setNewPresetTitle('');
    setShowAddPresetForm(false);
  };

  // Handle deleting a preset
  const handleDeletePreset = (presetId) => {
    const updatedPresets = userPromptPresets.filter(preset => preset.id !== presetId);
    setUserPromptPresets(updatedPresets);
    saveUserPromptPresets(updatedPresets);
  };

  // Handle YouTube OAuth authentication
  const handleOAuthAuthentication = () => {
    if (youtubeClientId && youtubeClientSecret) {
      // Store client credentials
      storeClientCredentials(youtubeClientId, youtubeClientSecret);

      // Get authorization URL
      const authUrl = getAuthUrl();
      if (authUrl) {
        // Set up message listener for OAuth success
        const messageListener = (event) => {
          if (event.origin === window.location.origin &&
              event.data && event.data.type === 'OAUTH_SUCCESS') {
            // Update authentication status
            setIsAuthenticated(hasValidTokens());
            // Remove the listener
            window.removeEventListener('message', messageListener);
          }
        };

        // Add the listener
        window.addEventListener('message', messageListener);

        // Open the authorization URL in a new window
        const authWindow = window.open(authUrl, 'youtube-oauth', 'width=800,height=600');

        // Check if popup was blocked
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          alert('Popup blocked! Please allow popups for this site and try again.');
          window.removeEventListener('message', messageListener);
        }
      } else {
        alert('Failed to generate authorization URL. Please check your client credentials.');
      }
    } else {
      alert('Please enter both Client ID and Client Secret.');
    }
  };

  // Handle clearing OAuth data
  const handleClearOAuth = () => {
    if (window.confirm('Are you sure you want to clear your YouTube OAuth credentials? You will need to authenticate again to use YouTube search.')) {
      clearOAuthData();
      setIsAuthenticated(false);
    }
  };

  // Handle app update (git pull)
  const handleUpdate = async () => {
    if (window.confirm(t('settings.confirmUpdate', 'Are you sure you want to update the application? This will pull the latest changes from the repository.'))) {
      setIsUpdating(true);
      setUpdateStatus({ message: t('settings.updating', 'Updating application...'), type: 'info' });

      try {
        const response = await fetch('http://localhost:3004/api/update', {
          method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
          setUpdateStatus({
            message: t('settings.updateSuccess', 'Application updated successfully! Please refresh the page to see the changes.'),
            type: 'success'
          });
        } else {
          throw new Error(data.error || 'Failed to update application');
        }
      } catch (error) {
        console.error('Error updating application:', error);
        setUpdateStatus({
          message: t('settings.updateError', 'Error updating application: {{errorMessage}}', { errorMessage: error.message }),
          type: 'error'
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Effect to check for changes in settings
  useEffect(() => {
    // Compare current settings with original settings
    const settingsChanged =
      geminiApiKey !== originalSettings.geminiApiKey ||
      youtubeApiKey !== originalSettings.youtubeApiKey ||
      segmentDuration !== originalSettings.segmentDuration ||
      geminiModel !== originalSettings.geminiModel ||
      timeFormat !== originalSettings.timeFormat ||
      showWaveform !== originalSettings.showWaveform ||
      segmentOffsetCorrection !== originalSettings.segmentOffsetCorrection ||
      transcriptionPrompt !== originalSettings.transcriptionPrompt ||
      useOAuth !== originalSettings.useOAuth ||
      youtubeClientId !== originalSettings.youtubeClientId ||
      youtubeClientSecret !== originalSettings.youtubeClientSecret;

    setHasChanges(settingsChanged);
  }, [geminiApiKey, youtubeApiKey, segmentDuration, geminiModel, timeFormat, showWaveform,
      segmentOffsetCorrection, transcriptionPrompt, useOAuth, youtubeClientId,
      youtubeClientSecret, originalSettings]);

  // Handle save button click
  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('segment_duration', segmentDuration.toString());
    localStorage.setItem('gemini_model', geminiModel);
    localStorage.setItem('time_format', timeFormat);
    localStorage.setItem('show_waveform', showWaveform.toString());
    localStorage.setItem('segment_offset_correction', segmentOffsetCorrection.toString());
    localStorage.setItem('transcription_prompt', transcriptionPrompt);
    localStorage.setItem('use_youtube_oauth', useOAuth.toString());

    // Store OAuth client credentials if they exist
    if (youtubeClientId && youtubeClientSecret) {
      storeClientCredentials(youtubeClientId, youtubeClientSecret);
    }

    // Notify parent component about API keys, segment duration, model, and time format
    onSave(geminiApiKey, youtubeApiKey, segmentDuration, geminiModel, timeFormat);

    // Update original settings to match current settings
    setOriginalSettings({
      geminiApiKey,
      youtubeApiKey,
      segmentDuration,
      geminiModel,
      timeFormat,
      showWaveform,
      segmentOffsetCorrection,
      transcriptionPrompt,
      useOAuth,
      youtubeClientId,
      youtubeClientSecret
    });

    // Reset changes flag
    setHasChanges(false);

    onClose();
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>{t('settings.title', 'Settings')}</h2>

          {/* Tab Navigation */}
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
              onClick={() => setActiveTab('api-keys')}
            >
              <ApiKeyIcon />
              {t('settings.apiKeys', 'API Keys')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'video-processing' ? 'active' : ''}`}
              onClick={() => setActiveTab('video-processing')}
            >
              <ProcessingIcon />
              {t('settings.videoProcessing', 'Video Processing')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'gemini-models' ? 'active' : ''}`}
              onClick={() => setActiveTab('gemini-models')}
            >
              <FaCrown style={{marginRight:4}}/>
              {t('settings.geminiModelsTab', 'Mô hình Gemini')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'prompts' ? 'active' : ''}`}
              onClick={() => setActiveTab('prompts')}
            >
              <PromptIcon />
              {t('settings.prompts', 'Prompts')}
            </button>
            <button
              className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <AboutIcon />
              {t('settings.about', 'About')}
            </button>
          </div>

          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-content">
          {/* API Keys Tab Content */}
          <div className={`settings-tab-content ${activeTab === 'api-keys' ? 'active' : ''}`}>
            <div className="settings-section api-key-section">
              <h3>{t('settings.apiKeys', 'API Keys')}</h3>

              <div className="api-key-input">
                <label htmlFor="gemini-api-key">
                  {t('settings.geminiApiKey', 'Gemini API Key')}
                  <span className={`api-key-status ${apiKeysSet.gemini ? 'set' : 'not-set'}`}>
                    {apiKeysSet.gemini
                      ? t('settings.keySet', 'Set')
                      : t('settings.keyNotSet', 'Not Set')}
                  </span>
                </label>

                <div className="input-with-toggle">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    id="gemini-api-key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder={t('settings.geminiApiKeyPlaceholder', 'Enter your Gemini API key')}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    aria-label={showGeminiKey ? t('settings.hide') : t('settings.show')}
                  >
                    {showGeminiKey ? t('settings.hide') : t('settings.show')}
                  </button>
                </div>

                <p className="api-key-help">
                  {t('settings.geminiApiKeyHelp', 'Required for all functions. Get one at')}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google AI Studio
                  </a>
                </p>
                <div className="api-key-instructions">
                  <h4>{t('settings.getApiKey', 'Get Gemini API Key')}</h4>
                  <ol>
                    <li>{t('settings.geminiStep1', 'Login to Google AI Studio')}</li>
                    <li>{t('settings.geminiStep2', 'Click \'Get API Key\'')}</li>
                    <li>{t('settings.geminiStep3', 'Create a new key or select existing')}</li>
                    <li>{t('settings.geminiStep4', 'Copy your API key')}</li>
                    <li>{t('settings.geminiStep5', 'Paste it into the field above')}</li>
                  </ol>
                </div>
            </div>

              <div className="api-key-input">
                <div className="auth-method-toggle">
                  <label className="auth-method-label">{t('settings.youtubeAuthMethod', 'YouTube Authentication Method')}</label>
                  <div className="auth-toggle-buttons">
                    <button
                      className={`auth-toggle-btn ${!useOAuth ? 'active' : ''}`}
                      onClick={() => {
                        setUseOAuth(false);
                        localStorage.setItem('use_youtube_oauth', 'false');
                        // [LOG_REMOVED] 'Set OAuth to false');
                        // Update apiKeysSet to reflect the API key method
                        setApiKeysSet(prevState => ({
                          ...prevState,
                          youtube: !!youtubeApiKey
                        }));
                      }}
                    >
                      {t('settings.apiKeyMethod', 'API Key')}
                    </button>
                    <button
                      className={`auth-toggle-btn ${useOAuth ? 'active' : ''}`}
                      onClick={() => {
                        setUseOAuth(true);
                        localStorage.setItem('use_youtube_oauth', 'true');
                        // [LOG_REMOVED] 'Set OAuth to true');
                        // Update apiKeysSet to reflect the OAuth method
                        setApiKeysSet(prevState => ({
                          ...prevState,
                          youtube: isAuthenticated
                        }));
                      }}
                    >
                      {t('settings.oauthMethod', 'OAuth 2.0')}
                    </button>
                  </div>
                </div>

                {!useOAuth ? (
                  <>
                    <label htmlFor="youtube-api-key">
                      {t('settings.youtubeApiKey', 'YouTube API Key')}
                      <span className={`api-key-status ${apiKeysSet.youtube ? 'set' : 'not-set'}`}>
                        {apiKeysSet.youtube
                          ? t('settings.keySet', 'Set')
                          : t('settings.keyNotSet', 'Not Set')}
                      </span>
                    </label>
                    <div className="input-with-toggle">
                      <input
                        type={showYoutubeKey ? "text" : "password"}
                        id="youtube-api-key"
                        value={youtubeApiKey}
                        onChange={(e) => setYoutubeApiKey(e.target.value)}
                        placeholder={t('settings.youtubeApiKeyPlaceholder', 'Enter your YouTube API key')}
                      />
                      <button
                        type="button"
                        className="toggle-visibility"
                        onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                        aria-label={showYoutubeKey ? t('settings.hide') : t('settings.show')}
                      >
                        {showYoutubeKey ? t('settings.hide') : t('settings.show')}
                      </button>
                    </div>
                    <p className="api-key-help">
                      {t('settings.youtubeApiKeyHelp', 'Required for YouTube search. Get one at')}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Cloud Console
                      </a>
                    </p>
                    <div className="api-key-instructions">
                      <h4>{t('settings.getYoutubeApiKey', 'Get YouTube API Key')}</h4>
                      <ol>
                        <li>{t('settings.youtubeStep1', 'Go to Google Cloud Console')}</li>
                        <li>{t('settings.youtubeStep2', 'Create or select a project')}</li>
                        <li>{t('settings.youtubeStep3', 'Enable \'YouTube Data API v3\'')}</li>
                        <li>{t('settings.youtubeStep4', 'Go to credentials')}</li>
                        <li>{t('settings.youtubeStep5', 'Generate API key')}</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="oauth-status-container">
                      <label>{t('settings.youtubeOAuth', 'YouTube OAuth 2.0')}</label>
                      <span className={`api-key-status ${isAuthenticated ? 'set' : 'not-set'}`}>
                        {isAuthenticated
                          ? t('settings.authenticated', 'Authenticated')
                          : t('settings.notAuthenticated', 'Not Authenticated')}
                      </span>
                    </div>

                    <div className="oauth-client-inputs">
                      <div className="oauth-input-group">
                        <label htmlFor="youtube-client-id">{t('settings.clientId', 'Client ID')}</label>
                        <div className="input-with-toggle">
                          <input
                            type={showClientId ? "text" : "password"}
                            id="youtube-client-id"
                            value={youtubeClientId}
                            onChange={(e) => setYoutubeClientId(e.target.value)}
                            placeholder={t('settings.clientIdPlaceholder', 'Enter your OAuth Client ID')}
                          />
                          <button
                            type="button"
                            className="toggle-visibility"
                            onClick={() => setShowClientId(!showClientId)}
                            aria-label={showClientId ? t('settings.hide') : t('settings.show')}
                          >
                            {showClientId ? t('settings.hide') : t('settings.show')}
                          </button>
                        </div>
                      </div>

                      <div className="oauth-input-group">
                        <label htmlFor="youtube-client-secret">{t('settings.clientSecret', 'Client Secret')}</label>
                        <div className="input-with-toggle">
                          <input
                            type={showClientSecret ? "text" : "password"}
                            id="youtube-client-secret"
                            value={youtubeClientSecret}
                            onChange={(e) => setYoutubeClientSecret(e.target.value)}
                            placeholder={t('settings.clientSecretPlaceholder', 'Enter your OAuth Client Secret')}
                          />
                          <button
                            type="button"
                            className="toggle-visibility"
                            onClick={() => setShowClientSecret(!showClientSecret)}
                            aria-label={showClientSecret ? t('settings.hide') : t('settings.show')}
                          >
                            {showClientSecret ? t('settings.hide') : t('settings.show')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="oauth-actions">
                      <button
                        className="oauth-authenticate-btn"
                        onClick={handleOAuthAuthentication}
                        disabled={!youtubeClientId || !youtubeClientSecret}
                      >
                        {t('settings.authenticateWithYouTube', 'Authenticate with YouTube')}
                      </button>
                      {isAuthenticated && (
                        <button
                          className="oauth-clear-btn"
                          onClick={handleClearOAuth}
                        >
                          {t('settings.clearAuth', 'Clear Authentication')}
                        </button>
                      )}
                    </div>

                    <p className="api-key-help">
                      {t('settings.oauthDescription', 'OAuth 2.0 provides more reliable access to YouTube API. Get credentials at')}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Cloud Console
                      </a>
                    </p>
                    <div className="api-key-instructions">
                      <h4>{t('settings.getOAuthCredentials', 'Get OAuth Credentials')}</h4>
                      <ol>
                        <li>{t('settings.createProject', 'Create a project in Google Cloud Console')}</li>
                        <li>{t('settings.enableYouTubeAPI', 'Enable the YouTube Data API v3')}</li>
                        <li>{t('settings.createOAuthClientId', 'Create OAuth 2.0 Client ID (Web application)')}</li>
                        <li>{t('settings.addAuthorizedOrigins', 'Add Authorized JavaScript origins:')}<br/>
                          <code>{window.location.origin}</code>
                        </li>
                        <li>{t('settings.addAuthorizedRedirect', 'Add Authorized redirect URI:')}<br/>
                          <code>{window.location.origin + '/oauth2callback.html'}</code>
                        </li>
                        <li>{t('settings.copyClientCredentials', 'Copy your Client ID and Client Secret')}</li>
                        <li>{t('settings.pasteAndAuthenticate', 'Paste them into the fields above and click Authenticate')}</li>
                      </ol>

                      <h4>{t('settings.troubleshootingOAuth', 'Troubleshooting OAuth Issues')}</h4>

                      <h5>{t('settings.errorRedirectMismatch', 'Error: redirect_uri_mismatch')}</h5>
                      <p>{t('settings.redirectMismatchDescription', 'This error occurs when the redirect URI in your application doesn\'t match what\'s registered in Google Cloud Console:')}</p>
                      <ol>
                        <li>{t('settings.goToCredentials', 'Go to Google Cloud Console > APIs & Services > Credentials')}</li>
                        <li>{t('settings.findOAuthClient', 'Find your OAuth 2.0 Client ID and click to edit')}</li>
                        <li>{t('settings.inAuthorizedOrigins', 'In "Authorized JavaScript origins", add exactly:')}<br/>
                          <code>{window.location.origin}</code>
                        </li>
                        <li>{t('settings.inAuthorizedRedirect', 'In "Authorized redirect URIs", add exactly:')}<br/>
                          <code>{window.location.origin + '/oauth2callback.html'}</code>
                        </li>
                        <li>{t('settings.clickSave', 'Click Save')}</li>
                      </ol>

                      <h5>{t('settings.errorAccessDenied', 'Error: access_denied')}</h5>
                      <p>{t('settings.accessDeniedDescription', 'This error can occur for several reasons:')}</p>
                      <ul>
                        <li>{t('settings.deniedPermission', 'You denied permission during the OAuth flow')}</li>
                        <li>{t('settings.apiNotEnabled', 'The YouTube Data API is not enabled for your project')}</li>
                        <li>{t('settings.apiRestrictions', 'There are API restrictions on your OAuth client')}</li>
                      </ul>
                      <p>{t('settings.toFix', 'To fix:')}</p>
                      <ol>
                        <li>{t('settings.goToLibrary', 'Go to Google Cloud Console > APIs & Services > Library')}</li>
                        <li>{t('settings.searchYouTubeAPI', 'Search for "YouTube Data API v3" and make sure it\'s enabled')}</li>
                        <li>{t('settings.checkRestrictions', 'Check your OAuth client for any API restrictions')}</li>
                      </ol>

                      <h5>{t('settings.errorAppNotVerified', 'Error: App not verified')}</h5>
                      <p>{t('settings.appNotVerifiedDescription', 'New OAuth applications start in "Testing" mode and can only be used by test users:')}</p>
                      <ol>
                        <li>{t('settings.goToConsentScreen', 'Go to Google Cloud Console > APIs & Services > OAuth consent screen')}</li>
                        <li>{t('settings.scrollToTestUsers', 'Scroll down to "Test users" section')}</li>
                        <li>{t('settings.clickAddUsers', 'Click "Add users"')}</li>
                        <li>{t('settings.addYourEmail', 'Add your Google email address as a test user')}</li>
                        <li>{t('settings.saveChanges', 'Save changes and try again')}</li>
                      </ol>
                      <p className="note">{t('settings.verificationNote', 'Note: You don\'t need to wait for verification if you add yourself as a test user. Verification is only required if you want to make your app available to all users.')}</p>
                    </div>
                  </>
                )}
              </div>
          </div>
          </div>

          {/* Video Processing Tab Content */}
          <div className={`settings-tab-content ${activeTab === 'video-processing' ? 'active' : ''}`}>
            <div className="settings-section video-processing-section">
              <h3>{t('settings.videoProcessing', 'Video Processing')}</h3>
              <div className="segment-duration-setting">
                <label htmlFor="segment-duration">
                  {t('settings.segmentDuration', 'Segment Duration (minutes)')}
                </label>
                <p className="setting-description">
                  {t('settings.segmentDurationDescription', 'Choose how long each video segment should be when processing long videos. Shorter segments process faster but may be less accurate.')}
                </p>
                <CustomDropdown
                  value={segmentDuration}
                  onChange={(value) => setSegmentDuration(parseInt(value))}
                  options={[
                    { value: 1, label: `1 ${t('settings.minutes', 'minutes')}` },
                    { value: 2, label: `2 ${t('settings.minutes', 'minutes')}` },
                    { value: 3, label: `3 ${t('settings.minutes', 'minutes')}` },
                    { value: 5, label: `5 ${t('settings.minutes', 'minutes')}` },
                    { value: 10, label: `10 ${t('settings.minutes', 'minutes')}` },
                    { value: 15, label: `15 ${t('settings.minutes', 'minutes')}` },
                    { value: 20, label: `20 ${t('settings.minutes', 'minutes')}` },
                    { value: 30, label: `30 ${t('settings.minutes', 'minutes')}` },
                    { value: 45, label: `45 ${t('settings.minutes', 'minutes')}` }
                  ]}
                  className="segment-duration-select"
                />
              </div>

              <div className="time-format-setting">
                <label htmlFor="time-format">
                  {t('settings.timeFormat', 'Time Format')}
                </label>
                <p className="setting-description">
                  {t('settings.timeFormatDescription', 'Choose how time is displayed in the timeline and lyrics.')}
                </p>
                <CustomDropdown
                  value={timeFormat}
                  onChange={(value) => setTimeFormat(value)}
                  options={[
                    { value: 'seconds', label: t('settings.timeFormatSeconds', 'Seconds (e.g., 75.40s)') },
                    { value: 'hms', label: t('settings.timeFormatHMS', 'HH:MM:SS (e.g., 1:15.40)') }
                  ]}
                  className="time-format-select"
                />
              </div>

              <div className="waveform-setting">
                <label htmlFor="show-waveform">
                  {t('settings.showWaveform', 'Show Audio Waveform')}
                </label>
                <p className="setting-description">
                  {t('settings.showWaveformDescription', 'Display audio waveform visualization in the timeline. This helps identify silent parts and speech patterns.')}
                </p>
                <div className="toggle-switch-container">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="show-waveform"
                      checked={showWaveform}
                      onChange={(e) => setShowWaveform(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-label">{showWaveform ? t('common.on', 'On') : t('common.off', 'Off')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gemini Models Tab Content */}
          <div className={`settings-tab-content ${activeTab === 'gemini-models' ? 'active' : ''}`}>
            <div className="settings-section gemini-models-section">
              <h3>{t('settings.geminiModelsTab', 'Mô hình Gemini')}</h3>
              <p className="setting-description">
                {t('settings.geminiModelDescription', 'Chọn mô hình Gemini để sử dụng cho việc phiên âm. Các mô hình khác nhau cung cấp sự cân bằng giữa độ chính xác và tốc độ.')}
                {!geminiApiKey && ' ' + t('settings.modelStatusDefaultNotice', 'Trạng thái model hiện tại là mặc định. Hãy nhập API key để cập nhật trạng thái mới nhất.')}
              </p>
              <div className="onboarding-models-grid">
                {geminiModels.map(model => {
                  let badge = null;
                  if (model.id === 'gemini-2.5-pro') {
                    badge = <span className="model-badge-premium"><FaCrown style={{marginRight:4}}/>Ưu tiên cao nhất</span>;
                  } else if (model.id === 'gemini-2.5-flash') {
                    badge = <span className="model-badge-recommend"><FiStar style={{marginRight:4}}/>Khuyên dùng</span>;
                  } else if (model.id === 'gemini-2.5-flash-lite') {
                    badge = <span className="model-badge-stable"><FaCheckCircle style={{marginRight:4}}/>Dùng ổn định</span>;
                  } else if (model.id === 'gemini-2.0-flash-exp') {
                    badge = <span className="model-badge-stable"><FaCheckCircle style={{marginRight:4}}/>Dùng ổn định</span>;
                  } else if (model.id === 'gemini-2.0-flash-lite') {
                    badge = <span className="model-badge-experimental"><FaFlask style={{marginRight:4}}/>Dùng trải nghiệm</span>;
                  } else if (model.id === 'gemini-1.5-pro') {
                    badge = <span className="model-badge-stable"><FaCheckCircle style={{marginRight:4}}/>Ổn định</span>;
                  } else if (model.id === 'gemini-1.5-flash') {
                    badge = <span className="model-badge-stable"><FaCheckCircle style={{marginRight:4}}/>Ổn định</span>;
                  }
                  const maintenanceBadge = maintenanceStatus[model.id]
                    ? <span className="model-badge-maintenance"><FaTools style={{marginRight:4}}/>Đang bảo trì</span>
                    : null;
                  return (
                    <div
                      key={model.id}
                      className={`onboarding-model-card${geminiModel === model.id ? ' selected' : ''}`}
                      onClick={() => {
                        setGeminiModel(model.id);
                        localStorage.setItem('gemini_model', model.id);
                        setHasChanges(true);
                      }}
                      style={{cursor:'pointer'}}
                    >
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <h3>{model.name}</h3>
                        {badge}
                        {maintenanceBadge}
                      </div>
                      <p className="model-description">{model.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prompts Tab Content */}
          <div className={`settings-tab-content ${activeTab === 'prompts' ? 'active' : ''}`}>
            <div className="settings-section prompts-section">
              <h3>{t('settings.prompts', 'Prompts')}</h3>

              {/* Prompt Presets */}
              <div className="prompt-presets-section">
                <h4>{t('settings.promptPresets', 'Prompt Presets')}</h4>
                <p className="setting-description">
                  {t('settings.promptPresetsDescription', 'Select a preset to quickly use common prompt types. You can also create your own presets.')}
                </p>

                <div className="prompt-presets-container">
                  {/* Built-in presets */}
                  {PROMPT_PRESETS.map(preset => (
                    preset.id === 'translate-directly' ? null : (
                    <div className="prompt-preset-card" key={preset.id}>
                      <div className="preset-card-content">
                        <h5 className="preset-title" style={{
                          color: preset.id === 'general' ? '#2196F3' :
                                 preset.id === 'extract-text' ? '#4CAF50' :
                                 preset.id === 'combined-subtitles' ? '#ed1c24' :
                                 preset.id === 'focus-lyrics' ? '#FF9800' :
                                 preset.id === 'describe-video' ? '#9C27B0' :
                                 preset.id === 'chaptering' ? '#F06EAA' :
                                 preset.id === 'diarize-speakers' ? '#FFF799' : '#FF6B6B'
                        }}>
                          {preset.id === 'general' && t('settings.presetGeneralPurpose', 'General purpose') ||
                           preset.id === 'extract-text' && t('settings.presetExtractText', 'Extract text') ||
                           preset.id === 'combined-subtitles' && t('settings.presetCombinedSubtitles', 'Combined Subtitles') ||
                           preset.id === 'focus-spoken-words' && t('settings.presetFocusSpokenWords', 'Focus on Spoken Words') ||
                           preset.id === 'focus-lyrics' && t('settings.presetFocusLyrics', 'Focus on Lyrics') ||
                           preset.id === 'describe-video' && t('settings.presetDescribeVideo', 'Describe video') ||
                           preset.id === 'chaptering' && t('settings.presetChaptering', 'Chaptering') ||
                           preset.id === 'diarize-speakers' && t('settings.presetIdentifySpeakers', 'Identify Speakers') ||
                           preset.title}
                        </h5>
                        <p className="preset-preview">{preset.prompt.substring(0, 60)}...</p>
                      </div>
                      <div className="preset-card-actions">
                        <button
                          className="purpose-preset-btn"
                          onClick={() => setViewingPurpose(preset)}
                        >
                          {t('settings.purposePreset', 'Công dụng')}
                        </button>
                        <button
                          className="view-preset-btn"
                          onClick={() => setViewingPreset(preset)}
                        >
                          {t('settings.viewPreset', 'Xem prompt')}
                        </button>
                        <button
                          className="use-preset-btn"
                          onClick={() => handleSelectPreset(preset)}
                        >
                          {t('settings.usePreset', 'Sử dụng')}
                        </button>
                      </div>
                    </div>
                    )
                  ))}

                  {/* User presets */}
                  {userPromptPresets.map(preset => (
                    <div className="prompt-preset-card user-preset" key={preset.id}>
                      <div className="preset-card-content">
                        <h5 className="preset-title" style={{ color: '#FF6B6B' }}>{preset.title}</h5>
                        <p className="preset-preview">{preset.prompt.substring(0, 60)}...</p>
                      </div>
                      <div className="preset-card-actions">
                        <button
                          className="purpose-preset-btn"
                          onClick={() => setViewingPurpose(preset)}
                        >
                          {t('settings.purposePreset', 'Công dụng')}
                        </button>
                        <button
                          className="view-preset-btn"
                          onClick={() => setViewingPreset(preset)}
                        >
                          {t('settings.viewPreset', 'Xem prompt')}
                        </button>
                        <button
                          className="use-preset-btn"
                          onClick={() => handleSelectPreset(preset.prompt)}
                        >
                          {t('settings.usePreset', 'Sử dụng')}
                        </button>
                        <button
                          className="delete-preset-btn"
                          onClick={() => handleDeletePreset(preset.id)}
                        >
                          {t('settings.deletePreset', 'Xóa')}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add new preset card */}
                  {!showAddPresetForm ? (
                    <div
                      className="add-preset-card"
                      onClick={() => setShowAddPresetForm(true)}
                    >
                      <div className="add-preset-icon">+</div>
                      <p>{t('settings.addPreset', 'Add New Preset')}</p>
                    </div>
                  ) : (
                    <div className="new-preset-form">
                      <input
                        type="text"
                        value={newPresetTitle}
                        onChange={(e) => setNewPresetTitle(e.target.value)}
                        placeholder={t('settings.presetTitlePlaceholder', 'Preset title')}
                        className="preset-title-input"
                      />
                      <div className="new-preset-actions">
                        <button
                          className="cancel-preset-btn"
                          onClick={() => {
                            setShowAddPresetForm(false);
                            setNewPresetTitle('');
                          }}
                        >
                          {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                          className="save-preset-btn"
                          onClick={handleAddPreset}
                          disabled={!newPresetTitle.trim()}
                        >
                          {t('common.save', 'Save')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Prompt Editor */}
              <div className="transcription-prompt-setting">
                <label htmlFor="transcription-prompt">
                  {t('settings.transcriptionPrompt', 'Transcription Prompt')}
                </label>
                <p className="setting-description">
                  {t('settings.transcriptionPromptDescription', 'Customize the prompt sent to Gemini for transcription. The {contentType} placeholder (shown as a floating icon) will be replaced with "video" or "audio" depending on the input type. This placeholder cannot be removed and is required for the transcription to work properly.')}
                </p>
                <div className="prompt-editor-container">
                  <textarea
                    id="transcription-prompt"
                    ref={textareaRef}
                    value={transcriptionPrompt}
                    onKeyDown={(e) => {
                      // Prevent deletion of {contentType} with Delete or Backspace keys
                      const contentTypePos = transcriptionPrompt.indexOf('{contentType}');
                      if (contentTypePos !== -1) {
                        const cursorPos = e.target.selectionStart;
                        const selectionEnd = e.target.selectionEnd;
                        const hasSelection = cursorPos !== selectionEnd;

                        // Check if selection includes the placeholder
                        const selectionIncludesPlaceholder =
                          hasSelection &&
                          cursorPos <= contentTypePos + '{contentType}'.length &&
                          selectionEnd >= contentTypePos;

                        // Check if cursor is at the start or end of placeholder
                        const cursorAtPlaceholderStart = cursorPos === contentTypePos && e.key === 'Delete';
                        const cursorAtPlaceholderEnd = cursorPos === contentTypePos + '{contentType}'.length && e.key === 'Backspace';

                        // Check if cursor is inside placeholder
                        const cursorInsidePlaceholder =
                          cursorPos > contentTypePos &&
                          cursorPos < contentTypePos + '{contentType}'.length &&
                          (e.key === 'Delete' || e.key === 'Backspace');

                        // Prevent cut/delete operations on the placeholder
                        if ((selectionIncludesPlaceholder || cursorAtPlaceholderStart || cursorAtPlaceholderEnd || cursorInsidePlaceholder) &&
                            (e.key === 'Delete' || e.key === 'Backspace' || (e.key === 'x' && e.ctrlKey) || (e.key === 'X' && e.ctrlKey))) {
                          e.preventDefault();
                        }
                      }
                    }}
                    onCut={(e) => {
                      // Prevent cutting the placeholder
                      const contentTypePos = transcriptionPrompt.indexOf('{contentType}');
                      if (contentTypePos !== -1) {
                        const cursorPos = e.target.selectionStart;
                        const selectionEnd = e.target.selectionEnd;

                        // Check if selection includes the placeholder
                        if (cursorPos <= contentTypePos + '{contentType}'.length && selectionEnd >= contentTypePos) {
                          e.preventDefault();
                        }
                      }
                    }}
                    onPaste={(e) => {
                      // Handle paste to ensure placeholder is preserved
                      const contentTypePos = transcriptionPrompt.indexOf('{contentType}');
                      if (contentTypePos !== -1) {
                        const cursorPos = e.target.selectionStart;
                        const selectionEnd = e.target.selectionEnd;

                        // Check if selection includes the placeholder
                        if (cursorPos <= contentTypePos + '{contentType}'.length && selectionEnd >= contentTypePos) {
                          e.preventDefault();

                          // Get pasted text
                          const pastedText = e.clipboardData.getData('text');

                          // Create new text with placeholder preserved
                          const newText =
                            transcriptionPrompt.substring(0, cursorPos) +
                            pastedText +
                            transcriptionPrompt.substring(selectionEnd);

                          // If the new text doesn't include the placeholder, add it back
                          if (!newText.includes('{contentType}')) {
                            // Add placeholder at cursor position after paste
                            const updatedText =
                              transcriptionPrompt.substring(0, cursorPos) +
                              pastedText +
                              '{contentType}' +
                              transcriptionPrompt.substring(selectionEnd);

                            setTranscriptionPrompt(updatedText);

                            // Set cursor position after the pasted text
                            setTimeout(() => {
                              const newPos = cursorPos + pastedText.length + '{contentType}'.length;
                              e.target.selectionStart = newPos;
                              e.target.selectionEnd = newPos;
                            }, 0);
                          } else {
                            // Placeholder is still in the text, just update normally
                            setTranscriptionPrompt(newText);

                            // Set cursor position after the pasted text
                            setTimeout(() => {
                              const newPos = cursorPos + pastedText.length;
                              e.target.selectionStart = newPos;
                              e.target.selectionEnd = newPos;
                            }, 0);
                          }
                        }
                      }
                    }}
                    onChange={(e) => {
                      // Get current and new values
                      const currentValue = transcriptionPrompt;
                      const newValue = e.target.value;
                      const cursorPos = e.target.selectionStart;

                      // Check if {contentType} was removed
                      if (!newValue.includes('{contentType}')) {
                        // Find where {contentType} was in the original text
                        const contentTypePos = currentValue.indexOf('{contentType}');

                        if (contentTypePos !== -1) {
                          // Determine if user is trying to delete the placeholder
                          const isDeleteAttempt =
                            // Check if cursor is at or near the placeholder position
                            (cursorPos >= contentTypePos && cursorPos <= contentTypePos + '{contentType}'.length) ||
                            // Or if text before and after the placeholder matches the new value
                            (currentValue.substring(0, contentTypePos) +
                             currentValue.substring(contentTypePos + '{contentType}'.length) === newValue);

                          if (isDeleteAttempt) {
                            // Prevent deletion by keeping the original value
                            e.target.value = currentValue;
                            // Restore cursor position
                            setTimeout(() => {
                              e.target.selectionStart = cursorPos;
                              e.target.selectionEnd = cursorPos;
                            }, 0);
                            return; // Exit without updating state
                          } else {
                            // If it wasn't a direct deletion attempt, add it back at cursor position
                            const restoredValue = newValue.substring(0, cursorPos) +
                                                '{contentType}' +
                                                newValue.substring(cursorPos);
                            setTranscriptionPrompt(restoredValue);
                            // Position cursor after the placeholder
                            setTimeout(() => {
                              const newPos = cursorPos + '{contentType}'.length;
                              e.target.selectionStart = newPos;
                              e.target.selectionEnd = newPos;
                            }, 0);
                            return;
                          }
                        }
                      }

                      // If we get here, the placeholder is still in the text or was handled above
                      setTranscriptionPrompt(newValue);
                    }}
                    rows={8}
                    className="transcription-prompt-textarea"
                  />
                </div>
                <div className="prompt-actions">
                  <button
                    className="reset-prompt-btn"
                    onClick={() => setTranscriptionPrompt(DEFAULT_TRANSCRIPTION_PROMPT)}
                  >
                    {t('settings.resetPrompt', 'Reset to Default')}
                  </button>
                  {!showAddPresetForm && (
                    <button
                      className="save-as-preset-btn"
                      onClick={() => setShowAddPresetForm(true)}
                    >
                      {t('settings.saveAsPreset', 'Save as Preset')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* About Tab Content */}
          <div className={`settings-tab-content ${activeTab === 'about' ? 'active' : ''}`}>
            <div className="settings-section about-section">
              <div className="about-content">
                {/* Hero Section */}
                <div className="about-hero">
                  <h1 className="app-title">One-click Subtitles Generator</h1>
                  <p className="app-tagline">Tạo phụ đề video chỉ với một cú nhấp chuột</p>
                  <p className="version-info">Phiên bản {new Date().toISOString().slice(0, 10).replace(/-/g, '')}</p>
                </div>

                {/* Features Grid */}
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="feature-icon">
                      <FiCheckCircle />
                    </div>
                    <h3>Tự động hóa hoàn toàn</h3>
                    <p>Tạo phụ đề tự động từ video chỉ với một cú nhấp chuột</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">
                      <FiCpu />
                    </div>
                    <h3>AI Gemini mạnh mẽ</h3>
                    <p>Sử dụng công nghệ AI tiên tiến của Google Gemini</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">
                      <FiStar />
                    </div>
                    <h3>Chất lượng cao</h3>
                    <p>Độ chính xác cao với nhiều tùy chọn tối ưu hóa</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">
                      <FaFlask />
                    </div>
                    <h3>Dễ sử dụng</h3>
                    <p>Giao diện thân thiện, không cần kiến thức kỹ thuật</p>
                  </div>
                </div>

                {/* Tech Stack */}
                <div className="tech-section">
                  <h3>Công nghệ sử dụng</h3>
                  <div className="tech-badges">
                    <span className="tech-badge react">React</span>
                    <span className="tech-badge gemini">Google Gemini AI</span>
                    <span className="tech-badge youtube">YouTube API</span>
                    <span className="tech-badge ffmpeg">FFmpeg</span>
                    <span className="tech-badge nodejs">Node.js</span>
                  </div>
                </div>

                {/* Developer Info */}
                <div className="developer-section">
                  <div className="developer-card">
                    <div className="developer-avatar">
                      <span>S</span>
                    </div>
                    <div className="developer-info">
                      <h3>Sú</h3>
                      <p className="developer-title">Nhà phát triển</p>
                      <div className="developer-links">
                        <a href="http://meodibui.pages.dev/" target="_blank" rel="noopener noreferrer" className="dev-link website">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          Website
                        </a>
                        <a href="mailto:0rion24kk@gmail.com" className="dev-link email">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Email
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="app-description">
                  <p>One-click Subtitles Generator là công cụ giúp bạn tạo, chỉnh sửa và dịch phụ đề cho video một cách nhanh chóng và chính xác. Với sự hỗ trợ của AI Gemini, bạn có thể tạo phụ đề chất lượng cao chỉ với một cú nhấp chuột.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Viewing Modal */}
        {viewingPreset && (
          <div className="preset-view-modal">
            <div className="preset-view-content">
              <div className="preset-view-header">
                <h3>
                  {viewingPreset.id === 'general' && t('settings.presetGeneralPurpose', 'General purpose') ||
                   viewingPreset.id === 'extract-text' && t('settings.presetExtractText', 'Extract text') ||
                   viewingPreset.id === 'focus-spoken-words' && t('settings.presetFocusSpokenWords', 'Focus on Spoken Words') ||
                   viewingPreset.id === 'focus-lyrics' && t('settings.presetFocusLyrics', 'Focus on Lyrics') ||
                   viewingPreset.id === 'describe-video' && t('settings.presetDescribeVideo', 'Describe video') ||
                   viewingPreset.id === 'chaptering' && t('settings.presetChaptering', 'Chaptering') ||
                   viewingPreset.id === 'diarize-speakers' && t('settings.presetIdentifySpeakers', 'Identify Speakers') ||
                   viewingPreset.title}
                </h3>
                <button
                  className="close-preset-view-btn"
                  onClick={() => setViewingPreset(null)}
                >
                  &times;
                </button>
              </div>
              <div className="preset-view-body">
                <pre className="preset-full-text">
                  {viewingPreset.id === 'translate-directly' && targetLanguage.trim()
                    ? viewingPreset.prompt.replace(/TARGET_LANGUAGE/g, targetLanguage)
                    : viewingPreset.prompt}
                </pre>
              </div>
              <div className="preset-view-footer">
                {viewingPreset.id === 'translate-directly' ? (
                  <div className="translation-language-input-modal">
                    <input
                      type="text"
                      placeholder={t('translation.languagePlaceholder', 'Enter target language')}
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="target-language-input"
                    />
                    <button
                      className="use-preset-btn"
                      onClick={() => {
                        handleSelectPreset(viewingPreset, targetLanguage);
                        setViewingPreset(null);
                      }}
                      disabled={!targetLanguage.trim()}
                      title={!targetLanguage.trim() ? t('translation.languageRequired', 'Please enter a target language') : ''}
                    >
                      {t('settings.usePreset', 'Use')}
                    </button>
                  </div>
                ) : (
                  <button
                    className="use-preset-btn"
                    onClick={() => {
                      handleSelectPreset(viewingPreset);
                      setViewingPreset(null);
                    }}
                  >
                    {t('settings.usePreset', 'Use')}
                  </button>
                )}
                <button
                  className="close-btn-secondary"
                  onClick={() => setViewingPreset(null)}
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purpose Modal */}
        {viewingPurpose && (
          <div className="purpose-modal-overlay" onClick={() => setViewingPurpose(null)}>
            <div className="purpose-modal" onClick={(e) => e.stopPropagation()}>
              <div className="purpose-modal-header">
                <h3 style={{
                  color: viewingPurpose.id === 'general' ? '#2196F3' :
                         viewingPurpose.id === 'extract-text' ? '#4CAF50' :
                         viewingPurpose.id === 'combined-subtitles' ? '#ed1c24' :
                         viewingPurpose.id === 'focus-lyrics' ? '#FF9800' :
                         viewingPurpose.id === 'describe-video' ? '#9C27B0' :
                         viewingPurpose.id === 'chaptering' ? '#F06EAA' :
                         viewingPurpose.id === 'diarize-speakers' ? '#FFF799' : '#FF6B6B'
                }}>
                  {viewingPurpose.id === 'general' && t('settings.presetGeneralPurpose', 'General purpose') ||
                   viewingPurpose.id === 'extract-text' && t('settings.presetExtractText', 'Extract text') ||
                   viewingPurpose.id === 'combined-subtitles' && t('settings.presetCombinedSubtitles', 'Combined Subtitles') ||
                   viewingPurpose.id === 'focus-spoken-words' && t('settings.presetFocusSpokenWords', 'Focus on Spoken Words') ||
                   viewingPurpose.id === 'focus-lyrics' && t('settings.presetFocusLyrics', 'Focus on Lyrics') ||
                   viewingPurpose.id === 'describe-video' && t('settings.presetDescribeVideo', 'Describe video') ||
                   viewingPurpose.id === 'chaptering' && t('settings.presetChaptering', 'Chaptering') ||
                   viewingPurpose.id === 'diarize-speakers' && t('settings.presetIdentifySpeakers', 'Identify Speakers') ||
                   viewingPurpose.title}
                </h3>
                <button
                  className="close-purpose-modal-btn"
                  onClick={() => setViewingPurpose(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="purpose-modal-content">
                <div className="purpose-description">
                  <h4>{t('settings.purposePreset', 'Công dụng')}</h4>
                  <p>
                    {i18n.language === 'vi' ? 
                      (viewingPurpose.id === 'general' ? t('settings.purposeGeneralPurpose') :
                       viewingPurpose.id === 'extract-text' ? t('settings.purposeExtractText') :
                       viewingPurpose.id === 'combined-subtitles' ? t('settings.purposeCombinedSubtitles') :
                       viewingPurpose.id === 'focus-lyrics' ? t('settings.purposeFocusLyrics') :
                       viewingPurpose.id === 'describe-video' ? t('settings.purposeDescribeVideo') :
                       viewingPurpose.id === 'chaptering' ? t('settings.purposeChaptering') :
                       viewingPurpose.id === 'diarize-speakers' ? t('settings.purposeIdentifySpeakers') :
                       t('settings.purposeUserPreset')) :
                      viewingPurpose.purpose
                    }
                  </p>
                </div>
                <div className="purpose-actions">
                  <button
                    className="close-purpose-btn"
                    onClick={() => setViewingPurpose(null)}
                  >
                    {t('common.close', 'Đóng')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="settings-footer">
          <div className="settings-footer-left">
          </div>
          <div className="settings-footer-right">
            <button className="cancel-btn" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={!hasChanges}
              title={!hasChanges ? t('settings.noChanges', 'No changes to save') : t('settings.saveChanges', 'Save changes')}
            >
              {t('common.save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;