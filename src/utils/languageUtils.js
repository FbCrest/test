/**
 * Utility functions for language handling
 */

/**
 * Map of language names to ISO language codes
 */
const languageMap = {
  'english': 'en',
  'vietnamese': 'vi',
  'chinese': 'zh',
  'japanese': 'ja',
  'spanish': 'es',
  'french': 'fr',
  'german': 'de',
  'italian': 'it',
  'portuguese': 'pt',
  'russian': 'ru',
  'arabic': 'ar',
  'hindi': 'hi',
  'thai': 'th',
  'indonesian': 'id',
  'malay': 'ms'
};

/**
 * Get the ISO language code for a given language name
 * @param {string} language - The language name (e.g., "English", "Spanish")
 * @returns {string} - The ISO language code (e.g., "en", "es")
 */
export const getLanguageCode = (language) => {
  if (!language) return 'en'; // Default to English if no language provided
  
  // Convert to lowercase for case-insensitive matching
  const normalizedLanguage = language.toLowerCase();
  
  // Return the code if it exists in our map
  if (languageMap[normalizedLanguage]) {
    return languageMap[normalizedLanguage];
  }
  
  // For languages not in our map, try to extract the first two characters
  // if they look like a language code (e.g., "en-US" -> "en")
  if (normalizedLanguage.length >= 2 && normalizedLanguage.indexOf('-') === 2) {
    return normalizedLanguage.substring(0, 2);
  }
  
  // If all else fails, return the original string
  return normalizedLanguage;
};

/**
 * Get the language name for a given ISO language code
 * @param {string} code - The ISO language code (e.g., "en", "es")
 * @returns {string} - The language name (e.g., "English", "Spanish")
 */
export const getLanguageName = (code) => {
  if (!code) return 'English'; // Default to English if no code provided
  
  // Convert to lowercase for case-insensitive matching
  const normalizedCode = code.toLowerCase();
  
  // Map of ISO language codes to language names
  const languageNames = {
    'en': 'English',
    'vi': 'Vietnamese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'id': 'Indonesian',
    'ms': 'Malay'
  };
  
  // Return the name if it exists in our map
  if (languageNames[normalizedCode]) {
    return languageNames[normalizedCode];
  }
  
  // If the code is not in our map, return the code itself
  return code;
};
