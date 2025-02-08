import { TagManager } from './TagManager.js';
import { TagRenderer } from './TagRenderer.js';
import { TagEvents } from './TagEvents.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize paragraphs with original text
    document.querySelectorAll('.paragraph').forEach(paragraph => {
        paragraph.dataset.originalText = paragraph.textContent;
    });

    // Create instances
    const tagManager = new TagManager();
    const tagRenderer = new TagRenderer(tagManager);
    const tagEvents = new TagEvents(tagManager, tagRenderer);

    // Render existing tags
    tagManager.getAllParagraphIds().forEach(paragraphId => {
        tagRenderer.renderParagraph(paragraphId);
    });
});