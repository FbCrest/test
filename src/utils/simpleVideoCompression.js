// Simple video compression using Canvas API (fallback solution)
export class SimpleVideoCompressor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.video = null;
  }

  // Check if simple compression is supported
  isSupported() {
    return typeof HTMLCanvasElement !== 'undefined' && 
           typeof HTMLVideoElement !== 'undefined' &&
           typeof MediaRecorder !== 'undefined';
  }

  // Compress video by reducing resolution and quality
  async compressVideo(file, targetSizeMB = 180, onProgress = null) {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
          // More aggressive scaling for maximum speed
          const scale = targetSizeMB < 100 ? 0.3 : targetSizeMB < 150 ? 0.5 : 0.65;
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);
          
          // Use much lower FPS for maximum speed
          const fps = targetSizeMB < 100 ? 10 : targetSizeMB < 150 ? 15 : 18;
          
          // Set up MediaRecorder with speed-optimized settings
          const stream = canvas.captureStream(fps);
          
          // Try VP8 first (faster encoding than VP9)
          let mediaRecorder;
          try {
            mediaRecorder = new MediaRecorder(stream, {
              mimeType: 'video/webm;codecs=vp8',
              videoBitsPerSecond: this.calculateBitrate(targetSizeMB, video.duration)
            });
          } catch (e) {
            // Fallback to default codec
            mediaRecorder = new MediaRecorder(stream, {
              videoBitsPerSecond: this.calculateBitrate(targetSizeMB, video.duration)
            });
          }
          
          const chunks = [];
          let currentTime = 0;
          const frameInterval = 1/fps; // Dynamic FPS
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const compressedBlob = new Blob(chunks, { type: 'video/webm' });
            const compressedFile = new File([compressedBlob], 
              this.getCompressedFileName(file.name), 
              { type: 'video/webm' }
            );
            resolve(compressedFile);
          };
          
          mediaRecorder.start();
          
          // Process video frame by frame
          const processFrame = () => {
            if (currentTime >= video.duration) {
              mediaRecorder.stop();
              return;
            }
            
            video.currentTime = currentTime;
            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              if (onProgress) {
                const progress = (currentTime / video.duration) * 100;
                onProgress(Math.round(progress));
              }
              
              currentTime += frameInterval;
              // Minimal delay for maximum speed
              setTimeout(processFrame, 8); // ~120fps processing for speed
            };
          };
          
          processFrame();
        };
        
        video.onerror = () => {
          reject(new Error('Không thể đọc video để nén'));
        };
        
        video.src = URL.createObjectURL(file);
        video.load();
        
      } catch (error) {
        reject(new Error(`Lỗi nén video: ${error.message}`));
      }
    });
  }
  
  calculateBitrate(targetSizeMB, durationSeconds) {
    // Calculate bitrate to achieve target file size - more aggressive
    const targetBytes = targetSizeMB * 1024 * 1024;
    const targetBits = targetBytes * 8;
    const bitrate = Math.floor(targetBits / durationSeconds);
    
    // Lower bitrate range for faster encoding
    return Math.max(300000, Math.min(1500000, bitrate)); // 300kbps to 1.5Mbps
  }
  
  getCompressedFileName(originalName) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_compressed.webm`;
  }
}

// Create singleton instance
const simpleCompressor = new SimpleVideoCompressor();

export const compressVideoSimple = async (file, targetSizeMB = 180, onProgress = null) => {
  if (!simpleCompressor.isSupported()) {
    throw new Error('Trình duyệt không hỗ trợ nén video');
  }
  
  return await simpleCompressor.compressVideo(file, targetSizeMB, onProgress);
};

export const isSimpleCompressionSupported = () => {
  return simpleCompressor.isSupported();
};