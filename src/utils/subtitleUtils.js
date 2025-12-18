/**
 * Utility functions for subtitle processing
 */

/**
 * Deduplicate and sort subtitles by start time
 * @param {Array} subtitles - Array of subtitle objects
 * @returns {Array} - Deduplicated and sorted subtitles
 */
export const deduplicateAndSortSubtitles = (subtitles) => {
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
        return [];
    }

    // Create a map to track unique subtitles by start time and text
    const uniqueMap = new Map();
    
    subtitles.forEach(subtitle => {
        if (subtitle && typeof subtitle.start === 'number' && subtitle.text) {
            const key = `${subtitle.start}-${subtitle.text.trim()}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, subtitle);
            }
        }
    });

    // Convert back to array and sort by start time
    const uniqueSubtitles = Array.from(uniqueMap.values());
    uniqueSubtitles.sort((a, b) => a.start - b.start);

    // Reassign IDs
    uniqueSubtitles.forEach((subtitle, index) => {
        subtitle.id = index + 1;
    });

    return uniqueSubtitles;
};

/**
 * Clean subtitle text by removing extra formatting
 * @param {string} text - Subtitle text to clean
 * @returns {string} - Cleaned subtitle text
 */
export const cleanSubtitleText = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove SRT formatting that might be embedded
    let cleaned = text
        .replace(/^\d+\s*$/gm, '') // Remove standalone numbers (SRT entry numbers)
        .replace(/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}\s*$/gm, '') // Remove timestamp lines
        .replace(/^\s*\[\s*\d+m\d+s\d+ms\s*-\s*\d+m\d+s\d+ms\s*\]\s*$/gm, '') // Remove bracket timestamp lines
        .trim();

    // Remove extra whitespace and normalize line breaks
    cleaned = cleaned
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n\s*\n/g, '\n')
        .trim();

    return cleaned;
};

/**
 * Validate subtitle object
 * @param {Object} subtitle - Subtitle object to validate
 * @returns {boolean} - Whether the subtitle is valid
 */
export const validateSubtitle = (subtitle) => {
    if (!subtitle || typeof subtitle !== 'object') {
        return false;
    }

    // Check required properties
    if (typeof subtitle.start !== 'number' || typeof subtitle.end !== 'number') {
        return false;
    }

    if (typeof subtitle.text !== 'string') {
        return false;
    }

    // Check logical constraints
    if (subtitle.start < 0 || subtitle.end < 0) {
        return false;
    }

    if (subtitle.start >= subtitle.end) {
        return false;
    }

    return true;
};

/**
 * Merge overlapping subtitles
 * @param {Array} subtitles - Array of subtitle objects
 * @returns {Array} - Merged subtitles
 */
export const mergeOverlappingSubtitles = (subtitles) => {
    if (!Array.isArray(subtitles) || subtitles.length <= 1) {
        return subtitles;
    }

    const sorted = [...subtitles].sort((a, b) => a.start - b.start);
    const merged = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Check if current and next overlap
        if (current.end >= next.start) {
            // Merge overlapping subtitles
            current.end = Math.max(current.end, next.end);
            current.text = `${current.text}\n${next.text}`;
        } else {
            // No overlap, add current to merged and move to next
            merged.push(current);
            current = { ...next };
        }
    }

    // Add the last subtitle
    merged.push(current);

    // Reassign IDs
    merged.forEach((subtitle, index) => {
        subtitle.id = index + 1;
    });

    return merged;
}; 