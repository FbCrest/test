// Performance detection utility
export class PerformanceDetector {
  constructor() {
    this.cpuCores = navigator.hardwareConcurrency || 4;
    this.deviceMemory = navigator.deviceMemory || 4; // GB
    this.performanceScore = null;
  }

  // Detect device performance level
  async detectPerformance() {
    if (this.performanceScore !== null) {
      return this.performanceScore;
    }

    try {
      // Quick performance benchmark
      const startTime = performance.now();
      
      // CPU intensive task
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i) * Math.sin(i);
      }
      
      const cpuTime = performance.now() - startTime;
      
      // Calculate performance score (0-100)
      let score = 50; // Base score
      
      // CPU cores factor
      if (this.cpuCores >= 8) score += 20;
      else if (this.cpuCores >= 4) score += 10;
      else if (this.cpuCores >= 2) score += 5;
      
      // Memory factor
      if (this.deviceMemory >= 8) score += 15;
      else if (this.deviceMemory >= 4) score += 10;
      else if (this.deviceMemory >= 2) score += 5;
      
      // CPU speed factor (inverse of benchmark time)
      if (cpuTime < 10) score += 15;
      else if (cpuTime < 20) score += 10;
      else if (cpuTime < 50) score += 5;
      else score -= 10;
      
      this.performanceScore = Math.max(0, Math.min(100, score));
      
      console.log(`🔧 Performance detected:`, {
        cores: this.cpuCores,
        memory: this.deviceMemory + 'GB',
        cpuBenchmark: cpuTime.toFixed(1) + 'ms',
        score: this.performanceScore
      });
      
      return this.performanceScore;
      
    } catch (error) {
      console.warn('Performance detection failed:', error);
      this.performanceScore = 50; // Default medium performance
      return this.performanceScore;
    }
  }

  // Get compression settings based on performance - optimized for speed
  getCompressionSettings(fileSizeMB, targetSizeMB) {
    const score = this.performanceScore || 50;
    const compressionRatio = targetSizeMB / fileSizeMB;
    
    // Always prioritize speed over quality for subtitle generation
    if (score >= 70) {
      // High performance device - use ultrafast preset
      return {
        method: 'ffmpeg',
        preset: 'ultrafast',
        crf: compressionRatio < 0.4 ? 32 : 28,
        scale: compressionRatio < 0.4 ? 0.6 : 0.75,
        fps: compressionRatio < 0.4 ? 20 : 24,
        threads: 0 // Use all threads
      };
    } else if (score >= 50) {
      // Medium performance device - use fast preset
      return {
        method: 'ffmpeg',
        preset: 'ultrafast',
        crf: compressionRatio < 0.4 ? 34 : 30,
        scale: compressionRatio < 0.4 ? 0.5 : 0.65,
        fps: compressionRatio < 0.4 ? 18 : 20,
        threads: Math.max(2, this.cpuCores - 1)
      };
    } else {
      // Low performance device - use simple compression (fastest)
      return {
        method: 'simple',
        scale: compressionRatio < 0.4 ? 0.4 : 0.55,
        fps: compressionRatio < 0.4 ? 12 : 15,
        quality: compressionRatio < 0.4 ? 0.5 : 0.6
      };
    }
  }

  // Get estimated compression time - optimized estimates
  getEstimatedTime(fileSizeMB, settings) {
    const score = this.performanceScore || 50;
    
    // Base time calculation (seconds per MB) - more aggressive estimates
    let timePerMB;
    
    if (settings.method === 'simple') {
      timePerMB = score >= 60 ? 0.8 : 1.2; // Simple method is much faster
    } else {
      // FFmpeg method with ultrafast preset
      if (settings.preset === 'ultrafast') timePerMB = score >= 70 ? 1.0 : 1.5;
      else if (settings.preset === 'fast') timePerMB = score >= 70 ? 2.0 : 2.5;
      else timePerMB = score >= 70 ? 3.0 : 4.0;
    }
    
    const estimatedSeconds = fileSizeMB * timePerMB;
    return Math.max(15, Math.min(300, estimatedSeconds)); // 15s to 5min
  }
}

// Create singleton instance
const performanceDetector = new PerformanceDetector();

export default performanceDetector;