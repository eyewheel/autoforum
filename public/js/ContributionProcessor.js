// ContributionProcessor.js
// Handles the processing of user contributions with AI

import { TAG_CONFIG } from './constants.js';

export class ContributionProcessor {
    constructor(tagManager) {
        this.tagManager = tagManager;
    }

    /**
     * Collects all paragraphs with tags and their tag information
     * @returns {Map} Map of paragraph IDs to their content and tags
     */
    collectTaggedParagraphs() {
        const taggedParagraphs = new Map();
        const paragraphs = document.querySelectorAll('.paragraph');

        paragraphs.forEach(paragraph => {
            const paragraphId = paragraph.id;
            const tags = this.tagManager.getTagsForParagraph(paragraphId);

            if (tags && tags.length > 0) {
                taggedParagraphs.set(paragraphId, {
                    element: paragraph,
                    text: paragraph.dataset.originalText || paragraph.textContent,
                    tags: tags.map(tag => ({
                        id: tag.id,
                        type: tag.tagType,
                        customText: tag.customText,
                        requiresCustomText: TAG_CONFIG[tag.tagType]?.requiresCustomText || false,
                        selections: tag.selections.filter(s => s.paragraphId === paragraphId)
                            .map(s => ({
                                text: s.selectedText,
                                startOffset: s.startOffset,
                                endOffset: s.endOffset
                            })),
                        score: tag.score || 0 // Include the voting score
                    }))
                });
            }
        });

        return taggedParagraphs;
    }

    /**
     * Forms paragraph groups based on tag relationships
     * @param {Map} taggedParagraphs Map of paragraphs with their tags
     * @returns {Array} Array of paragraph groups to be processed separately
     */
    formParagraphGroups(taggedParagraphs) {
        if (taggedParagraphs.size === 0) return [];

        // Step 1: Create initial groups of paragraphs that share multi-paragraph tags
        const multiParagraphTags = this.tagManager.getMultiParagraphTags();
        const groups = [];
        
        // Start with one group per paragraph
        const paragraphToGroup = new Map();
        for (const paragraphId of taggedParagraphs.keys()) {
            const group = new Set([paragraphId]);
            groups.push(group);
            paragraphToGroup.set(paragraphId, group);
        }

        // Merge groups that share a multi-paragraph tag
        for (const tag of multiParagraphTags) {
            // Get all paragraphs this tag spans
            const paragraphIds = tag.selections.map(s => s.paragraphId)
                .filter(id => taggedParagraphs.has(id)); // Only consider tagged paragraphs

            if (paragraphIds.length <= 1) continue; // Skip if not spanning multiple tagged paragraphs

            // Find the groups these paragraphs belong to
            const groupsToMerge = new Set();
            for (const id of paragraphIds) {
                if (paragraphToGroup.has(id)) {
                    groupsToMerge.add(paragraphToGroup.get(id));
                }
            }

            if (groupsToMerge.size <= 1) continue; // Already in the same group

            // Merge all groups into the first one
            const groupsArray = Array.from(groupsToMerge);
            const targetGroup = groupsArray[0];
            
            for (let i = 1; i < groupsArray.length; i++) {
                const sourceGroup = groupsArray[i];
                // Add all paragraphs from source to target
                for (const id of sourceGroup) {
                    targetGroup.add(id);
                    paragraphToGroup.set(id, targetGroup);
                }
                // Remove the source group
                const index = groups.indexOf(sourceGroup);
                if (index > -1) {
                    groups.splice(index, 1);
                }
            }
        }

        // Step 2: Convert the Sets to objects with paragraph data
        return groups.map(group => {
            const paragraphIds = Array.from(group);
            const paragraphs = paragraphIds.map(id => {
                return {
                    id,
                    ...taggedParagraphs.get(id)
                };
            });
            
            return {
                paragraphIds,
                paragraphs
            };
        });
    }

