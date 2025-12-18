import { parseGeminiResponse, parseTranslatedSubtitles } from '../utils/subtitleParser';
import { convertAudioForGemini, isAudioFormatSupportedByGemini } from '../utils/audioConverter';
import { getLanguageCode } from '../utils/languageUtils';
import { createSubtitleSchema, addResponseSchema } from '../utils/schemaUtils';
import i18n from '../i18n/i18n';
import { getTranscriptionRules } from '../utils/transcriptionRulesStore';

// Map to store multiple AbortControllers for parallel requests
const activeAbortControllers = new Map();

// Global flag to indicate when processing should be completely stopped
let _processingForceStopped = false;

// Getter and setter functions for the processing force stopped flag
export const getProcessingForceStopped = () => _processingForceStopped;
export const setProcessingForceStopped = (value) => {
    _processingForceStopped = value;
    console.log(`Force stop flag set to ${value}`);
};

// Default transcription prompts
export const PROMPT_PRESETS = [
    {
        id: 'general',
        title: 'Nhận diện lời nói',
        purpose: 'Transcribe all spoken content in video/audio in a general manner',
        purposeVi: 'Phiên âm tất cả nội dung nói trong video/audio một cách tổng quát',
        prompt: `You are an expert transcriber. Your task is to transcribe every possible spoken content in this ${'{contentType}'}. Format the output as a sequential transcript. Each line MUST strictly follow the format: [MMmSSsNNNms - MMmSSsNNNms] Transcribed text. For example: [00m30s000ms - 00m35s500ms] This is the transcribed speech. Always use leading zeros for minutes and seconds (e.g., 00m05s100ms, not 0m5s100ms). **CRITICAL: Break the transcription into VERY SHORT segments. Focus on natural pauses, breath breaks, and short phrases. Aim for segments that are typically only a few words long. Do NOT create long segments covering multiple sentences.** Return ONLY the formatted transcript lines. Do not include any headers, summaries, introductions, or any other text whatsoever.
IMPORTANT: If there is no speech or spoken content in the audio, return an empty array []. Do not return timestamps with empty text or placeholder text.`
    },
    {
        id: 'extract-text',
        title: 'Trích xuất phụ đề (HardSub)',
        purpose: 'Extract only on-screen text, ignoring audio content',
        purposeVi: 'Trích xuất chỉ văn bản hiển thị trên màn hình, bỏ qua âm thanh',
        prompt: `Your task is to extract only the visible text and/or hardcoded subtitles appearing on screen within this ${'{contentType}'}. Completely ignore all audio content. Format the output as a sequential transcript showing exactly when the text appears and disappears. Each line MUST strictly follow the format: [MMmSSsNNNms - MMmSSsNNNms] Extracted on-screen text. For example: [00m30s000ms - 00m35s500ms] This text appeared on screen. Always use leading zeros for minutes and seconds (e.g., 00m05s100ms, not 0m5s100ms). **CRITICAL: Each entry MUST represent a single, distinct piece of text that appears/disappears. Keep the text per entry AS SHORT AS POSSIBLE, reflecting only what appears at that specific moment. If text elements change or update, create a new entry.** Return ONLY the formatted text entries with their timestamps. Provide absolutely no other text, headers, or explanations.
IMPORTANT: If there is no visible text in the video, return an empty array []. Do not return timestamps with empty text or placeholder text.`
    },
    {
        id: 'combined-subtitles',
        title: 'Phụ đề kết hợp',
        purpose: 'Extract both spoken content and on-screen text for comprehensive subtitle generation',
        purposeVi: 'Kết hợp cả lời nói và văn bản trên màn hình để tạo phụ đề toàn diện',
        prompt: `You are an expert subtitle extractor. Your task is to create comprehensive subtitles by combining BOTH spoken content AND visible on-screen text from this ${'{contentType}'}. This approach ensures maximum accuracy, especially for content with multiple languages or complex audio-visual elements.

**EXTRACTION STRATEGY:**
1. **Spoken Content**: Transcribe all audible speech, dialogue, and vocal content
2. **On-Screen Text**: Extract all visible text, hardcoded subtitles, captions, titles, and graphics
3. **Combination Logic**: When both spoken and visual text exist for the same content, prioritize the more accurate version or combine them for completeness
4. **Language Optimization**: Pay special attention to Chinese characters (中文), ensuring proper character recognition and spacing

**FORMATTING REQUIREMENTS:**
- Each line MUST follow: [MMmSSsNNNms - MMmSSsNNNms] Subtitle content
- Use leading zeros for all time components (e.g., 00m05s100ms, not 0m5s100ms)
- For Chinese text, maintain proper character spacing and avoid character splitting
- Break content into SHORT, natural segments (typically 3-8 words for Chinese, 5-10 words for other languages)

**CHINESE LANGUAGE OPTIMIZATION:**
- Preserve complete Chinese characters and avoid partial character recognition
- Maintain proper sentence structure and punctuation in Chinese
- Handle mixed Chinese-English content appropriately
- Ensure proper spacing between Chinese characters and other languages

**QUALITY GUIDELINES:**
- Prioritize accuracy over speed
- When in doubt between spoken vs visual text, choose the clearer/more complete version
- For overlapping content, create separate entries if they provide different information
- Maintain chronological order and logical flow

Return ONLY the formatted subtitle lines. Do not include headers, explanations, or any other text.
IMPORTANT: If there is no content to extract, return an empty array [].`
    },
    {
        id: 'focus-lyrics',
        title: 'Trích xuất lời bài hát',
        purpose: 'Transcribe only song lyrics, ignoring speech and other sounds',
        purposeVi: 'Chỉ phiên âm lời bài hát, bỏ qua lời nói và âm thanh khác',
        prompt: `Focus exclusively on the song lyrics sung in this ${'{contentType}'}. Transcribe ONLY the audible lyrics. Explicitly ignore any spoken words (dialogue, narration), background music without vocals, on-screen text, and non-lyrical sounds. Format the output as a sequential transcript. Each line MUST strictly follow the format: [MMmSSsNNNms - MMmSSsNNNms] Transcribed lyrics. For example: [00m45s100ms - 00m50s250ms] These are the lyrics being sung. Always use leading zeros for minutes and seconds (e.g., 00m05s100ms, not 0m5s100ms). **CRITICAL: Break lyrics into VERY SHORT segments, ideally reflecting individual sung phrases or even sub-phrases. Aim for segments of only a few words based on musical phrasing and pauses. Do not transcribe long lines.** Return ONLY the formatted transcript lines of lyrics, with no extra text, headers, or explanations.
IMPORTANT: If there are no sung lyrics in the audio, return an empty array []. Do not return timestamps with empty text or placeholder text.`
    },
    {
        id: 'describe-video',
        title: 'Mô tả video',
        purpose: 'Describe visual events and actions occurring in the video',
        purposeVi: 'Mô tả các sự kiện hình ảnh và hành động diễn ra trong video',
        prompt: `Describe the significant visual events, actions, and scene changes occurring in this ${'{contentType}'} in chronological order. Focus solely on what is visually happening on screen. Format the output as a descriptive log. Each line MUST strictly follow the format: [MMmSSsNNNms - MMmSSsNNNms] Visual description. For example: [00m30s000ms - 00m35s500ms] A person walks across the screen. Always use leading zeros for minutes and seconds (e.g., 00m05s100ms, not 0m5s100ms). **CRITICAL: Descriptions MUST be VERY concise and tied to specific, brief visual moments or changes. Break down actions into their smallest distinct parts. For example, instead of 'Man walks to the door and opens it', use two lines: '[...] Man walks to door.' and '[...] Man opens door.' Aim for minimal words per entry.** Return ONLY the formatted descriptions with their timestamps. Do not include any audio transcription, headers, or other commentary.\nIMPORTANT: If the video is blank or has no significant visual content, return an empty array []. Do not return timestamps with empty text or placeholder text.`
    },
    {
        id: 'chaptering',
        title: 'Phân chương',
        purpose: 'Divide video into chapters based on topics and content changes',
        purposeVi: 'Phân chia video thành các chương dựa trên chủ đề và thay đổi nội dung',
        prompt: `You are an expert content analyst. Your task is to analyze this ${'{contentType}'} and identify distinct chapters or thematic segments based on major topic shifts or significant changes in activity/scene. Format the output as a sequential list, with each chapter on a new line. Each line MUST strictly follow the format: [HH:MM:SS] Chapter Title (5-7 words max) :: Chapter Summary (1-2 sentences). Use the specific timestamp format [HH:MM:SS] (hours, minutes, seconds) representing the chapter's start time. Use ' :: ' (space, two colons, space) as the separator between the title and the summary.
Example of two chapter lines:
[00:05:15] Introduction to Topic :: This chapter introduces the main subject discussed and sets the stage for later details.
[00:15:30] Exploring Detail A :: The speaker dives into the first major detail, providing supporting examples.
Ensure titles are concise (5-7 words max) and summaries are brief (1-2 sentences). Focus on major segmentation points. Return ONLY the formatted chapter lines following this exact single-line structure. Do not include any introductory text, concluding remarks, blank lines, lists, or any other text or formatting.`
    },
    {
        id: 'diarize-speakers',
        title: 'Nhận diện người nói',
        purpose: 'Transcribe and identify speakers for each segment',
        purposeVi: 'Phiên âm và xác định người nói cho từng đoạn',
        prompt: `You are an expert transcriber capable of speaker identification (diarization). Your task is to transcribe the spoken content in this ${'{contentType}'} AND identify who is speaking for each segment. Assign generic labels like 'Speaker 1', 'Speaker 2', etc., consistently throughout the transcript if specific names are not clearly identifiable or mentioned. Format the output as a sequential transcript. Each line MUST strictly follow the format: Speaker Label [MMmSSsNNNms - MMmSSsNNNms] Transcribed text. Example: Speaker 1 [0m5s123ms - 0m10s456ms] This is what the first speaker said. Each entry must represent a continuous segment from a single speaker. **CRITICAL: Within each speaker's turn, break the transcription into VERY SHORT segments. Focus intensely on natural pauses, breath breaks, and short phrases. Aim for segments containing only a few words each. Do NOT combine multiple phrases or sentences into one long segment.** Return ONLY the formatted speaker transcript lines following this exact structure. Do not include headers, speaker inventories, introductions, summaries, or any other text or formatting.`
    }
];

