/**
 * Time utility functions for subtitle processing
 */

/**
 * Convert time string in format MMmSSsNNNms to seconds
 * @param {string} timeString - Time string in format MMmSSsNNNms
 * @returns {number} - Time in seconds
 */
export const convertTimeStringToSeconds = (timeString) => {
    if (!timeString || typeof timeString !== 'string') {
        return 0;
    }

    // Match pattern: MMmSSsNNNms
    const match = timeString.match(/^(\d+)m(\d+)s(\d+)ms$/);
    if (!match) {
        console.warn(`Invalid time format: ${timeString}`);
        return 0;
    }

    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    const milliseconds = parseInt(match[3]);

    return minutes * 60 + seconds + milliseconds / 1000;
};

/**
 * Format seconds to SRT time format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatSecondsToSRTTime = (seconds) => {
    if (seconds === undefined || seconds === null) {
        return '00:00:00,000';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

/**
 * Parse time string in various formats to seconds
 * @param {string} timeString - Time string in various formats
 * @returns {number} - Time in seconds
 */
export const parseTimeString = (timeString) => {
    if (!timeString || typeof timeString !== 'string') {
        return 0;
    }

    // Try SRT format: HH:MM:SS,mmm
    const srtMatch = timeString.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
    if (srtMatch) {
        const hours = parseInt(srtMatch[1]);
        const minutes = parseInt(srtMatch[2]);
        const seconds = parseInt(srtMatch[3]);
        const milliseconds = parseInt(srtMatch[4]);
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }

    // Try MMmSSsNNNms format
    const msMatch = timeString.match(/^(\d+)m(\d+)s(\d+)ms$/);
    if (msMatch) {
        return convertTimeStringToSeconds(timeString);
    }

    // Try simple seconds format
    const secondsMatch = timeString.match(/^(\d+(?:\.\d+)?)$/);
    if (secondsMatch) {
        return parseFloat(secondsMatch[1]);
    }

    console.warn(`Unknown time format: ${timeString}`);
    return 0;
};

/**
 * Format seconds to MMmSSsNNNms format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatSecondsToMMmSSsNNNms = (seconds) => {
    if (seconds === undefined || seconds === null) {
        return '00m00s000ms';
    }
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(minutes).padStart(2, '0')}m${String(secs).padStart(2, '0')}s${String(ms).padStart(3, '0')}ms`;
}; 