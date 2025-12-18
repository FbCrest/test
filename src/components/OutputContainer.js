import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/OutputContainer.css';
import VideoPreview from './previews/VideoPreview';
import LyricsDisplay from './LyricsDisplay';
import ParallelProcessingStatus from './ParallelProcessingStatus';
import ProgressStatus from './ProgressStatus';
import CustomRadio from './inputs/CustomRadio';
import SubtitleLanguageToggle from './SubtitleLanguageToggle';

const OutputContainer = ({ status, subtitlesData, setSubtitlesData, selectedVideo, uploadedFile, isGenerating, segmentsStatus = [], activeTab, onRetrySegment, onRetryWithModel, onGenerateSegment, videoSegments = [], retryingSegments = [], timeFormat = 'seconds', showWaveform = true }) => {
  const { t } = useTranslation();
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [editedLyrics, setEditedLyrics] = useState(null);
  const [translatedSubtitles, setTranslatedSubtitles] = useState(null);
  const [seekTime, setSeekTime] = useState(null); // Track when seeking happens
  const [renderFunctions, setRenderFunctions] = useState({}); // Store render functions from VideoPreview
  const [subtitleSource, setSubtitleSource] = useState('original');

  const handleLyricClick = (time) => {
    setCurrentTabIndex(time);
  };

  const handleVideoSeek = (time) => {
    // Set the seek time to trigger timeline centering
    setSeekTime(time);

    // Reset the seek time in the next frame to allow future seeks
    requestAnimationFrame(() => {
      setSeekTime(null);
    });
  };

  const handleUpdateLyrics = (updatedLyrics) => {
    if (subtitleSource === 'original') setEditedLyrics(Array.isArray(updatedLyrics) ? updatedLyrics : []);
    else setTranslatedSubtitles(Array.isArray(updatedLyrics) ? updatedLyrics : []);
  };

  // Handle saving subtitles
  const handleSaveSubtitles = (savedLyrics) => {
    // Update the edited lyrics state with the saved lyrics
    if (subtitleSource === 'original') {
      setEditedLyrics(savedLyrics);
      // Only update subtitlesData (the true original) when editing original subtitles
      if (setSubtitlesData) {
        setSubtitlesData(savedLyrics);
      }
    } else {
      setTranslatedSubtitles(savedLyrics);
      // Do NOT update setSubtitlesData when editing translated subtitles
    }
  }

  // Set video source when a video is selected or file is uploaded
  const [videoSource, setVideoSource] = useState('');
  const [actualVideoUrl, setActualVideoUrl] = useState('');
  useEffect(() => {
    // First check for uploaded file
    const uploadedFileUrl = localStorage.getItem('current_file_url');
    if (uploadedFileUrl) {
      setVideoSource(uploadedFileUrl);
      return;
    }

    // Then check for YouTube video
    if (selectedVideo?.url) {
      setVideoSource(selectedVideo.url);
      return;
    }

    // Clear video source if nothing is selected
    setVideoSource('');
  }, [selectedVideo, uploadedFile]);

  // Reset edited lyrics when subtitlesData changes (new video/generation)
  useEffect(() => {
    setEditedLyrics(Array.isArray(subtitlesData) ? [...subtitlesData] : []);
    setTranslatedSubtitles(null); // Reset translated subtitles when video changes
  }, [subtitlesData]);

  // Debug function to log translatedSubtitles changes
  const handleTranslationComplete = (newTranslatedSubtitles) => {
    setTranslatedSubtitles(newTranslatedSubtitles);
  };

  const formatSubtitlesForLyricsDisplay = (subtitles) => {
    const sourceData = subtitles === subtitlesData ? (Array.isArray(editedLyrics) ? editedLyrics : subtitles) : subtitles;
    if (!Array.isArray(sourceData)) return [];
    const result = sourceData.map(sub => ({
      ...sub,
      startTime: sub.start,
      endTime: sub.end
    }));
    // [LOG_REMOVED] '[formatSubtitlesForLyricsDisplay] result:', result);
    return result;
  }

  // Don't render anything if there's no content to show
  if (!status?.message && !subtitlesData) {
    return null;
  }

  return (
    <div className="output-container">
      {status?.message && (
        // Show segments status only for file-upload tab and when segments exist
        segmentsStatus.length > 0 && !activeTab.includes('youtube') ? (
          <ParallelProcessingStatus
            segments={segmentsStatus}
            overallStatus={status.message}
            statusType={status.type}
            onRetrySegment={(segmentIndex) => {
              onRetrySegment && onRetrySegment(segmentIndex, videoSegments);
            }}
            onRetryWithModel={(segmentIndex, modelId) => {
              onRetryWithModel && onRetryWithModel(segmentIndex, modelId, videoSegments);
            }}
            onGenerateSegment={(segmentIndex) => {
              onGenerateSegment && onGenerateSegment(segmentIndex, videoSegments);
            }}
            retryingSegments={retryingSegments}
          />
        ) : (
          <ProgressStatus 
            message={status.message} 
            type={status.type} 
            progress={status.progress}
            showProgress={status.type === 'loading'}
          />
        )
      )}

      {subtitlesData && (
        <>
          <div className="preview-section">
            <VideoPreview
              currentTime={currentTabIndex}
              setCurrentTime={setCurrentTabIndex}
              subtitle={(Array.isArray(editedLyrics) ? editedLyrics : subtitlesData)?.find(s => currentTabIndex >= s.start && currentTabIndex <= s.end)?.text ||
                       subtitlesData.find(s => currentTabIndex >= s.start && currentTabIndex <= s.end)?.text || ''}
              videoSource={videoSource}
              setDuration={setVideoDuration}
              onSeek={handleVideoSeek}
              translatedSubtitles={translatedSubtitles}
              subtitlesArray={Array.isArray(editedLyrics) ? editedLyrics : subtitlesData}
              onVideoUrlReady={setActualVideoUrl}
              onRenderFunctionsReady={(functions) => {
                setRenderFunctions(functions);
              }}
              onTranslationComplete={handleTranslationComplete}
              onSubtitleToggleChange={lang => setSubtitleSource(lang)}
            />

            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 16 }}>
            </div>

            <LyricsDisplay
              matchedLyrics={subtitleSource === 'original' ? formatSubtitlesForLyricsDisplay(subtitlesData) : formatSubtitlesForLyricsDisplay(translatedSubtitles)}
              originalSubtitles={formatSubtitlesForLyricsDisplay(subtitlesData)}
              translatedSubtitles={formatSubtitlesForLyricsDisplay(translatedSubtitles)}
              currentTime={currentTabIndex}
              onLyricClick={handleLyricClick}
              onUpdateLyrics={handleUpdateLyrics}
              onSaveSubtitles={handleSaveSubtitles}
              allowEditing={true}
              duration={videoDuration}
              seekTime={seekTime}
              timeFormat={timeFormat}
              videoSource={actualVideoUrl}
              showWaveform={showWaveform}
              videoTitle={selectedVideo?.title || uploadedFile?.name?.replace(/\.[^/.]+$/, '') || 'subtitles'}
              onRenderWithSubtitles={renderFunctions.handleDownloadWithSubtitles}
              onRenderWithTranslatedSubtitles={renderFunctions.handleDownloadWithTranslatedSubtitles}
              onTranslationComplete={handleTranslationComplete}
              targetLanguage={translatedSubtitles && translatedSubtitles.length > 0 && translatedSubtitles[0].language}
              // Đảm bảo callback tải về luôn lấy đúng dữ liệu gốc/dịch
              onDownload={(source, format) => {
                const original = formatSubtitlesForLyricsDisplay(subtitlesData);
                const translated = formatSubtitlesForLyricsDisplay(translatedSubtitles);
                // Gọi trực tiếp handleDownload trong LyricsDisplay
                if (source === 'original') {
                  import('./LyricsDisplay').then(mod => {
                    mod.default.prototype.handleDownload.call({
                      props: { originalSubtitles: original, translatedSubtitles: translated, videoTitle: selectedVideo?.title || uploadedFile?.name?.replace(/\.[^/.]+$/, '') || 'subtitles', targetLanguage: translatedSubtitles && translatedSubtitles.length > 0 && translatedSubtitles[0].language },
                      setState: () => {},
                    }, 'original', format);
                  });
                } else {
                  import('./LyricsDisplay').then(mod => {
                    mod.default.prototype.handleDownload.call({
                      props: { originalSubtitles: original, translatedSubtitles: translated, videoTitle: selectedVideo?.title || uploadedFile?.name?.replace(/\.[^/.]+$/, '') || 'subtitles', targetLanguage: translatedSubtitles && translatedSubtitles.length > 0 && translatedSubtitles[0].language },
                      setState: () => {},
                    }, 'translated', format);
                  });
                }
              }}
            />

            {/* Download buttons moved to LyricsDisplay component */}
          </div>
        </>
      )}
    </div>
  );
};

export default OutputContainer;