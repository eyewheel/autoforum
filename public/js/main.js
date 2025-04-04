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

// Function to initialize/re-initialize tag rendering and events
// This is called by ContentManager after new content is rendered.
window.initializeTags = () => {
    console.log('Initializing tags...');
    // Ensure tagManager instance exists (created by Sidebar)
    if (!window.tagManager) {
        console.error('TagManager instance not found. Tags cannot be initialized.');
        return;
    }

    // Ensure templates are loaded first
    loadTemplates()
        .then(() => {
            console.log('Templates loaded, proceeding with tag initialization.');
            // Add/update original text dataset on paragraphs
            // This should run *after* new content is placed in the DOM
            document.querySelectorAll('.paragraph').forEach(paragraph => {
                if (!paragraph.dataset.originalText) { // Only set if not already set
                     paragraph.dataset.originalText = paragraph.textContent;
                }
            });

            // Instantiate Renderer and Events if they don't exist or need re-creation
            // Using global scope for now, similar to tagManager
            if (!window.tagRenderer) {
                console.log('Creating TagRenderer instance.');
                window.tagRenderer = new TagRenderer(window.tagManager);
            }
            if (!window.tagEvents) {
                 console.log('Creating TagEvents instance.');
                window.tagEvents = new TagEvents(window.tagManager, window.tagRenderer);
            } else {
                // If TagEvents exists, maybe it needs to re-attach listeners if the DOM changed significantly?
                // For now, assume TagEvents handles this internally or it's not needed.
            }

            // Clear existing tag visuals before rendering new ones
            // TODO: Implement clearTags method in TagRenderer if needed
             // window.tagRenderer.clearTags();

            // Re-render tags for all relevant paragraphs based on the current TagManager state
             console.log(`Rendering tags for ${window.tagManager.getAllParagraphIds().length} paragraphs.`);
             window.tagManager.getAllParagraphIds().forEach(paragraphId => {
                // Check if paragraph element actually exists in the current DOM
                if (document.getElementById(paragraphId)) {
                    window.tagRenderer.renderParagraph(paragraphId);
                } else {
                    console.warn(`Paragraph element ${paragraphId} not found in DOM, skipping tag render.`);
                }
            });

            // Hide tag sidebar if needed (This logic might better belong in Sidebar/ContentManager based on state)
            // Let's remove this check here, Sidebar/ContentManager should handle UI visibility.
            /*
            const sidebarState = window.tagManager.stateManager.getSidebarState(); // Access stateManager via tagManager
            if (sidebarState.personalization || sidebarState.contributions) {
                const tagSidebar = document.getElementById('tag-sidebar');
                if (tagSidebar) {
                    // tagSidebar.style.display = 'none';
                     console.log("Hiding tag sidebar in non-default mode.");
                }
            }
            */

             console.log('Tag initialization complete.');
        })
        .catch(error => {
            console.error('Failed to initialize tag system:', error);
        });
};

// --- Main Initialization --- //

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the home page (e.g., defined in the HTML template)
    if (window.isHomePage) {
        console.log('Home page detected, initializing sidebar only.');
        // Initialize sidebar only, which won't trigger content loading
        new Sidebar();
        // No need to initialize popups or tags on home page
    } else {
        console.log('Regular page detected, initializing full system.');
        // Initialize Sidebar, which now also initializes StateManager, TagManager,
        // ContributionProcessor, and ContentManager.
        // ContentManager.updateContent() will be called by the Sidebar constructor,
        // which in turn calls window.initializeTags() upon completion.
        new Sidebar();

        // Initialize popup manager (independent of sidebar content loading)
        new PopupManager();

        // Removed the explicit call to window.initializeTags() here,
        // as it's now triggered by ContentManager after content loads.
    }
});