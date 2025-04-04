// ContributionProcessor.js
// Handles the processing of user contributions with AI

import { TAG_CONFIG } from './constants.js';
// Import the AI functions needed
import { integratePersonalizedContribution } from './ai.js';

export class ContributionProcessor {
    constructor(tagManager) {
        this.tagManager = tagManager;
    }

    /**
     * Collects all tag data directly from TagManager.
     * This is simplified as TagManager should already hold the structured tag data.
     * @returns {Array} Array of tag objects including type, selections, customText, score etc.
     */
    collectTags() {
        // Assuming TagManager has a method to get all currently active/relevant tags
        // This needs to be implemented or adjusted in TagManager
        return this.tagManager.getAllTags();
    }

    /**
     * Processes contributions made on the standard/canonical view.
     * This uses a simpler AI prompt focusing only on the canonical content.
     * @param {string} canonicalContent The current canonical content.
     * @param {Array} tags Tags collected from the standard view.
     * @returns {Promise<string>} The updated canonical markdown content.
     */
    async processStandardContribution(canonicalContent, tags) {
        console.log("Processing standard contribution...");

        if (!tags || tags.length === 0) {
            console.warn("No tags provided for standard contribution.");
            return canonicalContent; // Return original content if no tags
        }

        // Format tags similar to the personalized version, but relative to canonical content
        const formattedTags = tags.map(tag => {
            const config = TAG_CONFIG[tag.tagType] || {};
            const requiresCustomText = config.requiresCustomText || false;
            const selectionText = tag.selections.map(s => `"${s.text}"`).join(', ') || 'the general paragraph area';
            const scoreText = tag.score !== 0 ? ` (Vote score: ${tag.score > 0 ? '+' + tag.score : tag.score})` : '';

            if (requiresCustomText) {
                return `  - Type: ${config.displayName || tag.tagType}
    - Reader Suggestion: ${tag.customText || 'N/A'}
    - Applied To: ${selectionText}${scoreText}
    - AI Hint: ${config.aiHint || 'Incorporate this addition.'}`;
            } else {
                return `  - Reaction: ${config.displayName || tag.tagType}
    - Applied To: ${selectionText}${scoreText}
    - AI Hint: ${config.aiHint || 'Consider this reaction.'}`;
            }
        }).join('\n');

        const prompt = `You are an expert content editor. Improve the following text based *only* on the provided user feedback (tags).

Content to Improve:
---
${canonicalContent}
---

User Feedback:
${formattedTags}

Instructions:
1.  Analyze the feedback (tags) provided.
2.  Modify the "Content to Improve" by incorporating the feedback.
    - Prioritize feedback with higher vote scores.
    - Integrate 'Addition' tags (Source, Counterpoint, Example, Clarification).
    - Adjust text based on 'Reaction' tags (Agree, Disagree, Confusing) only if the reaction clearly warrants a change.
3.  Return *only* the updated content in plain markdown format.
4.  Do not include the feedback list or any explanations in your response.
5.  If no changes are necessary based on the feedback, return the original "Content to Improve" exactly.`;

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
                return this.cleanAndFormatMarkdown(data.response);
            } else {
                throw new Error(data.error || 'Failed to get AI response for standard contribution');
            }
        } catch (error) {
            console.error("Standard AI contribution error:", error);
            throw error;
        }
    }

    /**
     * Main contribution processing method. Determines the context (standard vs. personalized)
     * and calls the appropriate AI function.
     *
     * @param {object} context - Information about the current state.
     * @param {string} context.canonicalContent - The current canonical markdown.
     * @param {boolean} context.isPersonalizedView - Flag indicating if tags were applied in personalized view.
     * @param {string} [context.personalizedContent] - Personalized markdown (if isPersonalizedView is true).
     * @param {object} [context.personalizationPrefs] - Personalization prefs (if isPersonalizedView is true).
     * @returns {Promise<string>} The updated canonical markdown content.
     */
    async contribute(context) {
        // Collect tags from the currently displayed view using TagManager
        const tags = this.collectTags();

        if (!tags || tags.length === 0) {
            throw new Error('No tags found to contribute.');
        }

        let updatedCanonicalContent;

        if (context.isPersonalizedView) {
            // Use the specific AI function for integrating from personalized view
            if (!context.personalizedContent) {
                throw new Error('Personalized content is required for contributing from personalized view.');
            }
            updatedCanonicalContent = await integratePersonalizedContribution(
                context.canonicalContent,
                context.personalizedContent,
                tags, // Tags are relative to personalizedContent
                context.personalizationPrefs
            );
        } else {
            // Use the standard contribution processing
            updatedCanonicalContent = await this.processStandardContribution(
                context.canonicalContent,
                tags // Tags are relative to canonicalContent
            );
        }

        // Return the final, updated canonical markdown
        return this.cleanAndFormatMarkdown(updatedCanonicalContent);
    }

    /**
     * Clean and format markdown content. (Kept for now, consider moving to utils)
     * @param {string} text Raw markdown text
     * @returns {string} Cleaned and formatted markdown
     */
    cleanAndFormatMarkdown(text) {
        // Basic cleaning, may need refinement based on model output
        return text
            .replace(/```[^`]*```/g, '')     // Remove code blocks with their content
            .replace(/```/g, '')             // Remove any remaining code block markers
            .replace(/^(#+)([^#\s])/gm, '$1 $2')  // Add space after # if missing
            .replace(/^\s+/gm, '')           // Remove leading spaces from all lines
            .replace(/\n{3,}/g, '\n\n')      // Normalize multiple line breaks to double
            .trim();
    }

    // Removed methods that are no longer appropriate for this class:
    // - collectTaggedParagraphs (replaced by collectTags)
    // - formParagraphGroups (grouping logic might shift or be handled differently)
    // - getAIContribution (replaced by processStandardContribution & integratePersonalizedContribution)
    // - processContributions (handled within the new contribute method)
    // - combineResults (should be handled by the caller, e.g., Sidebar/StateManager updating content)
    // - convertToMarkdown (responsibility of the caller/renderer)
    // - getAllContentElements (DOM manipulation, belongs elsewhere)
}
