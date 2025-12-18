import React from 'react';
import { useTranslation } from 'react-i18next';
import './ErrorDisplay.css';

const ErrorDisplay = ({ error, context = 'general', onRetry, onDismiss, fileSize }) => {
  const { t } = useTranslation();

  const getErrorIcon = () => {
    if (error.message.includes('500') || error.message.includes('server')) {
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
      );
    }
    
    if (error.message.includes('413') || error.message.includes('quá lớn')) {
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
      );
    }
    
    return (
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    );
  };

  const getErrorType = () => {
    if (error.message.includes('500')) return 'server-error';
    if (error.message.includes('413') || error.message.includes('quá lớn')) return 'file-too-large';
    if (error.message.includes('400')) return 'bad-request';
    if (error.message.includes('network') || error.message.includes('timeout')) return 'network-error';
    return 'general-error';
  };

  const getSuggestions = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'server-error':
        return [
          'Nén hoặc chia nhỏ video xuống dưới 200MB',
          'Chuyển đổi sang định dạng MP4',
          'Giảm độ phân giải video (720p hoặc 480p)',
          'Thử lại sau vài phút'
        ];
      case 'file-too-large':
        return [
          'Sử dụng HandBrake để nén video',
          'Giảm bitrate xuống 1-2 Mbps',
          'Cắt video thành các phần nhỏ hơn',
          'Sử dụng codec H.264 để tối ưu kích thước'
        ];
      case 'bad-request':
        return [
          'Kiểm tra định dạng file (MP4, MP3, WAV)',
          'Đảm bảo file không bị hỏng',
          'Thử tải lại file từ nguồn gốc'
        ];
      case 'network-error':
        return [
          'Kiểm tra kết nối internet',
          'Thử lại với mạng ổn định hơn',
          'Sử dụng file nhỏ hơn nếu mạng chậm'
        ];
      default:
        return [
          'Thử lại sau vài phút',
          'Kiểm tra kết nối internet',
          'Sử dụng file nhỏ hơn'
        ];
    }
  };

  return (
    <div className={`error-display ${getErrorType()}`}>
      <div className="error-header">
        <div className="error-icon">
          {getErrorIcon()}
        </div>
        <div className="error-title">
          {error.message.includes('500') && 'Lỗi Server (500)'}
          {error.message.includes('413') && 'File Quá Lớn (413)'}
          {error.message.includes('400') && 'Lỗi Định Dạng (400)'}
          {(!error.message.includes('500') && !error.message.includes('413') && !error.message.includes('400')) && 'Đã Xảy Ra Lỗi'}
        </div>
      </div>
      
      <div className="error-message">
        {error.message}
      </div>
      
      {fileSize && fileSize > 500 && (
        <div className="file-size-info">
          <strong>Kích thước file hiện tại:</strong> {fileSize.toFixed(1)}MB
          <br />
          <strong>Khuyến nghị:</strong> Dưới 200MB
        </div>
      )}
      
      <div className="error-suggestions">
        <h4>💡 Gợi ý khắc phục:</h4>
        <ul>
          {getSuggestions().map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
      
      <div className="error-actions">
        {onRetry && (
          <button className="retry-button" onClick={onRetry}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Thử Lại
          </button>
        )}
        {onDismiss && (
          <button className="dismiss-button" onClick={onDismiss}>
            Đóng
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;