import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PROMPT_PRESETS } from '../services/geminiService';
import '../styles/OnboardingModal.css';
import { FiAward, FiStar, FiCpu, FiCheckCircle, FiFlask } from 'react-icons/fi';
import { FaCrown, FaStar, FaTools, FaCheckCircle, FaFlask } from 'react-icons/fa';

// Mapping preset id to color class
const promptColorClass = {
  'general': 'prompt-color-general',
  'extract-text': 'prompt-color-extract',
  'combined-subtitles': 'prompt-color-combined',
  'focus-lyrics': 'prompt-color-lyrics',
  'describe-video': 'prompt-color-describe',
  'chaptering': 'prompt-color-chapter',
  'diarize-speakers': 'prompt-color-speakers',
};

const OnboardingModal = ({ onComplete }) => {
  const { t } = useTranslation();
  // step: 0 = intro, 1 = prompt, 2 = model
  const [step, setStep] = useState(0);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Tiếng Việt');
  const [canProceed, setCanProceed] = useState(false);
  // Popup state for prompt info
  const [showInfo, setShowInfo] = useState({ id: null, type: null }); // {id, type: 'purpose'|'prompt'}

  // Available Gemini models
  const models = [
    { id: 'gemini-2.5-pro', name: t('models.gemini25Pro', 'Gemini 2.5 Pro'), description: 'Độ chính xác cao nhất, tốc độ chậm, dễ quá tải' },
    { id: 'gemini-2.5-flash-preview-05-20', name: t('models.gemini25Flash', 'Gemini 2.5 Flash'), description: 'Độ chính xác cao, tốc độ nhanh, ít quá tải' },
    { id: 'gemini-2.5-flash-lite-preview-06-17', name: t('models.gemini25FlashLite', 'Gemini 2.5 Flash Lite'), description: 'Độ chính xác tốt, tốc độ rất nhanh, ổn định' },
    { id: 'gemini-2.0-flash', name: t('models.gemini20Flash', 'Gemini 2.0 Flash'), description: 'Độ chính xác khá, tốc độ cao, luôn sẵn sàng' },
    { id: 'gemini-2.0-flash-lite', name: t('models.gemini20FlashLite', 'Gemini 2.0 Flash Lite'), description: 'Độ chính xác trung bình, nhanh nhất, luôn sẵn sàng' }
  ];

  // Thêm trạng thái mặc định cho badge nếu chưa có API key
  const defaultModelStatus = {
    'gemini-2.5-pro': 'premium',
    'gemini-2.5-flash-preview-05-20': 'recommended',
    'gemini-2.5-flash-lite-preview-06-17': 'recommended',
    'gemini-2.0-flash': 'stable',
    'gemini-2.0-flash-lite': 'experimental'
  };
  // Giả lập trạng thái động từ API (ở đây vẫn dùng mặc định, bạn có thể thay bằng fetch API thực tế)
  const [modelStatus, setModelStatus] = useState(defaultModelStatus);
  useEffect(() => {
    const geminiApiKey = localStorage.getItem('gemini_api_key') || '';
    if (geminiApiKey) {
      // TODO: Gọi API thực tế để lấy trạng thái model
      setModelStatus({
        'gemini-2.5-pro': '',
        'gemini-2.5-flash-preview-05-20': 'premium',
        'gemini-2.5-flash-lite-preview-06-17': 'premium',
        'gemini-2.0-flash': 'recommended',
        'gemini-2.0-flash-lite': 'maintenance'
      });
    } else {
      setModelStatus(defaultModelStatus);
    }
  }, []);

  // Thêm cấu hình bảo trì cho từng model
  const maintenanceStatus = {
    'gemini-2.5-pro': false, // Đổi thành true để bật badge Đang bảo trì
    'gemini-2.5-flash-preview-05-20': false,
    'gemini-2.5-flash-lite-preview-06-17': false,
    'gemini-2.0-flash': false,
    'gemini-2.0-flash-lite': false
  };

  // Check if user can proceed to next step
  useEffect(() => {
    if (step === 1) {
      setCanProceed(!!selectedPresetId);
    } else if (step === 2) {
      setCanProceed(!!selectedModel);
    }
  }, [step, selectedPresetId, selectedModel]);

  // Handle preset selection
  const handlePresetSelect = (presetId) => {
    setSelectedPresetId(presetId);
  };

  // Handle model selection
  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
  };

  // Handle next step
  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Save selections to localStorage
      localStorage.setItem('selected_preset_id', selectedPresetId);
      localStorage.setItem('gemini_model', selectedModel);
      localStorage.setItem('onboarding_completed', 'true');
      // Notify parent component that onboarding is complete
      onComplete({
        presetId: selectedPresetId,
        model: selectedModel,
        targetLanguage: null
      });
    }
  };

  // Handle back button
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  // Get preset title based on ID
  const getPresetTitle = (presetId) => {
    const preset = PROMPT_PRESETS.find(p => p.id === presetId);
    if (!preset) return presetId;
    switch (preset.id) {
      case 'general':
        return t('settings.presetGeneralPurpose', 'General purpose');
      case 'extract-text':
        return t('settings.presetExtractText', 'Extract text');
      case 'focus-spoken-words':
        return t('settings.presetFocusSpokenWords', 'Focus on Spoken Words');
      case 'focus-lyrics':
        return t('settings.presetFocusLyrics', 'Focus on Lyrics');
      case 'describe-video':
        return t('settings.presetDescribeVideo', 'Describe video');
      case 'translate-directly':
        return t('settings.presetTranslateDirectly', 'Translate directly');
      case 'chaptering':
        return t('settings.presetChaptering', 'Chaptering');
      case 'diarize-speakers':
        return t('settings.presetIdentifySpeakers', 'Identify Speakers');
      default:
        return preset.title;
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <div className="onboarding-header-top">
            <h2>{t('onboarding.title', 'Welcome to Subtitles Generator')}</h2>
          </div>
          {step === 0 && (
            <p className="onboarding-subtitle">
              {t('onboarding.introSubtitle', 'Su-Translate giúp bạn tạo, chỉnh sửa, dịch và xuất phụ đề cho video một cách tự động và thông minh. Hỗ trợ nhiều loại video, nhiều ngôn ngữ, thao tác kéo thả dễ dàng, xuất file SRT, TXT, video có phụ đề...')}
            </p>
          )}
          {step === 1 && (
            <p className="onboarding-subtitle">
              {t('onboarding.promptSelectionSubtitle', 'First, let\'s select a prompt preset for your transcriptions')}
            </p>
          )}
          {step === 2 && (
            <p className="onboarding-subtitle">
              {t('onboarding.modelSelectionSubtitle', 'Now, let\'s select a Gemini model for your transcriptions')}
            </p>
          )}
        </div>

        <div className="onboarding-content">
          {step === 0 && (
            <div className="onboarding-intro-content">
              {/* Hero Section */}
              <div className="intro-hero">
                <div className="hero-badge">
                  <span className="badge-text">✨ AI-Powered</span>
                </div>
                <h3 className="hero-title">Trình tạo phụ đề thông minh</h3>
                <p className="hero-description">
                  Tạo, chỉnh sửa và dịch phụ đề cho video một cách tự động với công nghệ AI tiên tiến
                </p>
                <div className="hero-stats">
                  <div className="stat-item">
                    <span className="stat-number">50+</span>
                    <span className="stat-label">Ngôn ngữ</span>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item">
                    <span className="stat-number">99%</span>
                    <span className="stat-label">Độ chính xác</span>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item">
                    <span className="stat-number">5x</span>
                    <span className="stat-label">Nhanh hơn</span>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="intro-features-grid">
                <div className="feature-item">
                  <div className="feature-icon">🤖</div>
                  <div className="feature-content">
                    <h4>Tự động hóa hoàn toàn</h4>
                    <p>Tạo phụ đề tự động cho video/audio nhiều ngôn ngữ</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📝</div>
                  <div className="feature-content">
                    <h4>Chỉnh sửa & Xuất file</h4>
                    <p>Chỉnh sửa, dịch, xuất file SRT, TXT, video có phụ đề</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🖱️</div>
                  <div className="feature-content">
                    <h4>Thao tác trực quan</h4>
                    <p>Kéo thả, gộp, di chuyển phụ đề trực quan</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🎨</div>
                  <div className="feature-content">
                    <h4>Tùy chỉnh nâng cao</h4>
                    <p>Tùy chỉnh prompt, chọn mô hình AI, nhiều tính năng nâng cao</p>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="intro-cta">
                <div className="cta-text">
                  <span className="cta-emoji">🚀</span>
                  <span>Hãy cùng khám phá trải nghiệm phụ đề thông minh, vui nhộn và cực kỳ tiện lợi!</span>
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="onboarding-prompt-selection">
              <p className="onboarding-instruction">
                {t('onboarding.promptSelectionInstruction', 'Choose a preset that best fits your needs. You can always change this later in the settings.')}
              </p>
              <div className="onboarding-presets-grid">
                {PROMPT_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className={`onboarding-preset-card ${selectedPresetId === preset.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPresetId(preset.id)}
                  >
                    <h3 className={`preset-title only-color ${promptColorClass[preset.id] || ''}`}>{getPresetTitle(preset.id)}</h3>
                    <p className="preset-description">{preset.prompt.substring(0, 100)}...</p>
                    <div className="preset-actions">
                      <button
                        className="preset-info-btn settings-btn"
                        type="button"
                        onClick={e => { e.stopPropagation(); setShowInfo({ id: preset.id, type: 'purpose' }); }}
                      >
                        {t('onboarding.purposeBtn', 'Công dụng')}
                      </button>
                      <button
                        className="preset-prompt-btn settings-btn"
                        type="button"
                        onClick={e => { e.stopPropagation(); setShowInfo({ id: preset.id, type: 'prompt' }); }}
                      >
                        {t('onboarding.seePromptBtn', 'Xem prompt')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-model-selection">
              <p className="onboarding-instruction">
                {t('onboarding.modelSelectionInstruction', 'Choose a Gemini model. More accurate models may be slower. You can always change this later in the settings.')}
              </p>
              <div className="onboarding-models-grid">
                {models.map(model => {
                  let badge = null;
                  if (model.id === 'gemini-2.5-pro') {
                    badge = <span className="model-badge-premium"><FaCrown style={{marginRight:4}}/>Ưu tiên cao nhất</span>;
                  } else if (model.id === 'gemini-2.5-flash-preview-05-20') {
                    badge = <span className="model-badge-recommend"><FaStar style={{marginRight:4}}/>Khuyên dùng</span>;
                  } else if (model.id === 'gemini-2.5-flash-lite-preview-06-17') {
                    badge = <span className="model-badge-stable"><FaCheckCircle style={{marginRight:4}}/>Dùng ổn định</span>;
                  } else if (model.id === 'gemini-2.0-flash') {
                    badge = <span className="model-badge-stable"><FaCheckCircle style={{marginRight:4}}/>Dùng ổn định</span>;
                  } else if (model.id === 'gemini-2.0-flash-lite') {
                    badge = <span className="model-badge-experimental"><FaFlask style={{marginRight:4}}/>Dùng trải nghiệm</span>;
                  }
                  const maintenanceBadge = maintenanceStatus[model.id]
                    ? <span className="model-badge-maintenance"><FaTools style={{marginRight:4}}/>Đang bảo trì</span>
                    : null;
                  return (
                    <div
                      key={model.id}
                      className={`onboarding-model-card${selectedModel === model.id ? ' selected' : ''}`}
                      onClick={() => handleModelSelect(model.id)}
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
          )}
        </div>

        <div className="onboarding-footer">
          {step === 1 && (
            <button
              className="onboarding-back-btn"
              onClick={() => setStep(0)}
              style={{ marginRight: 8 }}
            >
              {t('onboarding.back', 'Quay lại')}
            </button>
          )}
          {step === 2 && (
            <button
              className="onboarding-back-btn"
              onClick={handleBack}
            >
              {t('onboarding.back', 'Quay lại')}
            </button>
          )}
          <button
            className="onboarding-next-btn"
            onClick={handleNext}
            disabled={step !== 0 && !canProceed}
          >
            {step === 0
              ? t('onboarding.getStarted', 'Bắt đầu')
              : step === 1
                ? t('onboarding.next', 'Next')
                : t('onboarding.finish', 'Finish')}
          </button>
        </div>
      </div>

      {/* Modal overlay cho công dụng/prompt */}
      {showInfo.id && (
        <div className="onboarding-modal-overlay-popup" onClick={() => setShowInfo({ id: null, type: null })}>
          <div className="onboarding-modal-popup" onClick={e => e.stopPropagation()}>
            <div className="onboarding-modal-popup-header">
              <span className={`preset-title only-color ${promptColorClass[showInfo.id] || ''}`}>{getPresetTitle(showInfo.id)}</span>
              <button className="close-popup-btn" onClick={() => setShowInfo({ id: null, type: null })}>×</button>
            </div>
            <div className="onboarding-modal-popup-content">
              {showInfo.type === 'purpose' ? (
                <>
                  <strong>{t('onboarding.purposeTitle', 'Công dụng')}:</strong>
                  <div style={{marginTop: 8}}>{PROMPT_PRESETS.find(p => p.id === showInfo.id)?.purposeVi || PROMPT_PRESETS.find(p => p.id === showInfo.id)?.purpose}</div>
                </>
              ) : (
                <>
                  <strong>{t('onboarding.promptTitle', 'Prompt mẫu')}:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.97em', margin: '8px 0', background: 'none', border: 'none' }}>{PROMPT_PRESETS.find(p => p.id === showInfo.id)?.prompt}</pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingModal;
