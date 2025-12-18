import { compressVideoIfNeeded, isCompressionSupported } from './videoCompression';
import { compressVideoSimple, isSimpleCompressionSupported } from './simpleVideoCompression';
import performanceDetector from './performanceDetector';

// Compression manager for handling video compression when needed
export class CompressionManager {
  constructor() {
    this.isCompressing = false;
    this.compressionProgress = 0;
    this.onProgressCallback = null;
    this.onStatusCallback = null;
  }

  // Check if file needs compression
  needsCompression(file, thresholdMB = 200) {
    if (!file) return false;
    
    const fileSizeMB = file.size / (1024 * 1024);
    const isVideo = file.type.startsWith('video/');
    
    return isVideo && fileSizeMB > thresholdMB;
  }

  // Compress video with adaptive settings - optimized for speed
  async compressVideo(file, targetSizeMB = 180, onProgress = null, onStatus = null) {
    if (this.isCompressing) {
      throw new Error('Compression already in progress');
    }

    this.isCompressing = true;
    this.compressionProgress = 0;
    this.onProgressCallback = onProgress;
    this.onStatusCallback = onStatus;

    try {
      const fileSizeMB = file.size / (1024 * 1024);
      
      console.log(`🚀 Starting fast compression for ${fileSizeMB.toFixed(1)}MB video`);
      
      // Detect device performance
      const performanceScore = await performanceDetector.detectPerformance();
      const settings = performanceDetector.getCompressionSettings(fileSizeMB, targetSizeMB);
      const estimatedTime = performanceDetector.getEstimatedTime(fileSizeMB, settings);
      
      console.log(`📊 Speed-optimized compression:`, {
        method: settings.method,
        preset: settings.preset || 'simple',
        performance: performanceScore,
        estimatedTime: Math.round(estimatedTime) + 's'
      });
      
      // Prioritize simple compression for speed unless FFmpeg is significantly better
      let compressionMethod = settings.method;
      
      // Force simple compression for very large files (>400MB) for speed
      if (fileSizeMB > 400 && isSimpleCompressionSupported()) {
        compressionMethod = 'simple';
        console.log('🏃‍♂️ Using simple compression for large file to maximize speed');
      }
      
      // Fallback logic
      if (compressionMethod === 'ffmpeg' && !isCompressionSupported()) {
        compressionMethod = isSimpleCompressionSupported() ? 'simple' : 'none';
      } else if (compressionMethod === 'simple' && !isSimpleCompressionSupported()) {
        compressionMethod = isCompressionSupported() ? 'ffmpeg' : 'none';
      }
      
      if (compressionMethod === 'none') {
        throw new Error('Trình duyệt không hỗ trợ nén video');
      }

      // Show compression status with estimated time
      if (this.onStatusCallback) {
        this.onStatusCallback({ 
          message: `Đang nén nhanh từ ${fileSizeMB.toFixed(1)}MB xuống ~${targetSizeMB}MB (ước tính: ${Math.round(estimatedTime/60)}p${Math.round(estimatedTime%60)}s)...`, 
          type: 'info' 
        });
      }
      
      let finalFile;
      
      // Prioritize simple compression for speed
      if (compressionMethod === 'simple') {
        finalFile = await compressVideoSimple(file, targetSizeMB, (progress) => {
          this.compressionProgress = progress;
          if (this.onProgressCallback) {
            this.onProgressCallback(progress);
          }
        });
      } else {
        // Use FFmpeg with ultrafast settings
        finalFile = await compressVideoIfNeeded(file, (progress) => {
          this.compressionProgress = progress;
          if (this.onProgressCallback) {
            this.onProgressCallback(progress);
          }
        }, targetSizeMB);
      }
      
      const compressedSizeMB = finalFile.size / (1024 * 1024);
      
      // Show success message
      if (this.onStatusCallback) {
        this.onStatusCallback({ 
          message: `✅ Nén nhanh thành công! Kích thước giảm từ ${fileSizeMB.toFixed(1)}MB xuống ${compressedSizeMB.toFixed(1)}MB`, 
          type: 'success' 
        });
      }
      
      return finalFile;
      
    } catch (error) {
      console.error('Video compression failed:', error);
      
      // Try fallback method if FFmpeg failed
      if (error.message.includes('ffmpeg') && isSimpleCompressionSupported()) {
        console.log('🔄 Trying fallback compression method...');
        try {
          const finalFile = await compressVideoSimple(file, targetSizeMB, (progress) => {
            this.compressionProgress = progress;
            if (this.onProgressCallback) {
              this.onProgressCallback(progress);
            }
          });
          
          const compressedSizeMB = finalFile.size / (1024 * 1024);
          const fileSizeMB = file.size / (1024 * 1024);
          
          if (this.onStatusCallback) {
            this.onStatusCallback({ 
              message: `✅ Nén video thành công (phương pháp dự phòng)! Kích thước giảm từ ${fileSizeMB.toFixed(1)}MB xuống ${compressedSizeMB.toFixed(1)}MB`, 
              type: 'success' 
            });
          }
          
          return finalFile;
        } catch (fallbackError) {
          console.error('Fallback compression also failed:', fallbackError);
          throw new Error(`Không thể nén video: ${fallbackError.message}`);
        }
      } else {
        throw error;
      }
    } finally {
      this.isCompressing = false;
      this.compressionProgress = 0;
      this.onProgressCallback = null;
      this.onStatusCallback = null;
    }
  }

  // Get compression info without compressing
  async getCompressionInfo(file, targetSizeMB = 180) {
    if (!this.needsCompression(file)) {
      return null;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    const performanceScore = await performanceDetector.detectPerformance();
    const settings = performanceDetector.getCompressionSettings(fileSizeMB, targetSizeMB);
    const estimatedTime = performanceDetector.getEstimatedTime(fileSizeMB, settings);

    return {
      originalSize: fileSizeMB,
      targetSize: targetSizeMB,
      estimatedTime: estimatedTime,
      method: settings.method,
      performanceScore: performanceScore
    };
  }
}

// Create singleton instance
const compressionManager = new CompressionManager();

export default compressionManager;