// Default transcription prompt that will be used if no custom prompt is set
export const DEFAULT_TRANSCRIPTION_PROMPT = PROMPT_PRESETS[0].prompt;

// Helper function to get saved user presets
export const getUserPromptPresets = () => {
    try {
        const savedPresets = localStorage.getItem('user_prompt_presets');
        return savedPresets ? JSON.parse(savedPresets) : [];
    } catch (error) {
        console.error('Error loading user prompt presets:', error);
        return [];
    }
};

// Helper function to save user presets
export const saveUserPromptPresets = (presets) => {
    try {
        localStorage.setItem('user_prompt_presets', JSON.stringify(presets));
    } catch (error) {
        console.error('Error saving user prompt presets:', error);
    }
};

// Function to abort all ongoing Gemini API requests
export const abortAllRequests = () => {
    if (activeAbortControllers.size > 0) {
        console.log(`Aborting all ongoing Gemini API requests (${activeAbortControllers.size} active)`);

        // Set the global flag to indicate processing should be completely stopped
        setProcessingForceStopped(true);

        // Abort all controllers in the map
        for (const [id, controller] of activeAbortControllers.entries()) {
            console.log(`Aborting request ID: ${id}`);
            controller.abort();
        }

        // Clear the map
        activeAbortControllers.clear();

        // Dispatch an event to notify components that requests have been aborted
        window.dispatchEvent(new CustomEvent('gemini-requests-aborted'));

        return true;
    }
    return false;
};

