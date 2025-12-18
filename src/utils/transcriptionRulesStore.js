/**
 * Store for transcription rules
 * This file is used to avoid circular dependencies and to persist transcription rules for the current video.
 * This is a simplified version for project 1 that only uses localStorage.
 */

const TRANSCRIPTION_RULES_KEY = 'transcription_rules';

/**
 * Set transcription rules in localStorage
 * @param {Object} rules - Transcription rules
 */
export const setTranscriptionRules = (rules) => {
  try {
    if (rules) {
      localStorage.setItem(TRANSCRIPTION_RULES_KEY, JSON.stringify(rules));
    } else {
      localStorage.removeItem(TRANSCRIPTION_RULES_KEY);
    }
  } catch (error) {
    console.error('Error saving transcription rules to localStorage:', error);
  }
};

/**
 * Get transcription rules from localStorage
 * @returns {Object | null} Transcription rules
 */
export const getTranscriptionRules = () => {
  try {
    const savedRules = localStorage.getItem(TRANSCRIPTION_RULES_KEY);
    if (savedRules) {
      return JSON.parse(savedRules);
    }
  } catch (error) {
    console.error('Error loading transcription rules from localStorage:', error);
  }
  return null;
};

/**
 * Clear transcription rules from localStorage
 */
export const clearTranscriptionRules = () => {
  localStorage.removeItem(TRANSCRIPTION_RULES_KEY);
}; 