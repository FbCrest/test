import React, { useState } from 'react';
import '../styles/ExtractAudioButton.css';

const ExtractAudioButton = ({ uploadedFile, onAudioExtracted, disabled }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExtractAudio = async () => {
    if (!uploadedFile || disabled) return;

    // Check if file is video
    if (!uploadedFile.type.startsWith('video/')) {
      alert('Chỉ có thể extract audio từ file video');
      return;
    }

    setIsExtracting(true);
    setProgress(0);

    try {
      // Dynamically import FFmpeg
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();
      
      // Load FFmpeg
      await ffmpeg.load();
      setProgress(20);

      // Write video file to FFmpeg
      await ffmpeg.writeFile('input.mp4', await fetchFile(uploadedFile));
      setProgress(40);

      // Extract audio as MP3
      await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'output.mp3']);
      setProgress(80);

      // Read the output file
      const data = await ffmpeg.readFile('output.mp3');
      setProgress(90);

      // Create a new File object from the extracted audio
      const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
      const audioFile = new File([audioBlob], uploadedFile.name.replace(/\.[^/.]+$/, '.mp3'), {
        type: 'audio/mp3'
      });

      setProgress(100);

      // Call the callback with the extracted audio file
      if (onAudioExtracted) {
        onAudioExtracted(audioFile);
      }

      // Show success message
      setTimeout(() => {
        setIsExtracting(false);
        setProgress(0);
      }, 500);

    } catch (error) {
      console.error('Error extracting audio:', error);
      alert(`Lỗi khi extract audio: ${error.message}`);
      setIsExtracting(false);
      setProgress(0);
    }
  };

  return (
    <button
      className={`extract-audio-button ${isExtracting ? 'extracting' : ''}`}
      onClick={handleExtractAudio}
      disabled={disabled || isExtracting || !uploadedFile || !uploadedFile.type.startsWith('video/')}
      title="Extract audio từ video để giảm dung lượng file"
    >
      {/* Static Gemini icons for decoration */}
      <div className="gemini-icon-container">
        <div className="gemini-mini-icon random-1 size-sm">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
        <div className="gemini-mini-icon random-3 size-md">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
      </div>

      <svg
        className="extract-icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      >
        <path d="M9 18V5l12-2v13"></path>
        <circle cx="6" cy="18" r="3"></circle>
        <circle cx="18" cy="16" r="3"></circle>
      </svg>
      {isExtracting ? (
        <span>
          Đang extract... {progress}%
        </span>
      ) : (
        <span>Extract Audio</span>
      )}
    </button>
  );
};

export default ExtractAudioButton;
