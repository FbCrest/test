/**
 * Centralized error handling utility for better user experience
 */

import i18n from '../i18n/i18n';

/**
 * Handle file upload errors with Vietnamese messages
 * @param {Error} error - The error object
 * @param {number} fileSize - File size in MB
 * @returns {string} - User-friendly Vietnamese error message
 */
export const handleFileUploadError = (error, fileSize = 0) => {
  const errorMessage = error.message.toLowerCase();
  
  // Check for specific error patterns
  if (errorMessage.includes('413') || errorMessage.includes('file quá lớn')) {
    return `Lỗi: File quá lớn (${fileSize.toFixed(1)}MB). Server không thể xử lý file này. Vui lòng nén hoặc chia nhỏ video xuống dưới 200MB.`;
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('server')) {
    return `Lỗi server (500): Không thể xử lý file. Có thể do file quá lớn (${fileSize.toFixed(1)}MB) hoặc định dạng không tương thích. Khuyến nghị:
    • Nén hoặc chia nhỏ video xuống dưới 200MB
    • Chuyển đổi sang định dạng MP4
    • Giảm độ phân giải video`;
  }
  
  if (errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
    return 'Lỗi server tạm thời: Server đang quá tải. Vui lòng thử lại sau 5-10 phút.';
  }
  
  if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
    return 'Lỗi định dạng file: File không hợp lệ hoặc bị hỏng. Vui lòng kiểm tra lại file.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
    return 'Lỗi kết nối: Mạng không ổn định hoặc file quá lớn. Vui lòng kiểm tra kết nối internet và thử lại.';
  }
  
  // Default error message
  return `Lỗi không xác định: ${error.message}. Vui lòng thử lại hoặc sử dụng file nhỏ hơn.`;
};

/**
 * Handle Gemini API errors with Vietnamese messages
 * @param {Error} error - The error object
 * @param {number} statusCode - HTTP status code
 * @returns {string} - User-friendly Vietnamese error message
 */
export const handleGeminiApiError = (error, statusCode = 0) => {
  const errorMessage = error.message.toLowerCase();
  
  switch (statusCode) {
    case 400:
      return 'Lỗi 400: Yêu cầu không hợp lệ. Có thể do định dạng file không được hỗ trợ hoặc API key không đúng.';
    case 401:
      return 'Lỗi 401: API key không hợp lệ. Vui lòng kiểm tra lại API key trong cài đặt.';
    case 403:
      return 'Lỗi 403: Không có quyền truy cập. Vui lòng kiểm tra API key và quyền của tài khoản.';
    case 404:
      return 'Lỗi 404: API không tìm thấy. Vui lòng kiểm tra lại cấu hình API key.';
    case 413:
      return 'Lỗi 413: File quá lớn. Gemini API không thể xử lý file này. Vui lòng nén video xuống dưới 200MB.';
    case 429:
      return 'Lỗi 429: Vượt quá giới hạn API. Vui lòng đợi một lúc rồi thử lại.';
    case 500:
      return 'Lỗi server 500: Gemini API gặp sự cố nội bộ. Có thể do file quá lớn hoặc định dạng không tương thích. Thử lại với file nhỏ hơn.';
    case 502:
    case 503:
    case 504:
      return 'Lỗi server tạm thời: Gemini API đang quá tải. Vui lòng thử lại sau vài phút.';
    default:
      if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return 'Lỗi: Đã vượt quá hạn ngạch API. Vui lòng đợi hoặc nâng cấp tài khoản.';
      }
      if (errorMessage.includes('invalid argument') || errorMessage.includes('unsupported')) {
        return 'Lỗi: Định dạng file không được hỗ trợ. Vui lòng sử dụng file MP4, MP3, WAV hoặc các định dạng được hỗ trợ.';
      }
      return `Lỗi Gemini API: ${error.message}. Vui lòng thử lại sau.`;
  }
};

/**
 * Show user-friendly error notification
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred (upload, api, etc.)
 * @param {Object} options - Additional options (fileSize, statusCode, etc.)
 */
export const showErrorNotification = (error, context = 'general', options = {}) => {
  let message = '';
  
  switch (context) {
    case 'upload':
      message = handleFileUploadError(error, options.fileSize);
      break;
    case 'api':
      message = handleGeminiApiError(error, options.statusCode);
      break;
    default:
      message = error.message || 'Đã xảy ra lỗi không xác định.';
  }
  
  // Log error for debugging
  console.error(`[${context.toUpperCase()}] Error:`, error);
  
  // You can integrate with your notification system here
  // For now, we'll just return the message
  return message;
};

/**
 * Get file size recommendations based on error
 * @param {Error} error - The error object
 * @returns {Object} - Recommendations object
 */
export const getFileSizeRecommendations = (error) => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('500') || errorMessage.includes('413')) {
    return {
      maxRecommended: 200, // MB
      optimal: 100, // MB
      tips: [
        'Nén video bằng HandBrake hoặc FFmpeg',
        'Giảm độ phân giải xuống 720p hoặc 480p',
        'Giảm bitrate video xuống 1-2 Mbps',
        'Chuyển đổi sang định dạng MP4 với codec H.264'
      ]
    };
  }
  
  return {
    maxRecommended: 1024, // MB
    optimal: 200, // MB
    tips: [
      'Sử dụng định dạng MP4 để tương thích tốt nhất',
      'Tránh video có độ phân giải quá cao (4K)',
      'Kiểm tra kết nối internet ổn định'
    ]
  };
};