// Function to force refresh the prompt
export const forceRefreshPrompt = () => {
    console.log('Force refreshing prompt...');
    // This function can be used to trigger a prompt refresh if needed
    // For now, it just logs the action
};

// Get the active prompt (either from localStorage or default)
const getTranscriptionPrompt = (contentType) => {
    // Get custom prompt from localStorage or use default
    const customPrompt = localStorage.getItem('transcription_prompt');

    // Get the transcription rules if available
    const transcriptionRules = getTranscriptionRules();

    // Get target language for translation prompts
    const targetLanguage = localStorage.getItem('translation_target_language') || 'Tiếng Việt';

    console.log('Debug - customPrompt:', customPrompt);
    console.log('Debug - targetLanguage:', targetLanguage);

    // Base prompt (either session-specific, custom, or default)
    let basePrompt;
    if (customPrompt && customPrompt.trim() !== '') {
        basePrompt = customPrompt.replace('{contentType}', contentType);
    } else {
        basePrompt = PROMPT_PRESETS[0].prompt.replace('{contentType}', contentType);
    }

    console.log('Debug - basePrompt before replacement:', basePrompt);

    // Replace TARGET_LANGUAGE placeholder if it exists and target language is set
    if (basePrompt.includes('TARGET_LANGUAGE') && targetLanguage) {
        basePrompt = basePrompt.replace(/TARGET_LANGUAGE/g, targetLanguage);
        console.log('Debug - basePrompt after replacement:', basePrompt);
    }

    // If we have transcription rules, append them to the prompt
    if (transcriptionRules) {
        let rulesText = '\n\nAdditional transcription rules to follow:\n';

        // Add atmosphere if available
        if (transcriptionRules.atmosphere) {
            rulesText += `\n- Atmosphere: ${transcriptionRules.atmosphere}\n`;
        }

        // Add terminology if available
        if (transcriptionRules.terminology && transcriptionRules.terminology.length > 0) {
            rulesText += '\n- Terminology and Proper Nouns:\n';
            transcriptionRules.terminology.forEach(term => {
                rulesText += `  * ${term.term}: ${term.definition}\n`;
            });
        }

        // Add speaker identification if available
        if (transcriptionRules.speakerIdentification && transcriptionRules.speakerIdentification.length > 0) {
            rulesText += '\n- Speaker Identification:\n';
            transcriptionRules.speakerIdentification.forEach(speaker => {
                rulesText += `  * ${speaker.speakerId}: ${speaker.description}\n`;
            });
        }

        // Add formatting conventions if available
        if (transcriptionRules.formattingConventions && transcriptionRules.formattingConventions.length > 0) {
            rulesText += '\n- Formatting and Style Conventions:\n';
            transcriptionRules.formattingConventions.forEach(convention => {
                rulesText += `  * ${convention}\n`;
            });
        }

        // Add spelling and grammar rules if available
        if (transcriptionRules.spellingAndGrammar && transcriptionRules.spellingAndGrammar.length > 0) {
            rulesText += '\n- Spelling, Grammar, and Punctuation:\n';
            transcriptionRules.spellingAndGrammar.forEach(rule => {
                rulesText += `  * ${rule}\n`;
            });
        }

        // Add relationships if available
        if (transcriptionRules.relationships && transcriptionRules.relationships.length > 0) {
            rulesText += '\n- Relationships and Social Hierarchy:\n';
            transcriptionRules.relationships.forEach(relationship => {
                rulesText += `  * ${relationship}\n`;
            });
        }

        // Add additional notes if available
        if (transcriptionRules.additionalNotes && transcriptionRules.additionalNotes.length > 0) {
            rulesText += '\n- Additional Notes:\n';
            transcriptionRules.additionalNotes.forEach(note => {
                rulesText += `  * ${note}\n`;
            });
        }

        // Append the rules to the base prompt
        return basePrompt + rulesText;
    }

    // Return the base prompt if no rules are available
    return basePrompt;
};

