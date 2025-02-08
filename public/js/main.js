import { TagManager } from './TagManager.js';
import { TagRenderer } from './TagRenderer.js';
import { TagEvents } from './TagEvents.js';
import { Sidebar } from './Sidebar.js';
import { PopupManager } from './popup.js';

// Function to initialize tags
window.initializeTags = () => {
    // Initialize paragraphs with original text
    document.querySelectorAll('.paragraph').forEach(paragraph => {
        paragraph.dataset.originalText = paragraph.textContent;
    });

    // Only create tag management instances if they don't exist and we're not in personalization mode
    if (!window.tagManager && (!window.contentVersion || !window.contentVersion.hasPersonalization)) {
        window.tagManager = new TagManager();
        window.tagRenderer = new TagRenderer(window.tagManager);
        window.tagEvents = new TagEvents(window.tagManager, window.tagRenderer);

        // Render existing tags
        window.tagManager.getAllParagraphIds().forEach(paragraphId => {
            window.tagRenderer.renderParagraph(paragraphId);
        });
    } else if (window.contentVersion && window.contentVersion.hasPersonalization) {
        // Hide tag sidebar in personalization mode
        const tagSidebar = document.getElementById('tag-sidebar');
        if (tagSidebar) {
            tagSidebar.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation sidebar
    const sidebar = new Sidebar();
    
    // Initialize popup manager after sidebar
    const popupManager = new PopupManager();
    
    // Initialize tags
    window.initializeTags();
});