    /**
     * Makes an API call to get AI contribution for a group of paragraphs
     * @param {Object} group Group of paragraphs to send to AI
     * @returns {Promise<string>} AI's response with the improved paragraphs
     */
    async getAIContribution(group) {
        // Extract full text of the paragraph group
        const fullText = group.paragraphs.map(p => p.text).join('\n\n');
        
        // Format paragraph information for the AI with different handling for reactions vs additions
        const paragraphsInfo = group.paragraphs.map(p => {
            // Separate tags into reactions and additions
            const reactionTags = p.tags.filter(tag => !tag.requiresCustomText);
            const additionTags = p.tags.filter(tag => tag.requiresCustomText);
            
            // Format reactions
            const reactionsText = reactionTags.length > 0 ? 
                `Reactions: ${reactionTags.map(tag => `
  - One reader reacted with "${TAG_CONFIG[tag.type]?.displayName || tag.type}" to ${tag.selections.length > 0 ? `"${tag.selections[0].text}"` : 'this paragraph'}${tag.score !== 0 ? ` (Vote score: ${tag.score > 0 ? '+' + tag.score : tag.score})` : ''}`).join('\n')}` : '';
                
            // Format additions
            const additionsText = additionTags.length > 0 ? 
                `Additions: ${additionTags.map(tag => `
  - Type: ${TAG_CONFIG[tag.type]?.displayName || tag.type}${tag.score !== 0 ? ` (Vote score: ${tag.score > 0 ? '+' + tag.score : tag.score})` : ''}${tag.customText ? `
  - Custom Note: "${tag.customText}"` : ''}
  - Selections: ${tag.selections.map(s => `"${s.text}"`).join(', ')}`).join('\n')}` : '';
            
            return `
Paragraph ${p.id}:
Text: ${p.text}
${reactionsText}
${additionsText}`;
        }).join('\n');

        // Construct the prompt with guidance on how to handle reactions vs additions
        const prompt = `You are an expert in content improvement. Your task is to improve specific paragraphs based on user tags.

Paragraphs to improve:
${fullText}

Paragraph details with tags:
${paragraphsInfo}

Instructions for handling different types of feedback:
1. For REACTIONS (like Agree, Disagree, Insightful, Confusing, etc.):
   - Consider these as reader feedback
   - Tags with higher vote scores (e.g., +3, +5) should be given more weight than those with lower or negative scores
   - If multiple readers reacted the same way, consider it stronger feedback
   - Only modify paragraphs if you believe the reactions justify changes
   - If no changes are needed, return the original paragraph text exactly

2. For ADDITIONS (like Source, Counterpoint, Example, Clarification):
   - These represent specific content that readers want incorporated
   - Prioritize additions with higher vote scores
   - Always incorporate these additions in a natural way
   - Maintain the paragraph's original meaning while enhancing it with the additions

Return ONLY the improved paragraphs, maintaining their original structure but incorporating the changes requested by the tags.
The number of paragraphs in your response should match the number of input paragraphs.
Do not add any explanations, preambles, or additional content - just return the improved paragraphs directly.`;

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
                throw new Error(data.error || 'Failed to get AI response');
            }
        } catch (error) {
            console.error("AI contribution error:", error);
            throw error;
        }
    }

    /**
     * Clean and format markdown content
     * @param {string} text Raw markdown text
     * @returns {string} Cleaned and formatted markdown
     */
    cleanAndFormatMarkdown(text) {
        return text
            .replace(/```[^`]*```/g, '')     // Remove code blocks with their content
            .replace(/```/g, '')             // Remove any remaining code block markers
            .replace(/^(#+)([^#\s])/gm, '$1 $2')  // Add space after # if missing
            .replace(/^\s+/gm, '')           // Remove leading spaces from all lines
            .replace(/\n{3,}/g, '\n\n')      // Normalize multiple line breaks to double
            .trim();
    }

    /**
     * Processes all paragraph groups and gets AI contributions
     * @param {Array} groups Array of paragraph groups
     * @returns {Promise<Array>} Array of results with original IDs and new content
     */
    async processContributions(groups) {
        const results = [];
        
        for (const group of groups) {
            try {
                const aiResponse = await this.getAIContribution(group);
                
                results.push({
                    group,
                    content: aiResponse
                });
            } catch (error) {
                console.error(`Error processing group with paragraphs ${group.paragraphIds.join(', ')}:`, error);
                throw error;
            }
        }
        
        return results;
    }

    /**
     * Main contribution processing method
     * @returns {Promise<string>} Combined result of all contributions
     */
    async contribute() {
        // Collect all paragraphs with tags
        const taggedParagraphs = this.collectTaggedParagraphs();
        
        if (taggedParagraphs.size === 0) {
            throw new Error('No tagged paragraphs found');
        }
        
        // Form paragraph groups based on tag relationships
        const groups = this.formParagraphGroups(taggedParagraphs);
        
        // Process each group and get AI contributions
        const results = await this.processContributions(groups);
        
        // Combine all results into a single document
        return this.combineResults(results);
    }

    /**
     * Combines all contribution results into a single markdown document
     * @param {Array} results Array of contribution results
     * @returns {string} Combined markdown document
     */
    combineResults(results) {
        // Get the current content
        const contentContainer = document.getElementById('content');
        const contentClone = contentContainer.cloneNode(true);
        
        // Replace each paragraph with its AI-improved version
        results.forEach(result => {
            const { group, content } = result;
            
            // Split the AI response into paragraphs
            const improvedParagraphs = content.split('\n\n');
            
            // Make sure we have the right number of paragraphs
            if (improvedParagraphs.length === group.paragraphs.length) {
                // Replace each paragraph
                group.paragraphs.forEach((paragraph, index) => {
                    const paragraphElement = contentClone.querySelector(`#${paragraph.id}`);
                    if (paragraphElement) {
                        // Save the improved text for this paragraph
                        const improvedText = improvedParagraphs[index];
                        paragraphElement.textContent = improvedText;
                        paragraphElement.dataset.originalText = improvedText;
                    }
                });
            } else {
                console.error('AI response paragraph count mismatch:', 
                    {expected: group.paragraphs.length, received: improvedParagraphs.length});
            }
        });
        
        // Create a proper markdown document that preserves the order of everything
        const markdownOutput = this.convertToMarkdown(contentClone);
        return markdownOutput;
    }
    
    /**
     * Converts HTML content to properly formatted markdown
     * @param {HTMLElement} container The HTML container element
     * @returns {string} Properly formatted markdown
     */
    convertToMarkdown(container) {
        // Get all content elements in correct order
        const allElements = this.getAllContentElements(container);
        
        // Create markdown output with proper structure
        let markdownOutput = '';
        
        for (const element of allElements) {
            if (element.tagName.match(/^H[1-6]$/)) {
                // Headers - ensure a blank line before for proper separation
                const level = parseInt(element.tagName[1]);
                const prefix = '#'.repeat(level);
                markdownOutput += `\n${prefix} ${element.textContent.trim()}\n\n`;
            } else if (element.classList.contains('paragraph')) {
                // Paragraphs - ensure proper spacing for markdown paragraphs
                // Add an extra space at the end of the paragraph to force proper paragraph rendering
                markdownOutput += `${element.textContent.trim()} \n\n`;
            }
        }
        
        return markdownOutput.trim();
    }
    
    /**
     * Gets all content elements in document order
     * @param {HTMLElement} container The container element
     * @returns {Array} Array of content elements
     */
    getAllContentElements(container) {
        // Get all headings and paragraphs in the correct order
        const elements = [];
        const selector = 'h1, h2, h3, h4, h5, h6, .paragraph';
        
        // Use TreeWalker to get elements in document order
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: function(node) {
                    if (node.matches(selector)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let currentNode = walker.currentNode;
        
        while (currentNode = walker.nextNode()) {
            elements.push(currentNode);
        }
        
        return elements;
    }
} 