export const callGeminiApi = async (input, inputType) => {
    const geminiApiKey = localStorage.getItem('gemini_api_key');
    const MODEL = localStorage.getItem('gemini_model') || "gemini-2.5-flash";

    // Dispatch progress update event
    const dispatchProgress = (progress, message) => {
        window.dispatchEvent(new CustomEvent('processing-progress', {
            detail: { progress, message }
        }));
    };

    let requestData = {
        model: MODEL,
        contents: []
    };

    // Always use structured output for subtitle transcription
    const isUserProvided = false; // This will be true when user provides their own subtitles
    requestData = addResponseSchema(requestData, createSubtitleSchema(isUserProvided), isUserProvided);

    if (inputType === 'youtube') {
        requestData.contents = [
            {
                role: "user",
                parts: [
                    { text: getTranscriptionPrompt('video') },
                    {
                        fileData: {
                            fileUri: input
                        }
                    }
                ]
            }
        ];
    } else if (inputType === 'video' || inputType === 'audio' || inputType === 'file-upload') {
        // Determine if this is a video or audio file
        const isAudio = input.type.startsWith('audio/');
        const contentType = isAudio ? 'audio' : 'video';

        // For audio files, convert to a format supported by Gemini
        let processedInput = input;
        if (isAudio) {
            console.log('Processing audio file:', input.name);
            console.log('Audio file type:', input.type);
            console.log('Audio file size:', input.size);

            // Check if the audio format is supported by Gemini
            if (!isAudioFormatSupportedByGemini(input)) {
                console.warn('Audio format not directly supported by Gemini API, attempting conversion');
            }

            // Convert the audio file to a supported format
            processedInput = await convertAudioForGemini(input);
            console.log('Processed audio file type:', processedInput.type);
        }

        const base64Data = await fileToBase64(processedInput);

        // Use the MIME type from the processed input
        const mimeType = processedInput.type;

        requestData.contents = [
            {
                role: "user",
                parts: [
                    { text: getTranscriptionPrompt(contentType) },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ];
    }

    // Create a unique ID for this request
    const requestId = `api_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        // Log request data for debugging (without the actual base64 data to keep logs clean)
        console.log('Gemini API request model:', MODEL);
        console.log('Request MIME type:', inputType === 'file-upload' ? input.type : 'N/A');
        console.log('Using structured output:', true);

        // Update progress to 60% - preparing to send request
        dispatchProgress(60, i18n.t('output.preparingRequest', 'Đang chuẩn bị gửi yêu cầu đến Gemini...'));

        // Create a deep copy of the request data for logging
        const debugRequestData = JSON.parse(JSON.stringify(requestData));
        if (debugRequestData.contents && debugRequestData.contents[0] && debugRequestData.contents[0].parts) {
            for (let i = 0; i < debugRequestData.contents[0].parts.length; i++) {
                const part = debugRequestData.contents[0].parts[i];
                if (part.inlineData && part.inlineData.data) {
                    debugRequestData.contents[0].parts[i] = {
                        ...part,
                        inlineData: {
                            ...part.inlineData,
                            data: '[BASE64_DATA]'
                        }
                    };
                }
            }
        }
        console.log('Gemini API request structure:', debugRequestData);

        // Create a new AbortController for this request
        const controller = new AbortController();
        activeAbortControllers.set(requestId, controller);
        const signal = controller.signal;

        // Update progress to 70% - sending request
        dispatchProgress(70, i18n.t('output.sendingRequest', 'Đang gửi yêu cầu đến Gemini API...'));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
                signal: signal // Add the AbortController signal
            }
        );

        if (!response.ok) {
            try {
                // Clone the response before reading it to avoid the "body stream already read" error
                const responseClone = response.clone();
                try {
                    const errorData = await response.json();
                    console.error(i18n.t('errors.geminiApiError', 'Gemini API error details'), errorData);

                    // Log more detailed information about the error
                    let detailedErrorMessage = '';
                    if (errorData.error) {
                        console.error(i18n.t('errors.geminiApiErrorCode', 'Error code'), errorData.error.code);
                        console.error(i18n.t('errors.geminiApiErrorMessage', 'Error message'), errorData.error.message);
                        console.error(i18n.t('errors.geminiApiErrorStatus', 'Error status'), errorData.error.status);
                        
                        // Store detailed error message for user display
                        detailedErrorMessage = errorData.error.message || '';

                        // Check for specific error messages related to audio/video processing
                        if (errorData.error.message.includes('invalid argument')) {
                            console.error(i18n.t('errors.unsupportedFileFormat', 'This may be due to an unsupported file format or MIME type'));
                            console.error(i18n.t('errors.supportedAudioFormats', 'Supported audio formats: audio/wav, audio/mp3, audio/aiff, audio/aac, audio/ogg, audio/flac'));
                            console.error(i18n.t('errors.fileTypeUsed', 'File type used'), input.type);
                        }
                    }

                    // Analyze detailed error message for specific issues
                    let specificSuggestion = '';
                    if (detailedErrorMessage) {
                        if (detailedErrorMessage.includes('API key not valid') || detailedErrorMessage.includes('API_KEY_INVALID')) {
                            specificSuggestion = '\n\n🔑 Nguyên nhân: API key không hợp lệ\n💡 Giải pháp: Kiểm tra lại API key trong Settings, đảm bảo copy đầy đủ không thiếu ký tự';
                        } else if (detailedErrorMessage.includes('quota') || detailedErrorMessage.includes('RATE_LIMIT_EXCEEDED')) {
                            specificSuggestion = '\n\n⏱️ Nguyên nhân: Đã vượt quá giới hạn sử dụng (quota)\n💡 Giải pháp: Đợi vài phút rồi thử lại, hoặc nâng cấp gói API';
                        } else if (detailedErrorMessage.includes('not found') || detailedErrorMessage.includes('NOT_FOUND')) {
                            specificSuggestion = '\n\n🔍 Nguyên nhân: Model không tồn tại hoặc đã ngừng hỗ trợ\n💡 Giải pháp: Chọn model khác trong Settings\n   Khuyên dùng: Gemini 2.5 Flash hoặc Gemini 2.5 Flash Lite';
                        } else if (detailedErrorMessage.includes('billing') || detailedErrorMessage.includes('BILLING_NOT_ACTIVE')) {
                            specificSuggestion = '\n\n💳 Nguyên nhân: Chưa kích hoạt billing\n💡 Giải pháp: Kích hoạt billing trong Google Cloud Console';
                        } else if (detailedErrorMessage.includes('region') || detailedErrorMessage.includes('REGION_NOT_SUPPORTED')) {
                            specificSuggestion = '\n\n🌍 Nguyên nhân: Region không được hỗ trợ\n💡 Giải pháp: Sử dụng VPN hoặc tạo API key từ region được hỗ trợ';
                        }
                    }

                    // Provide Vietnamese error messages based on status code
                    if (response.status === 403) {
                        const baseMessage = '🚫 LỖI 403: Truy cập bị từ chối';
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}${specificSuggestion}` 
                            : `${baseMessage}\n\nAPI key không hợp lệ, đã hết hạn, hoặc đã vượt quá giới hạn sử dụng.\nVui lòng kiểm tra lại API key trong Settings.`;
                        throw new Error(i18n.t('errors.apiError403', fullMessage));
                    } else if (response.status === 404) {
                        const baseMessage = '🔍 LỖI 404: Không tìm thấy';
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}${specificSuggestion}` 
                            : `${baseMessage}\n\nModel hoặc endpoint không tồn tại.\nVui lòng kiểm tra lại cấu hình model trong Settings.`;
                        throw new Error(i18n.t('errors.apiError404', fullMessage));
                    } else if (response.status === 413) {
                        const baseMessage = '📦 LỖI 413: File quá lớn';
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}\n\n💡 Giải pháp: Nén video xuống dưới 200MB hoặc sử dụng nút "Extract Audio"` 
                            : `${baseMessage}\n\nGemini API không thể xử lý file này.\n💡 Giải pháp: Nén video xuống dưới 200MB hoặc sử dụng nút "Extract Audio"`;
                        throw new Error(i18n.t('errors.apiError413', fullMessage));
                    } else if (response.status === 500) {
                        const baseMessage = '⚠️ LỖI 500: Lỗi server';
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}\n\n💡 Giải pháp: File quá lớn hoặc định dạng không tương thích. Thử lại với file nhỏ hơn` 
                            : `${baseMessage}\n\nGemini API gặp sự cố nội bộ.\n💡 Giải pháp: Thử lại với file nhỏ hơn hoặc đổi sang model khác`;
                        throw new Error(i18n.t('errors.apiError500', fullMessage));
                    } else if (response.status === 429) {
                        const baseMessage = '⏱️ LỖI 429: Vượt quá giới hạn';
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}\n\n💡 Giải pháp: Đợi 1-2 phút rồi thử lại` 
                            : `${baseMessage}\n\nĐã vượt quá giới hạn API (rate limit).\n💡 Giải pháp: Đợi 1-2 phút rồi thử lại`;
                        throw new Error(i18n.t('errors.apiError429', fullMessage));
                    } else if (response.status === 400) {
                        const baseMessage = '❌ LỖI 400: Yêu cầu không hợp lệ';
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}${specificSuggestion}` 
                            : `${baseMessage}\n\nĐịnh dạng file không được hỗ trợ hoặc API key không đúng.\n💡 Giải pháp: Kiểm tra lại file và API key`;
                        throw new Error(i18n.t('errors.apiError400', fullMessage));
                    } else {
                        const baseMessage = `⚠️ LỖI ${response.status}: ${response.statusText}`;
                        const fullMessage = detailedErrorMessage 
                            ? `${baseMessage}\n\n📋 Chi tiết từ Gemini API:\n${detailedErrorMessage}${specificSuggestion}` 
                            : `${baseMessage}\n\nVui lòng thử lại sau.`;
                        throw new Error(i18n.t('errors.apiErrorGeneric', fullMessage));
                    }
                } catch (jsonError) {
                    console.error(i18n.t('errors.geminiApiErrorJson', 'Error parsing Gemini API error response as JSON'), jsonError);
                    const errorText = await responseClone.text();
                    console.error(i18n.t('errors.geminiApiRawError', 'Raw error response'), errorText);
                    throw new Error(i18n.t('errors.apiErrorParsing', `Lỗi API ${response.status}: Không thể xử lý phản hồi từ server. Vui lòng thử lại.`));
                }
            } catch (error) {
                console.error(i18n.t('errors.geminiApiErrorHandling', 'Error handling Gemini API error response'), error);
                throw new Error(i18n.t('errors.apiErrorHandling', `Lỗi xử lý API ${response.status}: ${response.statusText}. Vui lòng thử lại sau.`));
            }
        }

        // Update progress to 85% - processing response
        dispatchProgress(85, i18n.t('output.processingResponse', 'Đang xử lý phản hồi từ Gemini...'));

        const data = await response.json();
        console.log('Gemini API response:', data);

        // Remove this controller from the map after successful response
        activeAbortControllers.delete(requestId);

        // Update progress to 95% - parsing response
        dispatchProgress(95, i18n.t('output.parsingSubtitles', 'Đang phân tích phụ đề...'));

        return await parseGeminiResponse(data);
    } catch (error) {
        // Check if this is an AbortError
        if (error.name === 'AbortError') {
            console.log('Gemini API request was aborted');
            throw new Error('Request was aborted');
        } else {
            console.error(i18n.t('errors.geminiApiCall', 'Error calling Gemini API'), error);
            // Remove this controller from the map on error
            if (requestId) {
                activeAbortControllers.delete(requestId);
            }
            throw error;
        }
    }
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
};

// Default prompts for different operations
export const getDefaultTranslationPrompt = (subtitleText, targetLanguage, multiLanguage = false) => {
    const languageName = getLanguageCode(targetLanguage) || targetLanguage;

    let prompt = `You are a professional subtitle translator. Below is a list of subtitles in JSON format. Your task is to translate the "text" of each subtitle into ${languageName}.

