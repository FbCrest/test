import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startYoutubeVideoDownload,
  checkDownloadStatus,
  extractYoutubeVideoId
} from '../../utils/videoDownloader';
import { renderSubtitlesToVideo, downloadVideo } from '../../utils/videoUtils';
import { subtitlesToVtt, createVttBlobUrl, revokeVttBlobUrl, convertTimeStringToSeconds } from '../../utils/vttUtils';
import SubtitleSettings from '../SubtitleSettings';
import TranslationModal from '../TranslationModal';
import SubtitleLanguageToggle from '../SubtitleLanguageToggle';
import SubtitleHideToggle from '../SubtitleHideToggle';
import '../../styles/VideoPreview.css';

const hexToRgba = (hex, opacity) => {
  if (!hex) return `rgba(0, 0, 0, ${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const VideoPreview = ({ currentTime, setCurrentTime, subtitle, setDuration, videoSource, onSeek, translatedSubtitles, subtitlesArray, onVideoUrlReady, onRenderFunctionsReady, onTranslationComplete, onSubtitleToggleChange }) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const seekLockRef = useRef(false);
  const lastTimeUpdateRef = useRef(0); // Track last time update to throttle updates
  const lastPlayStateRef = useRef(false); // Track last play state to avoid redundant updates
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoId, setVideoId] = useState(null);
  const [downloadCheckInterval, setDownloadCheckInterval] = useState(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [originalVttUrl, setOriginalVttUrl] = useState('');
  const [translatedVttUrl, setTranslatedVttUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);

  // State for hiding subtitles
  const [isSubtitlesHidden, setIsSubtitlesHidden] = useState(() => {
    const savedHidden = localStorage.getItem('subtitle_hidden');
    return savedHidden === 'true';
  });

  // Use refs to track previous values to prevent unnecessary updates
  const prevSubtitlesArrayRef = useRef(null);
  const prevTranslatedSubtitlesRef = useRef(null);

  const [subtitleSettings, setSubtitleSettings] = useState(() => {
    // Try to load settings from localStorage
    const savedSettings = localStorage.getItem('subtitle_settings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (e) {
      }
    }

    // Default settings if nothing is saved
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24',
      fontWeight: '400',
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
      showTranslatedSubtitles: false
    };
  });
  // We track play state in lastPlayStateRef instead of using state to avoid unnecessary re-renders

  // Process the video URL (download if it's YouTube)
  const processVideoUrl = useCallback(async (url) => {
    // Reset states
    setError('');
    setIsLoaded(false);

    // Check if it's a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        setIsDownloading(true);
        setDownloadProgress(0);

        // Store the URL for future use
        localStorage.setItem('current_video_url', url);

        // Extract video ID (used by the download process internally)
        extractYoutubeVideoId(url);

        // Start the download process but don't wait for it to complete
        const id = startYoutubeVideoDownload(url);
        setVideoId(id);

        // Check initial status - it might already be complete if cached
        const initialStatus = checkDownloadStatus(id);
        if (initialStatus.status === 'completed') {
          setVideoUrl(initialStatus.url);
          setIsDownloading(false);
        }
      } catch (err) {
        setError(t('preview.videoError', `Error loading video: ${err.message}`));
        setIsDownloading(false);
      }
    } else {
      // Not a YouTube URL, use directly
      setVideoUrl(url);
    }
  }, [t, setError, setIsLoaded, setIsDownloading, setDownloadProgress, setVideoId, setVideoUrl]);

  // Function to detect MIME type from URL or file extension
  const detectMimeType = (url) => {
    if (url.startsWith('blob:')) {
      // For blob URLs, we can't easily detect MIME type, let browser handle it
      return null;
    }
    
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mkv': 'video/x-matroska',
      'm4v': 'video/x-m4v',
      '3gp': 'video/3gpp'
    };
    
    return mimeTypes[extension] || null;
  };

  // Initialize video source
  useEffect(() => {
    const loadVideo = async () => {
      // Reset video state when source changes
      setIsLoaded(false);
      setVideoUrl('');
      setError('');

      if (!videoSource) {
        setError(t('preview.noVideo', 'No video source available. Please select a video first.'));
        return;
      }

      // If it's a blob URL (from file upload), use it directly
      if (videoSource.startsWith('blob:')) {
        setVideoUrl(videoSource);
        return;
      }

      // If it's a YouTube URL, handle download
      if (videoSource.includes('youtube.com') || videoSource.includes('youtu.be')) {
        await processVideoUrl(videoSource);
        return;
      }

      // For any other URL, try to use it directly
      setVideoUrl(videoSource);
    };

    loadVideo();
  }, [videoSource, t, processVideoUrl]);

  // Notify parent component when videoUrl changes
  useEffect(() => {
    if (videoUrl && onVideoUrlReady) {
      onVideoUrlReady(videoUrl);
    }
  }, [videoUrl, onVideoUrlReady]);

  // Check download status at interval if we have a videoId
  useEffect(() => {
    if (!videoId) return;

    // Clear any existing interval
    if (downloadCheckInterval) {
      clearInterval(downloadCheckInterval);
    }

    // Set up a new interval to check download status
    const interval = setInterval(() => {
      const status = checkDownloadStatus(videoId);
      setDownloadProgress(status.progress);

      if (status.status === 'completed') {
        setVideoUrl(status.url);
        setIsDownloading(false);
        clearInterval(interval);
      } else if (status.status === 'error') {
        setError(t('preview.videoError', `Error loading video: ${status.error}`));
        setIsDownloading(false);
        clearInterval(interval);
      }
    }, 1000);

    setDownloadCheckInterval(interval);

    // Clean up on unmount
    return () => clearInterval(interval);
  }, [videoId, t, downloadCheckInterval]);

  // processVideoUrl is now defined inside the useEffect above

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (downloadCheckInterval) {
        clearInterval(downloadCheckInterval);
      }
    };
  }, [downloadCheckInterval]);

  // Handle native video element
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Validate the video URL
    if (!videoUrl) {
      setError(t('preview.videoError', 'No video URL provided.'));
      return;
    }

    // Event handlers
    const handleMetadataLoaded = () => {
      setIsLoaded(true);
      setDuration(videoElement.duration);
      setError(''); // Clear any previous errors
    };

    const handleError = (e) => {
      // Get more detailed information about the error
      let errorDetails = '';
      if (videoElement.error) {
        const errorCode = videoElement.error.code;
        switch (errorCode) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorDetails = 'Video playback was aborted.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorDetails = 'Network error. Check your internet connection.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorDetails = 'Video decoding error. The file might be corrupted or in an unsupported format.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            const detectedMimeType = detectMimeType(videoUrl);
            if (detectedMimeType) {
              errorDetails = `Video format (${detectedMimeType}) is not supported by your browser. Try converting to MP4 format.`;
            } else {
              errorDetails = 'Video format is not supported by your browser. Try converting to MP4, WebM, or OGG format.';
            }
            break;
          default:
            errorDetails = `Unknown error (code: ${errorCode}).`;
        }
      }

      setError(t('preview.videoError', `Error loading video: ${errorDetails}`));
      setIsLoaded(false);
    };

    const handleTimeUpdate = () => {
      // Only update currentTime if we're not in a seek operation
      if (!seekLockRef.current) {
        // Throttle time updates to reduce unnecessary re-renders
        // Only update if more than 100ms has passed since the last update
        const now = performance.now();
        if (now - lastTimeUpdateRef.current > 100) {
          setCurrentTime(videoElement.currentTime);
          lastTimeUpdateRef.current = now;
        }
      }

      // Update play state in ref to avoid unnecessary re-renders
      const currentlyPlaying = !videoElement.paused;
      if (currentlyPlaying !== lastPlayStateRef.current) {
        lastPlayStateRef.current = currentlyPlaying;
      }
    };

    const handlePlayPauseEvent = () => {
      // Update play state in ref to avoid unnecessary re-renders
      const currentlyPlaying = !videoElement.paused;
      if (currentlyPlaying !== lastPlayStateRef.current) {
        lastPlayStateRef.current = currentlyPlaying;
      }
    };

    const handleSeeking = () => {
      seekLockRef.current = true;
    };

    const handleSeeked = () => {
      // Update the current time immediately when seeking is complete
      setCurrentTime(videoElement.currentTime);
      lastTimeUpdateRef.current = performance.now();

      // Notify parent component about the seek operation
      if (onSeek) {
        onSeek(videoElement.currentTime);
      }

      // Release the seek lock immediately
      seekLockRef.current = false;
    };

    // Add event listeners
    videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlayPauseEvent);
    videoElement.addEventListener('pause', handlePlayPauseEvent);
    videoElement.addEventListener('seeking', handleSeeking);
    videoElement.addEventListener('seeked', handleSeeked);

    // Clean up
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlayPauseEvent);
      videoElement.removeEventListener('pause', handlePlayPauseEvent);
      videoElement.removeEventListener('seeking', handleSeeking);
      videoElement.removeEventListener('seeked', handleSeeked);
    };
  }, [videoUrl, setCurrentTime, setDuration, t, onSeek]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update VTT subtitles for original subtitles when they change - with deep comparison
  useEffect(() => {
    // Skip if subtitlesArray is the same as before (deep comparison)
    if (
      prevSubtitlesArrayRef.current &&
      subtitlesArray &&
      prevSubtitlesArrayRef.current.length === subtitlesArray.length &&
      JSON.stringify(prevSubtitlesArrayRef.current) === JSON.stringify(subtitlesArray)
    ) {
      return;
    }

    // Clean up previous blob URLs
    if (originalVttUrl) revokeVttBlobUrl(originalVttUrl);

    // Only create VTT for original subtitles if we're not showing translated subtitles
    if (!subtitleSettings.showTranslatedSubtitles && subtitlesArray && subtitlesArray.length > 0) {
      const vttContent = subtitlesToVtt(subtitlesArray);
      const blobUrl = createVttBlobUrl(vttContent);
      setOriginalVttUrl(blobUrl);
    } else {
      setOriginalVttUrl('');
    }

    // Update the ref with the current value
    prevSubtitlesArrayRef.current = subtitlesArray;

    return () => {
      if (originalVttUrl) revokeVttBlobUrl(originalVttUrl);
    };
  }, [subtitlesArray, subtitleSettings.showTranslatedSubtitles]);

  // Update VTT subtitles for translations when they change - with deep comparison
  useEffect(() => {
    // Skip if translatedSubtitles is the same as before (deep comparison)
    if (
      prevTranslatedSubtitlesRef.current &&
      translatedSubtitles &&
      prevTranslatedSubtitlesRef.current.length === translatedSubtitles.length &&
      JSON.stringify(prevTranslatedSubtitlesRef.current) === JSON.stringify(translatedSubtitles)
    ) {
      return;
    }

    // Clean up previous VTT URL
    if (translatedVttUrl) revokeVttBlobUrl(translatedVttUrl);

    // Only create VTT for translated subtitles if we're showing translated subtitles
    if (subtitleSettings.showTranslatedSubtitles && translatedSubtitles && translatedSubtitles.length > 0 && subtitlesArray) {
      const vttContent = subtitlesToVtt(translatedSubtitles, true, subtitlesArray);
      const blobUrl = createVttBlobUrl(vttContent);
      setTranslatedVttUrl(blobUrl);
    } else {
      setTranslatedVttUrl('');
    }

    // Update the ref for next comparison
    prevTranslatedSubtitlesRef.current = translatedSubtitles;
  }, [translatedSubtitles, subtitlesArray, subtitleSettings.showTranslatedSubtitles]);

  // Update active track when subtitle settings change
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Wait for tracks to be loaded
    const handleTracksLoaded = () => {
      if (videoElement.textTracks.length > 0) {
        // Disable all tracks first
        for (let i = 0; i < videoElement.textTracks.length; i++) {
          videoElement.textTracks[i].mode = 'hidden';
        }

        // Enable the appropriate track
        if (subtitleSettings.showTranslatedSubtitles && translatedVttUrl) {
          // Find the translated track
          for (let i = 0; i < videoElement.textTracks.length; i++) {
            if (videoElement.textTracks[i].language === 'translated') {
              videoElement.textTracks[i].mode = 'showing';
              break;
            }
          }
        } else if (originalVttUrl) {
          // Find the original track
          for (let i = 0; i < videoElement.textTracks.length; i++) {
            if (videoElement.textTracks[i].language === 'original') {
              videoElement.textTracks[i].mode = 'showing';
              break;
            }
          }
        }
      }
    };

    // Call immediately and also set up a listener for loadedmetadata
    handleTracksLoaded();
    videoElement.addEventListener('loadedmetadata', handleTracksLoaded);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleTracksLoaded);
    };
  }, [subtitleSettings.showTranslatedSubtitles, originalVttUrl, translatedVttUrl]);

  // Seek to time when currentTime changes externally (from LyricsDisplay)
  useEffect(() => {
    if (!isLoaded) return;

    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Only seek if the difference is significant to avoid loops
    // Increased threshold to 0.2 seconds to further reduce unnecessary seeks
    if (Math.abs(videoElement.currentTime - currentTime) > 0.2) {
      // Set the seek lock to prevent timeupdate from overriding our seek
      seekLockRef.current = true;

      // Store the playing state
      const wasPlaying = !videoElement.paused;
      lastPlayStateRef.current = wasPlaying;

      // Set the new time without pausing first
      // This reduces the play/pause flickering
      videoElement.currentTime = currentTime;

      // Update the last time update reference
      lastTimeUpdateRef.current = performance.now();

      // Release the seek lock after a very short delay
      setTimeout(() => {
        seekLockRef.current = false;
      }, 50);
    }
  }, [currentTime, isLoaded]);

  // Handle downloading video with subtitles
  const handleDownloadWithSubtitles = useCallback(async () => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
    }
    if (!videoUrl || !subtitlesArray || subtitlesArray.length === 0) {
      setError(t('videoPreview.noSubtitlesToRender', 'No subtitles to render'));
      return;
    }

    setIsRenderingVideo(true);
    setRenderProgress(0);
    setError('');

    try {
      const renderedVideoUrl = await renderSubtitlesToVideo(
        videoUrl,
        subtitlesArray,
        subtitleSettings,
        (progress) => setRenderProgress(progress)
      );

      // Get video title or use default
      const videoTitle = videoSource?.title || 'video-with-subtitles';
      downloadVideo(renderedVideoUrl, `${videoTitle}.webm`);
    } catch (err) {
      setError(t('videoPreview.renderError', 'Error rendering subtitles: {{error}}', { error: err.message }));
    } finally {
      setIsRenderingVideo(false);
    }
  }, [videoUrl, subtitlesArray, subtitleSettings, videoSource, t]);

  // Handle downloading video with translated subtitles
  const handleDownloadWithTranslatedSubtitles = useCallback(async () => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
    }
    if (!videoUrl || !translatedSubtitles || translatedSubtitles.length === 0) {
      setError(t('videoPreview.noTranslatedSubtitles', 'No translated subtitles available'));
      return;
    }

    setIsRenderingVideo(true);
    setRenderProgress(0);
    setError('');

    try {
      // Convert translatedSubtitles to the format expected by renderSubtitlesToVideo
      // Use original subtitle timings when available
      const formattedSubtitles = translatedSubtitles.map(sub => {
        // If this subtitle has an originalId, find the corresponding original subtitle
        if (sub.originalId && subtitlesArray) {
          const originalSub = subtitlesArray.find(s => s.id === sub.originalId);
          if (originalSub) {
            // Use the original subtitle's timing
            return {
              id: sub.id,
              start: originalSub.start,
              end: originalSub.end,
              text: sub.text
            };
          }
        }

        // If the subtitle already has start/end properties, use them
        if (sub.start !== undefined && sub.end !== undefined) {
          return sub;
        }

        // Otherwise, convert from startTime/endTime format
        return {
          id: sub.id,
          start: convertTimeStringToSeconds(sub.startTime),
          end: convertTimeStringToSeconds(sub.endTime),
          text: sub.text
        };
      });

      const renderedVideoUrl = await renderSubtitlesToVideo(
        videoUrl,
        formattedSubtitles,
        subtitleSettings,
        (progress) => setRenderProgress(progress)
      );

      // Get video title or use default
      const videoTitle = videoSource?.title || 'video-with-translated-subtitles';
      downloadVideo(renderedVideoUrl, `${videoTitle}.webm`);
    } catch (err) {
      setError(t('videoPreview.renderError', 'Error rendering subtitles: {{error}}', { error: err.message }));
    } finally {
      setIsRenderingVideo(false);
    }
  }, [videoUrl, translatedSubtitles, subtitlesArray, subtitleSettings, videoSource, t]);

  // Get current subtitle text
  const getCurrentSubtitleText = () => {
    const getSubtitleTimes = (subtitle) => {
      if (typeof subtitle.start === 'number' && typeof subtitle.end === 'number') {
        return { start: subtitle.start, end: subtitle.end };
      }
      // Handle SRT format with timestamp strings
      if (subtitle.start && subtitle.end) {
        const startMatch = subtitle.start.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        const endMatch = subtitle.end.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (startMatch && endMatch) {
          const start = parseInt(startMatch[1]) * 3600 + parseInt(startMatch[2]) * 60 + parseInt(startMatch[3]) + parseInt(startMatch[4]) / 1000;
          const end = parseInt(endMatch[1]) * 3600 + parseInt(endMatch[2]) * 60 + parseInt(endMatch[3]) + parseInt(endMatch[4]) / 1000;
          return { start, end };
        }
      }
      return { start: 0, end: 0 };
    };

    // If subtitles are hidden, return empty string
    if (isSubtitlesHidden) {
      return '';
    }

    // Nếu chọn phụ đề đã dịch
    if (subtitleSettings.showTranslatedSubtitles) {
      if (translatedSubtitles && translatedSubtitles.length > 0) {
        const currentTranslatedSubtitle = translatedSubtitles.find(sub => {
          let start, end;
          if (subtitlesArray && subtitlesArray.length > 0) {
            const originalSub = subtitlesArray.find(original => {
              const originalTimes = getSubtitleTimes(original);
              const translatedTimes = getSubtitleTimes(sub);
              return originalTimes.start === translatedTimes.start && originalTimes.end === translatedTimes.end;
            });
            if (originalSub) {
              const originalTimes = getSubtitleTimes(originalSub);
              start = originalTimes.start;
              end = originalTimes.end;
            } else {
              const translatedTimes = getSubtitleTimes(sub);
              start = translatedTimes.start;
              end = translatedTimes.end;
            }
          } else {
            const translatedTimes = getSubtitleTimes(sub);
            start = translatedTimes.start;
            end = translatedTimes.end;
          }
          return currentTime >= start && currentTime <= end;
        });
        if (currentTranslatedSubtitle) {
          return currentTranslatedSubtitle.text;
        }
      }
      // Nếu không có phụ đề dịch thì ẩn hết (không hiển thị gì)
      return '';
    }
    // Nếu chọn phụ đề gốc
    if (!subtitleSettings.showTranslatedSubtitles && subtitlesArray && subtitlesArray.length > 0) {
      const currentSubtitle = subtitlesArray.find(sub => {
        const { start, end } = getSubtitleTimes(sub);
        return currentTime >= start && currentTime <= end;
      });
      if (currentSubtitle) {
        return currentSubtitle.text;
      }
    }
    return '';
  };

  const currentSubtitleText = getCurrentSubtitleText();

  // Handle subtitle hide toggle
  const handleSubtitleHideToggle = (hidden) => {
    setIsSubtitlesHidden(hidden);
    localStorage.setItem('subtitle_hidden', hidden.toString());
  };

  // Pass render functions to parent component
  useEffect(() => {
    if (onRenderFunctionsReady) {
      onRenderFunctionsReady({
        handleDownloadWithSubtitles,
        handleDownloadWithTranslatedSubtitles
      });
    }
  }, []);

  // Global keyboard shortcuts: Space (play/pause), ArrowLeft/ArrowRight (seek)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
        }
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime -= 5;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime += 5;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="video-preview">
      <div className="video-preview-header">
        <h3>{t('output.videoPreview', 'Video Preview with Subtitles')}</h3>
        <div className="video-preview-actions">
          <SubtitleHideToggle
            isHidden={isSubtitlesHidden}
            onToggle={handleSubtitleHideToggle}
          />
          <SubtitleLanguageToggle
            hasTranslation={translatedSubtitles && translatedSubtitles.length > 0}
            targetLanguage={translatedSubtitles && translatedSubtitles.length > 0 && translatedSubtitles[0].language}
            onLanguageChange={(language) => {
              setSubtitleSettings(prev => ({
                ...prev,
                showTranslatedSubtitles: language === 'translated'
              }));
              if (typeof onSubtitleToggleChange === 'function') {
                onSubtitleToggleChange(language);
              }
            }}
            isHidden={isSubtitlesHidden}
          />
          <button
            className="translate-btn"
            onClick={() => setIsTranslationModalOpen(true)}
            disabled={!subtitlesArray || subtitlesArray.length === 0}
            title={t('translation.title', 'Dịch phụ đề')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span>{t('translation.title', 'Dịch phụ đề')}</span>
          </button>
          <SubtitleSettings
            settings={subtitleSettings}
            onSettingsChange={setSubtitleSettings}
            onDownloadWithSubtitles={handleDownloadWithSubtitles}
            onDownloadWithTranslatedSubtitles={handleDownloadWithTranslatedSubtitles}
            hasTranslation={translatedSubtitles && translatedSubtitles.length > 0}
            translatedSubtitles={translatedSubtitles}
            targetLanguage={translatedSubtitles && translatedSubtitles.length > 0 && translatedSubtitles[0].language}
            isHidden={isSubtitlesHidden}
          />
        </div>
      </div>

      {/* Subtitles preview section */}
      {/* Removed SubtitlesPreview to only show overlay subtitles on video */}

      {error && (
        <div className="progress-status success">
          <div className="progress-status-content">
            <div className="progress-status-message">
              {error}
            </div>
          </div>
        </div>
      )}

      {isRenderingVideo && (
        <div className="rendering-overlay">
          <div className="rendering-progress">
            <div className="progress-bar" style={{ width: `${renderProgress * 100}%` }}></div>
          </div>
          <div className="rendering-text">
            {t('videoPreview.rendering', 'Rendering video with subtitles...')} ({Math.round(renderProgress * 100)}%)
          </div>
        </div>
      )}

      <div className="video-container">

        {isDownloading ? (
          <div className="video-downloading">
            <div className="download-progress">
              <div className="progress-bar" style={{ width: `${downloadProgress}%` }}></div>
            </div>
            <div className="download-text">
              {t('preview.downloading', 'Downloading video...')} ({downloadProgress}%)
            </div>
          </div>
        ) : (
          videoUrl ? (
            <div className="native-video-container" style={{position: 'relative'}}>
              <video
                ref={videoRef}
                controls
                className="video-player"
                playsInline
                src={videoUrl}
                crossOrigin="anonymous"
              >
                {t('preview.videoNotSupported', 'Your browser does not support the video tag.')}
              </video>
              {/* Manual subtitle overlay */}
              {currentSubtitleText && (
                <div 
                  className="subtitle-overlay"
                  style={{
                    position: 'absolute',
                    bottom: `${subtitleSettings.position}%`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${subtitleSettings.boxWidth}%`,
                    maxWidth: '80%',
                    padding: `${subtitleSettings.backgroundPadding}px`,
                    backgroundColor: hexToRgba(subtitleSettings.backgroundColor, subtitleSettings.backgroundOpacity),
                    borderRadius: `${subtitleSettings.backgroundRadius}px`,
                    color: hexToRgba(subtitleSettings.textColor, subtitleSettings.textOpacity),
                    fontFamily: subtitleSettings.fontFamily,
                    fontSize: `${subtitleSettings.fontSize}px`,
                    fontWeight: subtitleSettings.fontWeight,
                    lineHeight: subtitleSettings.lineSpacing || '1.4',
                    textAlign: subtitleSettings.textAlign || 'center',
                    textTransform: subtitleSettings.textTransform || 'none',
                    letterSpacing: `${subtitleSettings.letterSpacing || '0'}px`,
                    textShadow: parseFloat(subtitleSettings.textShadowBlur || '0') > 0 ? `2px 2px ${subtitleSettings.textShadowBlur}px ${hexToRgba(subtitleSettings.textShadowColor || '#000000', 0.7)}` : 'none',
                    WebkitTextStroke: `${subtitleSettings.textStrokeWidth}px ${subtitleSettings.textStrokeColor}`,
                    whiteSpace: 'pre-line',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }}
                >
                  {currentSubtitleText}
                </div>
              )}
              {/* Apply subtitle styling to the video element for fullscreen */}
              {isFullscreen && (
                <style>
                  {`
                    ::cue {
                      background-color: ${hexToRgba(subtitleSettings.backgroundColor, subtitleSettings.backgroundOpacity)};
                      color: ${hexToRgba(subtitleSettings.textColor, subtitleSettings.textOpacity)};
                      font-family: ${subtitleSettings.fontFamily};
                      font-size: ${subtitleSettings.fontSize}px;
                      font-weight: ${subtitleSettings.fontWeight};
                      line-height: ${subtitleSettings.lineSpacing || '1.4'};
                      text-align: ${subtitleSettings.textAlign || 'center'};
                      text-transform: ${subtitleSettings.textTransform || 'none'};
                      letter-spacing: ${subtitleSettings.letterSpacing || '0'}px;
                      text-shadow: ${parseFloat(subtitleSettings.textShadowBlur || '0') > 0 ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none'};
                      -webkit-text-stroke: ${subtitleSettings.textStrokeWidth}px ${subtitleSettings.textStrokeColor};
                      white-space: pre-line;
                    }
                  `}
                </style>
              )}
            </div>
          ) : (
            <div className="no-video-message">
              {t('preview.noVideo', 'No video source available. Please select a video first.')}
            </div>
          )
        )}
      </div>

      {/* Translation Modal */}
      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        subtitles={subtitlesArray}
        videoTitle={videoSource ? videoSource.name || 'video' : 'video'}
        onTranslationComplete={onTranslationComplete}
      />
    </div>
  );
};

export default VideoPreview;