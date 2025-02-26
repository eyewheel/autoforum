import { TagManager } from './TagManager.js';
import { TagRenderer } from './TagRenderer.js';
import { TagEvents } from './TagEvents.js';
import { Sidebar } from './Sidebar.js';
import { PopupManager } from './popup.js';

// Function to load templates
function loadTemplates() {
    return new Promise((resolve, reject) => {
        // Check if templates are already loaded
        if (document.getElementById('add-tag-menu-template')) {
            resolve();
            return;
        }

        // If not loaded, fetch them
        fetch('/html/tag-templates.html')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load templates');
                return response.text();
            })
            .then(html => {
                const tempDiv = document.createElement('div');
                tempDiv.id = 'tag-templates-container';
                tempDiv.innerHTML = html;
                document.body.appendChild(tempDiv);
                resolve();
            })
            .catch(error => {
                console.error('Error loading templates:', error);
                reject(error);
            });
    });
}

// Function to initialize tags
window.initializeTags = () => {
    // First, ensure templates are loaded
    loadTemplates()
        .then(() => {
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
        })
        .catch(error => {
            console.error('Failed to initialize tag system:', error);
        });
};

// Add this code to handle the home page content
if (window.isHomePage) {
    // Prevent content from being replaced on the home page
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize sidebar only
        import('./Sidebar.js').then(module => {
            const Sidebar = module.Sidebar;
            new Sidebar();
        });
    });
} else {
    // Regular page initialization with content loading
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize navigation sidebar
        const sidebar = new Sidebar();
        
        // Initialize popup manager after sidebar
        const popupManager = new PopupManager();
        
        // Initialize tags
        window.initializeTags();
    });
}