CRITICAL INSTRUCTIONS:
1. Translate ONLY the value of the "text" key for each object.
2. Preserve the original "id", "startTime" and "endTime" values EXACTLY as they are.
3. Ensure the translated text is natural and easy to read.
4. The output MUST be a valid JSON array with proper escaping.
5. Do NOT add, remove, or alter any keys in the JSON objects.
6. Do NOT include any explanations, comments, or additional text.
7. Do NOT wrap the response in code blocks.
8. Escape any quotes or special characters in the translated text properly.
9. Return ONLY the translated JSON array.

Example input:
[
    { "id": 1, "startTime": "0m1s234ms", "endTime": "0m3s456ms", "text": "Hello world" },
    { "id": 2, "startTime": "0m4s123ms", "endTime": "0m5s789ms", "text": "This is an example" }
]

Example output for Vietnamese:
[
    { "id": 1, "startTime": "0m1s234ms", "endTime": "0m3s456ms", "text": "Xin chào thế giới" },
    { "id": 2, "startTime": "0m4s123ms", "endTime": "0m5s789ms", "text": "Đây là một ví dụ" }
]

IMPORTANT: Make sure all quotes in the translated text are properly escaped. If the text contains quotes, use \\" instead of ".

Now, please translate the following subtitles into ${languageName}:
${subtitleText}`;

    if (multiLanguage) {
        prompt += `
