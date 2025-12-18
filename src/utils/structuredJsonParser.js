/**
 * Module for parsing structured JSON responses from Gemini API
 */

import { convertTimeStringToSeconds } from './timeUtils';

/**
 * Parse structured JSON response from Gemini
 * @param {Object} response - The response from Gemini API
 * @returns {Array} - Array of subtitle objects
 */
export const parseStructuredJsonResponse = async (response) => {
    try {
        const structuredJson = response.candidates[0].content.parts[0].structuredJson;

        if (!structuredJson) {
            throw new Error('No structured JSON found in response');
        }

        // Check for translations array in the new schema format
        if (structuredJson.translations && Array.isArray(structuredJson.translations)) {
            const subtitles = [];

            for (let i = 0; i < structuredJson.translations.length; i++) {
                const item = structuredJson.translations[i];

                if (!item || !item.text) {
                    console.warn(`Skipping item ${i + 1} - missing text property`);
                    continue;
                }

                // For translations, we need to extract the translated text
                const translatedText = item.translated || item.text;

                subtitles.push({
                    id: i + 1,
                    start: 0, // Default start time for translations
                    end: 0,   // Default end time for translations
                    text: translatedText,
                    originalText: item.original || item.text
                });
            }

            return subtitles;
        }

        // If it's an array, assume it's a subtitle array
        else if (Array.isArray(structuredJson)) {
            // Log the first item to help with debugging
            if (structuredJson.length > 0) {
                console.log('First structured JSON item:', structuredJson[0]);
            }

            const subtitles = [];

            // Check if all subtitles are empty with 00m00s000ms timestamps
            let allEmpty = true;
            let emptyCount = 0;

            // Skip this check for timing-only format (with index property)
            const isTimingOnlyFormat = structuredJson.length > 0 &&
                                      structuredJson[0].index !== undefined &&
                                      structuredJson[0].startTime &&
                                      structuredJson[0].endTime;

            if (!isTimingOnlyFormat) {
                for (let i = 0; i < structuredJson.length; i++) {
                    const item = structuredJson[i];
                    if (item.startTime === '00m00s000ms' &&
                        item.endTime === '00m00s000ms' &&
                        (!item.text || item.text.trim() === '')) {
                        emptyCount++;
                    } else {
                        allEmpty = false;
                        break;
                    }
                }
            } else {
                // For timing-only format, we don't need to check for empty subtitles
                allEmpty = false;
            }

            // If all subtitles are empty or more than 90% are empty, this is likely an error
            if (allEmpty || (emptyCount > 0 && emptyCount / structuredJson.length > 0.9)) {
                if (allEmpty) {
                    console.error('All subtitles are empty with 00m00s000ms timestamps. This is likely an error.');
                    throw new Error('No valid subtitles found in the response. All subtitles have empty text and 00m00s000ms timestamps.');
                } else {
                    console.warn(`${emptyCount} out of ${structuredJson.length} subtitles are empty with 00m00s000ms timestamps.`);
                }
            }

            // Find the first non-empty subtitle to start processing from
            let startIndex = 0;
            if (!isTimingOnlyFormat) {
                for (let i = 0; i < structuredJson.length; i++) {
                    const item = structuredJson[i];
                    if (item.startTime !== '00m00s000ms' || item.endTime !== '00m00s000ms' || (item.text && item.text.trim() !== '')) {
                        startIndex = i;
                        break;
                    }
                }
            }

            for (let i = startIndex; i < structuredJson.length; i++) {
                const item = structuredJson[i];

                if (!item) {
                    console.warn(`Skipping null item at index ${i}`);
                    continue;
                }

                // Handle timing-only format (for user-provided subtitles)
                if (item.index !== undefined && item.startTime && item.endTime) {
                    try {
                        // Convert time format from MMmSSsNNNms to seconds
                        const start = convertTimeStringToSeconds(item.startTime);
                        const end = convertTimeStringToSeconds(item.endTime);

                        subtitles.push({
                            id: item.index + 1, // Use the provided index
                            start,
                            end,
                            text: '', // Empty text for timing-only format
                            originalIndex: item.index
                        });
                    } catch (error) {
                        console.error(`Error processing timing-only item ${i + 1}:`, error);
                    }
                }

                // Handle regular subtitle format
                else if (item.startTime && item.endTime) {
                    try {
                        // Convert time format from MMmSSsNNNms to seconds
                        const start = convertTimeStringToSeconds(item.startTime);
                        const end = convertTimeStringToSeconds(item.endTime);

                        // Skip empty subtitles at the beginning of the video
                        if (start === 0 && end === 0 && (!item.text || item.text.trim() === '')) {
                            continue;
                        }

                        subtitles.push({
                            id: i + 1,
                            start,
                            end,
                            text: item.text || ''
                        });
                    } catch (error) {
                        console.error(`Error processing item ${i + 1}:`, error);
                    }
                }

                // Handle simple text format (for translations or other text processing)
                else if (item.text) {
                    subtitles.push({
                        id: parseInt(item.id) || (i + 1),
                        start: 0, // Default start time
                        end: 0,   // Default end time
                        text: item.text,
                        originalId: parseInt(item.id) || (i + 1)
                    });
                }

                // Default case
                else {
                    console.warn(`Item ${i + 1} doesn't have required fields:`, JSON.stringify(item));
                }
            }

            return subtitles;
        }

        // Handle consolidation or summarization response
        if (structuredJson.title && structuredJson.content) {
            // This is a consolidated document
            return structuredJson;
        }

        if (structuredJson.summary && structuredJson.keyPoints) {
            // This is a summary
            return structuredJson;
        }

        // Unknown structure, return as is
        return structuredJson;
    } catch (error) {
        console.error('Error parsing structured JSON response:', error);
        console.error('Response was:', JSON.stringify(response).substring(0, 500) + '...');

        // Try to extract the text content as a fallback
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = response.candidates[0].content.parts[0].text;

            // Check if the text is a JSON string
            if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
                try {
                    const jsonData = JSON.parse(text);
                    if (Array.isArray(jsonData) && jsonData.length > 0) {
                        const mockResponse = {
                            candidates: [{
                                content: {
                                    parts: [{
                                        structuredJson: jsonData
                                    }]
                                }
                            }]
                        };
                        return parseStructuredJsonResponse(mockResponse);
                    }
                } catch (e) {
                    console.error('Failed to parse text as JSON in fallback:', e);
                }
            }

            // Import and use text parsing methods
            try {
                const { parseOriginalFormat, parseMillisecondsFormat, parseSingleTimestampFormat, parseBracketSpaceFormat } = await import('./subtitleParser');
                const { deduplicateAndSortSubtitles } = await import('./subtitleUtils');

                // Parse the text directly to avoid infinite recursion
                const subtitles = [];

                // Try all the text parsing methods
                subtitles.push(...parseOriginalFormat(text));
                subtitles.push(...parseMillisecondsFormat(text));
                subtitles.push(...parseSingleTimestampFormat(text));
                subtitles.push(...parseBracketSpaceFormat(text));

                if (subtitles.length > 0) {
                    return deduplicateAndSortSubtitles(subtitles);
                }
            } catch (importError) {
                console.error('Error importing parsing modules:', importError);
            }
        }

        throw new Error('Failed to parse structured JSON response: ' + error.message);
    }
}; 