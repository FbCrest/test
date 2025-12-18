// Lazy import FFmpeg to reduce initial bundle size
let FFmpeg, fetchFile, toBlobURL;

const loadFFmpegModules = async () => {
  if (!FFmpeg) {
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    const utilModule = await import('@ffmpeg/util');
    FFmpeg = ffmpegModule.FFmpeg;
    fetchFile = utilModule.fetchFile;
    toBlobURL = utilModule.toBlobURL;
  }
};

class VideoCompressor {
  constructor() {
    this.ffmpeg = null;
    this.isLoaded = false;
    this.isLoading = false;
  }

  async loadFFmpeg() {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    try {
      // Load modules dynamically
      await loadFFmpegModules();
      
      this.ffmpeg = new FFmpeg();
      
      // Use CDN for better reliability on Vercel
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      // Minimal logging for production
      if (process.env.NODE_ENV === 'development') {
        this.ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg:', message);
        });
      }

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      // More specific error messages
      if (error.message.includes('SharedArrayBuffer')) {
        throw new Error('Trình duyệt không hỗ trợ nén video. Vui lòng sử dụng Chrome/Firefox phiên bản mới.');
      } else if (error.message.includes('network')) {
        throw new Error('Không thể tải thư viện nén video. Vui lòng kiểm tra kết nối mạng.');
      } else {
        throw new Error('Không thể khởi tạo công cụ nén video. Vui lòng thử lại.');
      }
    } finally {
      this.isLoading = false;
    }
  }

  async compressVideo(file, targetSizeMB = 180, onProgress = null) {
    try {
      await this.loadFFmpeg();

      const inputName = 'input.' + this.getFileExtension(file.name);
      const outputName = 'output.mp4';

      // Write input file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputName, await fetchFile(file));

      // Calculate compression parameters with speed optimization
      const fileSizeMB = file.size / (1024 * 1024);
      const compressionRatio = targetSizeMB / fileSizeMB;
      
      let videoParams = [];
      
      if (compressionRatio < 0.3) {
        // Heavy compression needed - prioritize speed
        videoParams = [
          '-c:v', 'libx264',
          '-preset', 'ultrafast', // Fastest encoding
          '-crf', '30', // Higher CRF for smaller size
          '-vf', 'scale=iw*0.6:ih*0.6', // More aggressive scaling
          '-r', '20', // Lower framerate
          '-g', '60', // Larger GOP for faster encoding
          '-c:a', 'aac',
          '-b:a', '64k', // Lower audio bitrate
          '-ac', '1', // Mono audio
          '-threads', '0' // Use all available CPU threads
        ];
      } else if (compressionRatio < 0.6) {
        // Medium compression - balance speed and quality
        videoParams = [
          '-c:v', 'libx264',
          '-preset', 'veryfast', // Fast encoding
          '-crf', '27',
          '-vf', 'scale=iw*0.75:ih*0.75',
          '-r', '24',
          '-g', '48',
          '-c:a', 'aac',
          '-b:a', '96k',
          '-ac', '2',
          '-threads', '0'
        ];
      } else {
        // Light compression - still prioritize speed
        videoParams = [
          '-c:v', 'libx264',
          '-preset', 'fast', // Fast preset
          '-crf', '25',
          '-vf', 'scale=iw*0.85:ih*0.85',
          '-r', '25',
          '-g', '30',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ac', '2',
          '-threads', '0'
        ];
      }

      // Set up progress tracking
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100));
        });
      }

      // Run FFmpeg compression
      await this.ffmpeg.exec([
        '-i', inputName,
        ...videoParams,
        '-movflags', '+faststart', // Optimize for web streaming
        outputName
      ]);

      // Read the compressed file
      const data = await this.ffmpeg.readFile(outputName);
      
      // Create new File object
      const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const compressedFile = new File([compressedBlob], 
        this.getCompressedFileName(file.name), 
        { type: 'video/mp4' }
      );

      // Clean up
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      return compressedFile;
    } catch (error) {
      console.error('Video compression failed:', error);
      throw new Error(`Nén video thất bại: ${error.message}`);
    }
  }

  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  getCompressedFileName(originalName) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_compressed.mp4`;
  }

  // Check if compression is needed
  shouldCompress(file, maxSizeMB = 200) {
    const fileSizeMB = file.size / (1024 * 1024);
    return fileSizeMB > maxSizeMB;
  }

  // Get estimated compression time
  getEstimatedTime(fileSizeMB) {
    // Rough estimation: 1MB takes about 2-3 seconds on average hardware
    const baseTime = fileSizeMB * 2.5;
    return Math.max(30, Math.min(300, baseTime)); // Between 30s and 5 minutes
  }
}

// Create singleton instance
const videoCompressor = new VideoCompressor();

export default videoCompressor;

// Helper function for easy use
export const compressVideoIfNeeded = async (file, onProgress = null, maxSizeMB = 200) => {
  if (!videoCompressor.shouldCompress(file, maxSizeMB)) {
    return file; // No compression needed
  }

  // Check if compression is supported
  if (!window.SharedArrayBuffer) {
    console.warn('SharedArrayBuffer not available, skipping compression');
    throw new Error('Trình duyệt không hỗ trợ nén video. Vui lòng sử dụng file nhỏ hơn hoặc nén thủ công.');
  }

  const fileSizeMB = file.size / (1024 * 1024);
  const estimatedTime = videoCompressor.getEstimatedTime(fileSizeMB);
  
  console.log(`Compressing video from ${fileSizeMB.toFixed(1)}MB to ~${maxSizeMB}MB (estimated time: ${Math.round(estimatedTime)}s)`);
  
  try {
    return await videoCompressor.compressVideo(file, maxSizeMB * 0.9, onProgress);
  } catch (error) {
    console.error('Compression failed:', error);
    throw error;
  }
};

// Check if video compression is supported
export const isCompressionSupported = () => {
  return typeof window !== 'undefined' && 
         window.SharedArrayBuffer && 
         window.WebAssembly;
};