The following subtitles contain multiple languages. Please translate all text into ${languageName}.
`;
    }

    return prompt;
};

export const getDefaultConsolidatePrompt = (subtitlesText, language = null) => {
    const languageContext = language ? ` The original language of the subtitles is ${language}.` : '';

    return `You are an expert subtitle editor. I have a list of subtitles that are overly segmented. Your task is to consolidate them into a more readable format by merging short, consecutive subtitles into longer, more natural sentences or phrases. The output should be a single block of text.
    
IMPORTANT INSTRUCTIONS:
1.  Merge segments that logically flow together.
2.  Ensure the final output is a single block of text.
3.  Do NOT alter the text itself, only merge the segments.
4.  Return ONLY the consolidated text. Do not include any extra text or explanations.
5.  The subtitles should be easy to read and make sense grammatically.${languageContext}

Here are the subtitles to consolidate:
${subtitlesText}
`;
};

export const getDefaultSummarizePrompt = (subtitlesText, language = null) => {
    const languageContext = language ? ` The language of the subtitles is ${language}.` : '';

    return `You are a text summarization expert. Based on the provided subtitles, generate a concise, well-structured summary of the content.

IMPORTANT INSTRUCTIONS:
1.  The summary should be between 100 and 200 words.
2.  It should capture the main points and key takeaways from the content.
3.  The tone should be neutral and informative.
4.  The output should be a single block of text (a string), not a list or bullet points.
5.  Do not include any introductory phrases like "This is a summary of the text". Just provide the summary directly.${languageContext}

