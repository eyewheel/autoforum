import { StateManager } from './StateManager.js'; // Import might be needed if used directly, or pass data
import { TAG_CONFIG } from './constants.js'; // Needed for tag details in prompts

// AI Helper Functions

// Note: cleanAndFormatMarkdown is removed as it's also present in ContributionProcessor.
// We should decide on a single source of truth for it later, perhaps a utility file.

/**
 * Generates personalized content based on the original content and user preferences.
 * @param {string} canonicalContent The original/canonical markdown content.
 * @param {object} preferences User's personalization preferences (e.g., { prompt: "Explain like I'm five" }).
 * @returns {Promise<string>} Personalized markdown content.
 */
export async function personalizeContent(canonicalContent, preferences) {
    const prompt = `You are an expert in personalized content adaptation. Your task is to adapt the following content according to the user's preferences while maintaining its core meaning and educational value.

Canonical Content:
${canonicalContent}

User's personalization preferences:
${preferences.prompt} // Assuming preferences object has a 'prompt' key

Important:
1. Strictly adhere to the user's personalization prompt.
2. Provide the personalized content in plain markdown format. Use regular markdown headings (#, ##) and paragraphs.
3. Do not wrap the response in code blocks or use any special formatting beyond standard markdown.
4. Do not add any explanatory text, preambles, or apologies. Output only the personalized markdown.`;

    try {
        const response = await fetch('/api/ask-openrouter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (response.ok && data.response) {
            // The cleaning/formatting logic might still be needed depending on the model's output
            // Let's assume ContributionProcessor's cleaning handles it for now.
            return data.response; // Return raw response for now
        } else {
            throw new Error(data.error || 'Failed to get AI response during personalization');
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Integrates contributions (tags) made on a personalized view back into the canonical content.
 * @param {string} canonicalContent The current canonical markdown content.
 * @param {string} personalizedContent The personalized markdown content where tags were applied.
 * @param {Array} tags An array of tag objects applied to the personalized content.
 *                     Each tag object should contain its type, selections (text, offsets relative to personalized content),
 *                     customText (if applicable), and score.
 * @param {object} [personalizationPrefs] Optional: User's personalization preferences (e.g., { prompt: "..." }) for context.
 * @returns {Promise<string>} Updated canonical markdown content.
 */
export async function integratePersonalizedContribution(canonicalContent, personalizedContent, tags, personalizationPrefs) {

    const validTags = tags.filter(tag => {
        if (!tag) return false;
        const currentTagType = tag.tagType;
        const config = TAG_CONFIG[currentTagType];
        const isValid = config && typeof currentTagType === 'string';
        return isValid;
    });

    // Separate VALID tags into reactions and additions for clearer prompting
    const reactionTags = validTags.filter(tag => !(TAG_CONFIG[tag.tagType]?.requiresCustomText));
    const additionTags = validTags.filter(tag => TAG_CONFIG[tag.tagType]?.requiresCustomText);

    // Format reactions applied to the personalized content
    const reactionsText = reactionTags.length > 0 ?
        `Reactions (applied to Personalized Content): ${reactionTags.map(tag => {
            const config = TAG_CONFIG[tag.tagType] || {};
            const selectionText = tag.selections.map(s => `"${s.text}"`).join(', ') || 'the general paragraph area';
            const scoreText = tag.score !== 0 ? ` (Vote score: ${tag.score > 0 ? '+' + tag.score : tag.score})` : '';
            return `
  - Reaction: ${config.displayName || tag.tagType}
    - Applied To: ${selectionText}${scoreText}
    - AI Hint: ${config.aiHint || 'Consider this reaction.'}`;
        }).join('\n')}` : '';

    // Format additions applied to the personalized content
    const additionsText = additionTags.length > 0 ?
        `Additions (applied to Personalized Content): ${additionTags.map(tag => {
            const config = TAG_CONFIG[tag.tagType] || {};
            const selectionText = tag.selections.map(s => `"${s.text}"`).join(', ') || 'the general paragraph area';
            const scoreText = tag.score !== 0 ? ` (Vote score: ${tag.score > 0 ? '+' + tag.score : tag.score})` : '';
            return `
  - Type: ${config.displayName || tag.tagType}
    - Reader Suggestion: "${tag.customText || 'N/A'}"
    - Applied To: ${selectionText}${scoreText}
    - AI Hint: ${config.aiHint || 'Incorporate this addition.'}`;
        }).join('\n')}` : '';

    const personalizationInfo = personalizationPrefs?.prompt
        ? `Note: The user applied these tags while viewing a version personalized with the prompt: "${personalizationPrefs.prompt}"`
        : 'Note: The user applied these tags while viewing a personalized version of the content.';

    const prompt = `You are an expert content editor tasked with integrating feedback from a personalized view back into the original canonical text.

Original Canonical Content:
---
${canonicalContent}
---

Personalized Content (where feedback was applied):
---
${personalizedContent}
---

User Feedback (applied to the Personalized Content):
${reactionsText ? reactionsText + '\n' : ''}${additionsText}

${personalizationInfo}

Instructions:
1.  Analyze the feedback provided on the personalized content.
2.  Carefully identify the corresponding sections or ideas in the *Original Canonical Content* that the feedback relates to. This is crucial as the structure might differ.
3.  Evaluate if the feedback is relevant and beneficial for improving the *Original Canonical Content*. Prioritize feedback with higher vote scores.
4.  Modify the *Original Canonical Content* to incorporate the relevant feedback naturally.
    - For 'Addition' type tags (Source, Counterpoint, Example, Clarification): Integrate the substance of the suggestion.
    - For 'Reaction' type tags (Agree, Disagree, Confusing, etc.): Adjust the canonical text only if the reaction strongly suggests a necessary change (e.g., rephrasing confusing parts, strengthening points readers agree with if appropriate).
5.  Return *only* the updated Original Canonical Content in plain markdown format.
6.  Do not include the personalized content, the feedback list, or any explanations/apologies in your response.
7.  If no changes are deemed necessary for the canonical version based on the feedback, return the Original Canonical Content *exactly* as it was provided.`;

    try {
        const response = await fetch('/api/ask-openrouter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (response.ok && data.response) {
            // Assuming the model returns clean markdown as requested
            return data.response;
        } else {
            throw new Error(data.error || 'Failed to get AI response during contribution integration');
        }
    } catch (error) {
        throw error;
    }
}


// Note: The original contributeContent function is removed as its core logic
// will be handled within ContributionProcessor.js, which will decide whether
// to call the standard contribution prompt or integratePersonalizedContribution.
