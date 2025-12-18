/**
 * Schema utilities for Gemini API structured output
 */

/**
 * Creates a schema for subtitle transcription
 * @param {boolean} isUserProvided - Whether the subtitles are user-provided
 * @returns {Object} Schema for subtitle transcription
 */
export const createSubtitleSchema = (isUserProvided = false) => {
    if (isUserProvided) {
        // For user-provided subtitles, we only need timing information
        // This simplifies the task for the model and ensures it doesn't modify the text
        return {
            type: "array",
            items: {
                type: "object",
                properties: {
                    startTime: {
                        type: "string",
                        description: "Start time in format MMmSSsNNNms (e.g., '00m00s500ms')"
                    },
                    endTime: {
                        type: "string",
                        description: "End time in format MMmSSsNNNms (e.g., '00m01s000ms')"
                    },
                    index: {
                        type: "integer",
                        description: "Index of the subtitle in the provided list (starting from 0). MUST be a valid index from the provided list."
                    }
                },
                required: ["startTime", "endTime", "index"],
                propertyOrdering: ["index", "startTime", "endTime"]
            }
        };
    } else {
        // For normal transcription, we need the full schema
        return {
            type: "array",
            items: {
                type: "object",
                properties: {
                    startTime: {
                        type: "string",
                        description: "Start time in format MMmSSsNNNms (e.g., '00m00s500ms')"
                    },
                    endTime: {
                        type: "string",
                        description: "End time in format MMmSSsNNNms (e.g., '00m01s000ms')"
                    },
                    text: {
                        type: "string",
                        description: "Transcribed text content"
                    }
                },
                required: ["startTime", "endTime", "text"],
                propertyOrdering: ["startTime", "endTime", "text"]
            }
        };
    }
};

/**
 * Creates a schema for document consolidation
 * @returns {Object} Schema for document consolidation
 */
export const createConsolidationSchema = () => {
    return {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "A concise title for the consolidated document"
            },
            content: {
                type: "string",
                description: "The consolidated document content with improved flow and readability"
            }
        },
        required: ["title", "content"],
        propertyOrdering: ["title", "content"]
    };
};

/**
 * Creates a schema for document summarization
 * @returns {Object} Schema for document summarization
 */
export const createSummarizationSchema = () => {
    return {
        type: "object",
        properties: {
            summary: {
                type: "string",
                description: "A concise summary of the main content"
            },
            keyPoints: {
                type: "array",
                items: {
                    type: "string",
                    description: "Key points from the content"
                },
                description: "List of key points extracted from the content"
            }
        },
        required: ["summary", "keyPoints"],
        propertyOrdering: ["summary", "keyPoints"]
    };
};

/**
 * Creates a schema for subtitle translation
 * @param {number} subtitleCount - Number of subtitles to translate
 * @param {string} targetLanguage - Target language for translation
 * @returns {Object} Schema for subtitle translation
 */
export const createTranslationSchema = (subtitleCount, targetLanguage) => {
    return {
        type: "array",
        items: {
            type: "object",
            properties: {
                original: {
                    type: "string",
                    description: "Original subtitle text"
                },
                translated: {
                    type: "string",
                    description: `Translation of the subtitle text to ${targetLanguage}`
                }
            },
            required: ["original", "translated"],
            propertyOrdering: ["original", "translated"]
        }
    };
};

/**
 * Adds response schema configuration to a Gemini API request
 * @param {Object} requestData - The original request data
 * @param {Object} schema - The schema to apply
 * @param {boolean} isUserProvided - Whether this is for user-provided subtitles
 * @returns {Object} Updated request data with schema
 */
export const addResponseSchema = (requestData, schema, isUserProvided = false) => {
    return {
        ...requestData,
        generationConfig: {
            ...(requestData.generationConfig || {}),
            // Use a lower temperature for user-provided subtitles to make the model more deterministic
            temperature: isUserProvided ? 0.01 : 0.2,
            topK: isUserProvided ? 1 : 32,
            topP: isUserProvided ? 0.5 : 0.95,
            maxOutputTokens: 65536,
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    };
}; 