Here are the subtitles to summarize:
${subtitlesText}
`;
};

// Function to translate subtitles to a different language while preserving timing
// Added optional options param to control UI status dispatching
const translateSubtitles = async (
    subtitles,
    targetLanguage,
    model = 'gemini-2.0-flash',
    customPrompt = null,
    splitDuration = 0,
    options = {}
) => {
    const { suppressStatus = false } = options || {};
    const dispatchTranslationProgress = (progress, message) => {
        if (suppressStatus) return;
        try {
            window.dispatchEvent(new CustomEvent('translation-status', {
                detail: { message, progress }
            }));
        } catch (_) {
            // no-op in non-browser environments
        }
    };
    // Store the target language for reference
    localStorage.setItem('translation_target_language', targetLanguage);
    if (!subtitles || subtitles.length === 0) {
        throw new Error('No subtitles to translate');
    }

    // Create a map of original subtitles with their IDs for reference
    const originalSubtitlesMap = {};
    subtitles.forEach(sub => {
        // Ensure each subtitle has a unique ID
        const id = sub.id || subtitles.indexOf(sub) + 1;
        originalSubtitlesMap[id] = sub;
    });

    // Store the original subtitles map in localStorage for reference
    localStorage.setItem('original_subtitles_map', JSON.stringify(originalSubtitlesMap));

    // If splitDuration is specified and not 0, split subtitles into chunks based on duration
    if (splitDuration > 0) {
        console.log(`Splitting translation into chunks of ${splitDuration} seconds`);
        // Dispatch event to update UI with status
        const message = i18n.t('translation.splittingSubtitles', 'Splitting {{count}} subtitles into chunks of {{duration}} seconds', {
            count: subtitles.length,
            duration: splitDuration
        });
        dispatchTranslationProgress(10, message);
        return await translateSubtitlesByChunks(subtitles, targetLanguage, model, customPrompt, splitDuration);
    }

    // Format subtitles as a JSON string for Gemini
    const subtitleText = JSON.stringify(subtitles, null, 2);

    // Create the prompt for translation
    let translationPrompt;
    if (customPrompt) {
        // Replace variables in the custom prompt
        translationPrompt = customPrompt
            .replace('{subtitlesText}', subtitleText)
            .replace('{targetLanguage}', targetLanguage);
    } else {
        translationPrompt = getDefaultTranslationPrompt(subtitleText, targetLanguage);
    }

    console.log('Translation prompt:', translationPrompt);
    console.log('Subtitle text length:', subtitleText.length);
    console.log('Target language:', targetLanguage);

    // Initial progress updates for non-split translation flow
    dispatchTranslationProgress(5, i18n.t('translation.translating', 'Đang dịch...'));
    dispatchTranslationProgress(15, i18n.t('output.preparingRequest', 'Đang chuẩn bị gửi yêu cầu đến Gemini...'));

    // Create a unique ID for this request
    const requestId = `translation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        // Get API key from localStorage
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            throw new Error('Gemini API key not found');
        }

        // Use the model parameter passed to the function
        // This allows for model selection specific to translation
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Create a new AbortController for this request
        const controller = new AbortController();
        activeAbortControllers.set(requestId, controller);
        const signal = controller.signal;

        // Notify UI that we're sending request
        dispatchTranslationProgress(30, i18n.t('output.sendingRequest', 'Đang gửi yêu cầu đến Gemini API...'));

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: translationPrompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    topK: 32,
                    topP: 0.95,
                    maxOutputTokens: 65536, // Increased to maximum allowed value (65536 per Gemini documentation)
                },
            }),
            signal: signal // Add the AbortController signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error?.message || response.statusText;
            throw new Error(`Lỗi Gemini API dịch thuật (${response.status}): ${errorMsg}. Vui lòng kiểm tra file và thử lại.`);
        }

        // Response received, update progress
        dispatchTranslationProgress(70, i18n.t('output.processingResponse', 'Đang xử lý phản hồi từ Gemini...'));

        const data = await response.json();
        const translatedText = data.candidates[0]?.content?.parts[0]?.text;

        console.log('Gemini response data:', data);
        console.log('Translated text from Gemini:', translatedText);
        console.log('Translated text type:', typeof translatedText);
        console.log('Translated text length:', translatedText ? translatedText.length : 'null');

        if (!translatedText) {
            throw new Error('No translation returned from Gemini');
        }

        // Remove this controller from the map after successful response
        activeAbortControllers.delete(requestId);

        // Parse the translated subtitles
        dispatchTranslationProgress(90, i18n.t('output.parsingSubtitles', 'Đang phân tích phụ đề...'));
        const result = parseTranslatedSubtitles(translatedText);
        dispatchTranslationProgress(100, i18n.t('translation.translationComplete', 'Translation completed for all {{count}} chunks', { count: 1 }));
        return result;
    } catch (error) {
        // Check if this is an AbortError
        if (error.name === 'AbortError') {
            console.log('Translation request was aborted');
            throw new Error('Translation request was aborted');
        } else {
            console.error(i18n.t('errors.translationError', 'Translation error'), error);
            // Remove this controller from the map on error
            if (requestId) {
                activeAbortControllers.delete(requestId);
            }
            // Notify UI about failure
            dispatchTranslationProgress(100, i18n.t('translation.error', 'Error translating subtitles. Please try again.'));
            throw error;
        }
    }
};

/**
 * consolidate document from subtitles text
 * @param {string} subtitlesText - Plain text content from subtitles
 * @param {string} model - Gemini model to use
 * @param {string} customPrompt - Optional custom prompt to use
 * @returns {Promise<string>} - Completed document text
 */
export const completeDocument = async (subtitlesText, model = 'gemini-2.5-flash', customPrompt = null) => {
    if (!subtitlesText || subtitlesText.trim() === '') {
        throw new Error('No text to process');
    }

    // Create a unique ID for this request
    const requestId = `document_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        // Get API key from localStorage
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            throw new Error('Gemini API key not found');
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Create a new AbortController for this request
        const controller = new AbortController();
        activeAbortControllers.set(requestId, controller);
        const signal = controller.signal;

        // Create the prompt for document completion
        let documentPrompt;
        if (customPrompt) {
            // Replace variables in the custom prompt
            documentPrompt = customPrompt.replace('{subtitlesText}', subtitlesText);
        } else {
            documentPrompt = getDefaultConsolidatePrompt(subtitlesText);
        }

        // Create request data with structured output
        let requestData = {
            model: model,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: documentPrompt }
                    ]
                }
            ]
        };

        // Add structured output schema for document consolidation
        const { createConsolidationSchema } = await import('../utils/schemaUtils');
        requestData = addResponseSchema(requestData, createConsolidationSchema());

        console.log('Document completion request:', {
            model: model,
            textLength: subtitlesText.length,
            promptLength: documentPrompt.length,
            usingStructuredOutput: true
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error?.message || response.statusText;
            throw new Error(`Lỗi Gemini API hoàn thiện tài liệu (${response.status}): ${errorMsg}. Vui lòng thử lại.`);
        }

        const data = await response.json();
        console.log('Document completion response:', data);

        // Remove this controller from the map after successful response
        activeAbortControllers.delete(requestId);

        // Parse the structured response
        if (data?.candidates?.[0]?.content?.parts?.[0]?.structuredJson) {
            const structuredJson = data.candidates[0].content.parts[0].structuredJson;
            if (structuredJson.title && structuredJson.content) {
                return structuredJson.content;
            }
        }

        // Fallback to text response
        const resultText = data.candidates[0]?.content?.parts[0]?.text;
        if (!resultText) {
            throw new Error('No text returned from Gemini API');
        }

        return resultText;
    } catch (error) {
        // Check if this is an AbortError
        if (error.name === 'AbortError') {
            console.log('Document completion request was aborted');
            throw new Error('Request was aborted');
        } else {
            console.error('Error completing document:', error);
            // Remove this controller from the map on error
            if (requestId) {
                activeAbortControllers.delete(requestId);
            }
            throw error;
        }
    }
};

/**
 * Summarize document from subtitles text
 * @param {string} subtitlesText - Plain text content from subtitles
 * @param {string} model - Gemini model to use
 * @param {string} customPrompt - Optional custom prompt to use
 * @returns {Promise<string>} - Summarized document text
 */
export const summarizeDocument = async (subtitlesText, model = 'gemini-2.0-flash', customPrompt = null) => {
    if (!subtitlesText || subtitlesText.trim() === '') {
        throw new Error('No text to process');
    }

    // Create a unique ID for this request
    const requestId = `summary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
        // Get API key from localStorage
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            throw new Error('Gemini API key not found');
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Create a new AbortController for this request
        const controller = new AbortController();
        activeAbortControllers.set(requestId, controller);
        const signal = controller.signal;

        // Create the prompt for document summarization
        let summaryPrompt;
        if (customPrompt) {
            // Replace variables in the custom prompt
            summaryPrompt = customPrompt.replace('{subtitlesText}', subtitlesText);
        } else {
            summaryPrompt = getDefaultSummarizePrompt(subtitlesText);
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: summaryPrompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    topK: 32,
                    topP: 0.95,
                    maxOutputTokens: 65536, // Increased to maximum allowed value (65536 per Gemini documentation)
                },
            }),
            signal: signal // Add the AbortController signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.error?.message || response.statusText;
            throw new Error(`Lỗi Gemini API tóm tắt (${response.status}): ${errorMsg}. Vui lòng thử lại với nội dung ngắn hơn.`);
        }

        const data = await response.json();
        const summarizedText = data.candidates[0]?.content?.parts[0]?.text;

        if (!summarizedText) {
            throw new Error('No summary returned from Gemini');
        }

        // Remove this controller from the map after successful response
        activeAbortControllers.delete(requestId);

        return summarizedText;
    } catch (error) {
        // Check if this is an AbortError
        if (error.name === 'AbortError') {
            console.log('Summary request was aborted');
            throw new Error('Summary request was aborted');
        } else {
            console.error('Summary error:', error);
            // Remove this controller from the map on error
            if (requestId) {
                activeAbortControllers.delete(requestId);
            }
            throw error;
        }
    }
};

