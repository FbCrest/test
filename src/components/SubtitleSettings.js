import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SubtitleSettings.css';
import CustomSelect from './inputs/CustomSelect';
import CustomCheckbox from './inputs/CustomCheckbox';

const SubtitleSettings = ({
  settings,
  onSettingsChange,
  onDownloadWithSubtitles,
  onDownloadWithTranslatedSubtitles,
  hasTranslation,
  translatedSubtitles,
  targetLanguage,
  isHidden = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(() => {
    // Load isOpen state from localStorage
    const savedIsOpen = localStorage.getItem('subtitle_settings_panel_open');
    return savedIsOpen === 'true';
  });

  // State for transparent background toggle
  const [isTransparent, setIsTransparent] = useState(() => {
    // Load transparency state from localStorage
    const savedTransparency = localStorage.getItem('subtitle_settings_panel_transparent');
    return savedTransparency === 'true';
  });

  // Save isOpen state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('subtitle_settings_panel_open', isOpen.toString());
  }, [isOpen]);

  // Save transparency state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('subtitle_settings_panel_transparent', isTransparent.toString());
  }, [isTransparent]);

  const handleSettingChange = (setting, value) => {
    const updatedSettings = {
      ...settings,
      [setting]: value
    };

    // Save to localStorage
    localStorage.setItem('subtitle_settings', JSON.stringify(updatedSettings));

    // Update state via parent component
    onSettingsChange(updatedSettings);
  };

  const fontOptions = [
    // Việt hóa/Việt Nam ưu tiên
    { value: "'Be Vietnam Pro', sans-serif", label: 'Be Vietnam Pro', group: t('subtitleSettings.fontGroupVietnamese', 'Việt hóa'), vietnameseSupport: true },
    { value: "'Noto Sans Vietnamese', sans-serif", label: 'Noto Sans Vietnamese', group: t('subtitleSettings.fontGroupVietnamese', 'Việt hóa'), vietnameseSupport: true },
    { value: "'Sarabun', sans-serif", label: 'Sarabun', group: t('subtitleSettings.fontGroupVietnamese', 'Việt hóa'), vietnameseSupport: true },
    { value: "'Lexend', sans-serif", label: 'Lexend', group: t('subtitleSettings.fontGroupVietnamese', 'Việt hóa'), vietnameseSupport: true },
    { value: "'Quicksand', sans-serif", label: 'Quicksand', group: t('subtitleSettings.fontGroupVietnamese', 'Việt hóa'), vietnameseSupport: true },
    { value: "'Nunito', sans-serif", label: 'Nunito', group: t('subtitleSettings.fontGroupVietnamese', 'Việt hóa'), vietnameseSupport: true },

    // Sans-serif đẹp, phổ biến
    { value: "'Montserrat', sans-serif", label: 'Montserrat', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Roboto', sans-serif", label: 'Roboto', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Open Sans', sans-serif", label: 'Open Sans', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Lato', sans-serif", label: 'Lato', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Josefin Sans', sans-serif", label: 'Josefin Sans', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Muli', sans-serif", label: 'Muli', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Source Sans Pro', sans-serif", label: 'Source Sans Pro', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },
    { value: "'Arial', sans-serif", label: 'Arial', group: t('subtitleSettings.fontGroupSansSerif', 'Sans-serif'), vietnameseSupport: true },

    // Serif
    { value: "'Merriweather', serif", label: 'Merriweather', group: t('subtitleSettings.fontGroupSerif', 'Serif'), vietnameseSupport: true },
    { value: "'Times New Roman', serif", label: 'Times New Roman', group: t('subtitleSettings.fontGroupSerif', 'Serif'), vietnameseSupport: true },

    // Monospace
    { value: "'Roboto Mono', monospace", label: 'Roboto Mono', group: t('subtitleSettings.fontGroupMonospace', 'Monospace'), vietnameseSupport: true },
    { value: "'Courier New', monospace", label: 'Courier New', group: t('subtitleSettings.fontGroupMonospace', 'Monospace'), vietnameseSupport: false }
  ];

  // Group fonts for the select element
  const fontGroups = fontOptions.reduce((groups, font) => {
    if (!groups[font.group]) {
      groups[font.group] = [];
    }
    groups[font.group].push(font);
    return groups;
  }, {});

  const fontWeightOptions = [
    { value: '300', label: t('subtitleSettings.light', 'Light') },
    { value: '400', label: t('subtitleSettings.normal', 'Normal') },
    { value: '500', label: t('subtitleSettings.medium', 'Medium') },
    { value: '600', label: t('subtitleSettings.semiBold', 'Semi Bold') },
    { value: '700', label: t('subtitleSettings.bold', 'Bold') },
    { value: '800', label: t('subtitleSettings.extraBold', 'Extra Bold') }
  ];

  const textAlignOptions = [
    { value: 'left', label: t('subtitleSettings.left', 'Left') },
    { value: 'center', label: t('subtitleSettings.center', 'Center') },
    { value: 'right', label: t('subtitleSettings.right', 'Right') }
  ];

  const textTransformOptions = [
    { value: 'none', label: t('subtitleSettings.none', 'None') },
    { value: 'uppercase', label: t('subtitleSettings.uppercase', 'UPPERCASE') },
    { value: 'lowercase', label: t('subtitleSettings.lowercase', 'lowercase') },
    { value: 'capitalize', label: t('subtitleSettings.capitalize', 'Capitalize') }
  ];

  // Position is now a percentage value from 0 (top) to 100 (bottom)

  return (
    <div className="subtitle-settings-container">
      <div className="action-buttons">
        <button
          className="action-button subtitle-settings-toggle md-filled-tonal-button"
          onClick={() => setIsOpen(!isOpen)}
          title={t('subtitleSettings.settingsTooltip', 'Customize subtitle appearance')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>{t('subtitleSettings.toggleSettings', 'Subtitle Settings')}</span>
        </button>
      </div>

      {isOpen && !isHidden && (
        <div className={`subtitle-settings-panel ${isTransparent ? 'transparent' : ''}`}>
          <div className="settings-header">
            <h4>{t('subtitleSettings.title', 'Subtitle Settings')}</h4>
            <div className="settings-header-actions">
              <button
                className={`transparency-toggle-btn ${isTransparent ? 'active' : ''}`}
                onClick={() => setIsTransparent(!isTransparent)}
                title={isTransparent ? t('subtitleSettings.showBackground', 'Show Background') : t('subtitleSettings.transparentBackground', 'Transparent Background')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isTransparent ? (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  )}
                </svg>
              </button>
              <button
                className="close-settings-btn"
                onClick={() => setIsOpen(false)}
              >
                &times;
              </button>
            </div>
          </div>

          <div className="settings-content">
            {/* Column Headers - Only shown in transparent mode */}
            {isTransparent && (
              <>
                <div className="column-header font-column-header">{t('subtitleSettings.fontSettings', 'Font Settings')}</div>
                <div className="column-header text-column-header">{t('subtitleSettings.textFormatting', 'Text Formatting')}</div>
                <div className="column-header position-column-header">{t('subtitleSettings.positionSettings', 'Position Settings')}</div>
                <div className="column-header background-column-header">{t('subtitleSettings.backgroundSettings', 'Background Settings')}</div>
              </>
            )}

            <div className="setting-group">
              <label htmlFor="font-family">{t('subtitleSettings.font', 'Font')}</label>
              <CustomSelect
                value={settings.fontFamily}
                onChange={val => handleSettingChange('fontFamily', val)}
                options={Object.entries(fontGroups).flatMap(([group, fonts]) => fonts.map(font => ({ ...font, group })))}
                placeholder={t('subtitleSettings.font', 'Font')}
                className="font-select"
              />
              <div className="font-preview" style={{ fontFamily: settings.fontFamily }}>
                <span className="font-preview-label">{t('subtitleSettings.fontPreview', 'Preview')}:</span>
                <div className="font-preview-samples">
                  <span className="font-preview-text">{t('subtitleSettings.fontPreviewVietnamese', 'Xin chào (Vietnamese)')}</span>
                  <span className="font-preview-text">{t('subtitleSettings.fontPreviewEnglish', 'Hello 123')}</span>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="font-size">{t('subtitleSettings.fontSize', 'Font Size')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="font-size"
                  min="12"
                  max="36"
                  step="1"
                  value={settings.fontSize}
                  onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                />
                <span className="range-value">{settings.fontSize}px</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="font-weight">{t('subtitleSettings.fontWeight', 'Font Weight')}</label>
              <CustomSelect
                value={settings.fontWeight}
                onChange={val => handleSettingChange('fontWeight', val)}
                options={fontWeightOptions}
                placeholder={t('subtitleSettings.fontWeight', 'Font Weight')}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="position">{t('subtitleSettings.position', 'Y Position')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="position"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.position}
                  onChange={(e) => handleSettingChange('position', e.target.value)}
                />
                <span className="range-value">{settings.position}%</span>
              </div>
              <div className="position-labels">
                <span>{t('subtitleSettings.top', 'Top')}</span>
                <span>{t('subtitleSettings.bottom', 'Bottom')}</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="box-width">{t('subtitleSettings.boxWidth', 'Box Width')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="box-width"
                  min="50"
                  max="100"
                  step="5"
                  value={settings.boxWidth}
                  onChange={(e) => handleSettingChange('boxWidth', e.target.value)}
                />
                <span className="range-value">{settings.boxWidth}%</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="background-color">{t('subtitleSettings.backgroundColor', 'Background Color')}</label>
              <input
                type="color"
                id="background-color"
                value={settings.backgroundColor}
                onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="background-opacity">{t('subtitleSettings.backgroundOpacity', 'Background Opacity')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="background-opacity"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.backgroundOpacity || '0.7'}
                  onChange={(e) => handleSettingChange('backgroundOpacity', e.target.value)}
                />
                <span className="range-value">{Math.round((settings.backgroundOpacity || 0.7) * 100)}%</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="text-color">{t('subtitleSettings.textColor', 'Text Color')}</label>
              <input
                type="color"
                id="text-color"
                value={settings.textColor}
                onChange={(e) => handleSettingChange('textColor', e.target.value)}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="text-opacity">{t('subtitleSettings.textOpacity', 'Text Opacity')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="text-opacity"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.textOpacity || '1'}
                  onChange={(e) => handleSettingChange('textOpacity', e.target.value)}
                />
                <span className="range-value">{Math.round((settings.textOpacity || 1) * 100)}%</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="text-align">{t('subtitleSettings.textAlign', 'Text Alignment')}</label>
              <CustomSelect
                value={settings.textAlign}
                onChange={val => handleSettingChange('textAlign', val)}
                options={textAlignOptions}
                placeholder={t('subtitleSettings.textAlign', 'Text Alignment')}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="text-transform">{t('subtitleSettings.textTransform', 'Text Transform')}</label>
              <CustomSelect
                value={settings.textTransform || 'none'}
                onChange={val => handleSettingChange('textTransform', val)}
                options={textTransformOptions}
                placeholder={t('subtitleSettings.textTransform', 'Text Transform')}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="line-spacing">{t('subtitleSettings.lineSpacing', 'Line Spacing')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="line-spacing"
                  min="1"
                  max="2"
                  step="0.1"
                  value={settings.lineSpacing || '1.4'}
                  onChange={(e) => handleSettingChange('lineSpacing', e.target.value)}
                />
                <span className="range-value">{settings.lineSpacing || '1.4'}</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="letter-spacing">{t('subtitleSettings.letterSpacing', 'Letter Spacing')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="letter-spacing"
                  min="-1"
                  max="5"
                  step="0.5"
                  value={settings.letterSpacing || '0'}
                  onChange={(e) => handleSettingChange('letterSpacing', e.target.value)}
                />
                <span className="range-value">{settings.letterSpacing || '0'}px</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="background-radius">{t('subtitleSettings.backgroundRadius', 'Background Radius')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="background-radius"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.backgroundRadius || '0'}
                  onChange={(e) => handleSettingChange('backgroundRadius', e.target.value)}
                />
                <span className="range-value">{settings.backgroundRadius || '0'}px</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="background-padding">{t('subtitleSettings.backgroundPadding', 'Background Padding')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="background-padding"
                  min="0"
                  max="30"
                  step="2"
                  value={settings.backgroundPadding || '10'}
                  onChange={(e) => handleSettingChange('backgroundPadding', e.target.value)}
                />
                <span className="range-value">{settings.backgroundPadding || '10'}px</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="text-shadow-blur">{t('subtitleSettings.textShadowBlur', 'Text Shadow Blur')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="text-shadow-blur"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.textShadowBlur || '0'}
                  onChange={(e) => handleSettingChange('textShadowBlur', e.target.value)}
                />
                <span className="range-value">{settings.textShadowBlur || '0'}px</span>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="text-shadow-color">{t('subtitleSettings.textShadowColor', 'Text Shadow Color')}</label>
              <input
                type="color"
                id="text-shadow-color"
                value={settings.textShadowColor || '#000000'}
                onChange={(e) => handleSettingChange('textShadowColor', e.target.value)}
              />
            </div>

            <div className="setting-group">
              <label htmlFor="text-stroke-width">{t('subtitleSettings.textStrokeWidth', 'Text Stroke Width')}</label>
              <div className="range-with-value">
                <input
                  type="range"
                  id="text-stroke-width"
                  min="0"
                  max="5"
                  step="0.5"
                  value={settings.textStrokeWidth || '0'}
                  onChange={(e) => handleSettingChange('textStrokeWidth', e.target.value)}
                />
                <span className="range-value">{settings.textStrokeWidth || '0'}px</span>
              </div>
            </div>
            
            <div className="setting-group">
              <label htmlFor="text-stroke-color">{t('subtitleSettings.textStrokeColor', 'Text Stroke Color')}</label>
              <input
                type="color"
                id="text-stroke-color"
                value={settings.textStrokeColor || '#000000'}
                onChange={(e) => handleSettingChange('textStrokeColor', e.target.value)}
              />
            </div>

            <button
              className="reset-settings-btn"
              onClick={() => {
                const currentShowTranslated = settings.showTranslatedSubtitles;
                const defaultSettings = {
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: '24',
                  fontWeight: '500',
                  position: '0',
                  boxWidth: '80',
                  backgroundColor: '#000000',
                  backgroundOpacity: '0.7',
                  textColor: '#ffffff',
                  textOpacity: '1',
                  textAlign: 'center',
                  textTransform: 'none',
                  lineSpacing: '1.4',
                  letterSpacing: '0',
                  backgroundRadius: '4',
                  backgroundPadding: '10',
                  textShadow: false,
                  textShadowBlur: '0',
                  textShadowColor: '#000000',
                  textStrokeWidth: '0',
                  textStrokeColor: '#000000',
                  showTranslatedSubtitles: currentShowTranslated,
                };

                // Save default settings to localStorage
                localStorage.setItem('subtitle_settings', JSON.stringify(defaultSettings));

                // Update state via parent component
                onSettingsChange(defaultSettings);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              {t('subtitleSettings.resetToDefault', 'Reset to Default')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtitleSettings;