/**
 * Split subtitles into chunks based on duration and translate each chunk
 * @param {Array} subtitles - Subtitles to translate
 * @param {string} targetLanguage - Target language
 * @param {string} model - Gemini model to use
 * @param {string} customPrompt - Custom prompt for translation
 * @param {number} splitDuration - Duration in seconds for each chunk
 * @returns {Promise<Array>} - Array of translated subtitles
 */
const translateSubtitlesByChunks = async (subtitles, targetLanguage, model, customPrompt, splitDuration) => {
    // splitDuration is already in seconds, no need to convert
    const splitDurationSeconds = splitDuration;

    // Group subtitles into chunks based on their timestamps
    const chunks = [];
    let currentChunk = [];
    let chunkStartTime = subtitles[0]?.start || 0;

    for (let i = 0; i < subtitles.length; i++) {
        const subtitle = subtitles[i];

        // If this subtitle would exceed the chunk duration, start a new chunk
        if (subtitle.start - chunkStartTime >= splitDurationSeconds && currentChunk.length > 0) {
            chunks.push([...currentChunk]);
            currentChunk = [];
            chunkStartTime = subtitle.start;
        }

        currentChunk.push(subtitle);
    }

    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    console.log(`Split ${subtitles.length} subtitles into ${chunks.length} chunks with ${splitDurationSeconds}s duration`);

    // Dispatch event to update UI with status
    const splitMessage = i18n.t('translation.splitComplete', 'Split {{count}} subtitles into {{chunks}} chunks', {
        count: subtitles.length,
        chunks: chunks.length
    });
    window.dispatchEvent(new CustomEvent('translation-status', {
        detail: { message: splitMessage, progress: 20 }
    }));

    // Translate each chunk
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Translating chunk ${i + 1}/${chunks.length} with ${chunk.length} subtitles`);

        // Dispatch event to update UI with status
        const chunkMessage = i18n.t('translation.translatingChunk', 'Translating chunk {{current}}/{{total}} with {{count}} subtitles', {
            current: i + 1,
            total: chunks.length,
            count: chunk.length
        });
        const progress = 20 + Math.round((i / chunks.length) * 70); // 20% to 90%
        window.dispatchEvent(new CustomEvent('translation-status', {
            detail: { message: chunkMessage, progress }
        }));

        try {
            // Call translateSubtitles with the current chunk, but with splitDuration=0 to avoid infinite recursion
            // Suppress inner status updates to keep chunk-level progress stable
            const translatedChunk = await translateSubtitles(chunk, targetLanguage, model, customPrompt, 0, { suppressStatus: true });
            translatedChunks.push(translatedChunk);
        } catch (error) {
            console.error(`Error translating chunk ${i + 1}:`, error);
            // If a chunk fails, add the original subtitles to maintain the structure
            translatedChunks.push(chunk.map(sub => ({
                ...sub,
                text: `[Translation failed] ${sub.text}`,
                language: getLanguageCode(targetLanguage)
            })));
        }
    }

    // Dispatch event to update UI with completion status
    const completionMessage = i18n.t('translation.translationComplete', 'Translation completed for all {{count}} chunks', {
        count: chunks.length
    });
    window.dispatchEvent(new CustomEvent('translation-status', {
        detail: { message: completionMessage, progress: 100 }
    }));

    // Flatten the array of translated chunks
    return translatedChunks.flat();
};

export { callGeminiApi as transcribeVideo, callGeminiApi as transcribeAudio, callGeminiApi as transcribeYouTubeVideo, translateSubtitles };