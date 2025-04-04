// ContentManager.js
// Handles fetching, parsing, and displaying the main page content.

export class ContentManager {
    /**
     * @param {string} pageName The name of the current page (e.g., 'readme').
     * @param {StateManager} stateManager An instance of StateManager.
     */
    constructor(pageName, stateManager) {
        if (!pageName || !stateManager) {
            throw new Error("ContentManager requires pageName and stateManager.");
        }
        this.pageName = pageName;
        this.stateManager = stateManager;
        this.contentContainer = document.getElementById('content');

        if (!this.contentContainer) {
            console.error('Fatal Error: Content container #content not found.');
            // Potentially throw an error or disable functionality
        }
    }

    /**
     * Fetches the raw markdown content for the current page from the backend.
     * Used when no canonical or personalized version is available in storage.
     * @returns {Promise<string>} Raw markdown content.
     */
    async fetchOriginalMarkdown() {
        try {
            // Assumes backend endpoint /api/content/:pageName?raw=true exists
            const response = await fetch(`/api/content/${this.pageName}?raw=true`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try parsing error, default to empty object
                throw new Error(errorData.error || `Failed to fetch original content (status: ${response.status})`);
            }
            const data = await response.json();
            if (typeof data.rawMarkdown !== 'string') {
                throw new Error('Invalid response format: rawMarkdown property missing or not a string.');
            }
            return data.rawMarkdown;
        } catch (error) {
            console.error('Error fetching original markdown:', error);
            throw error; // Re-throw for the caller (updateContent) to handle
        }
    }

    /**
     * Fetches the parsed HTML for a given markdown string from the backend.
     * @param {string} markdown The markdown content to parse.
     * @returns {Promise<string>} Parsed HTML content.
     */
    async fetchParsedHtml(markdown) {
        try {
            // Assumes backend endpoint POST /api/parse-markdown exists
            const parseResponse = await fetch(`/api/parse-markdown`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdown })
            });
            if (!parseResponse.ok) {
                const errorData = await parseResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to parse markdown content (status: ${parseResponse.status})`);
            }
            const parsedData = await parseResponse.json();
            if (typeof parsedData.html !== 'string') {
                throw new Error('Invalid response format: html property missing or not a string.');
            }
            return parsedData.html;
        } catch (error) {
            console.error('Error fetching parsed HTML:', error);
            throw error; // Re-throw
        }
    }

    /**
     * Updates the main content area based on the current state (canonical, personalized, or default).
     */
    async updateContent() {
        // Skip content update for home page or if container missing
        if (!this.contentContainer || (this.pageName === 'index' && window.location.pathname === '/')) {
            console.log('Skipping content update.', { page: this.pageName, path: window.location.pathname, containerExists: !!this.contentContainer });
            return;
        }

        // Add loading state visual cue
        document.body.classList.add('loading-content');
        this.contentContainer.style.opacity = '0';

        try {
            const state = this.stateManager.getSidebarState();
            let markdownToRender = null;
            let mode = 'default'; // To set background color or other UI indicators

            // Determine which markdown version to render
            if (state.contributions && this.stateManager.hasCanonicalContent()) {
                markdownToRender = this.stateManager.getCanonicalContent();
                mode = 'contributions';
                console.log('ContentManager: Rendering canonical (contributed) content.');
            } else if (state.personalization && this.stateManager.hasPersonalizedContentCache()) {
                markdownToRender = this.stateManager.getPersonalizedContentCache();
                mode = 'personalization';
                console.log('ContentManager: Rendering personalized content from cache.');
            } else {
                // Default: Show latest canonical if available, otherwise fetch original
                markdownToRender = this.stateManager.getCanonicalContent();
                if (!markdownToRender) {
                    console.log('ContentManager: No canonical/personalized content, fetching original...');
                    markdownToRender = await this.fetchOriginalMarkdown();
                } else {
                    console.log('ContentManager: Rendering default (latest canonical) content.');
                }
                mode = 'default';
            }

            if (markdownToRender === null || typeof markdownToRender !== 'string') {
                // Handle cases where content is expected but null/invalid (e.g., error during fetchOriginal)
                throw new Error('Could not determine valid markdown content to render.');
            }

            // Fetch the parsed HTML for the selected markdown
            const htmlContent = await this.fetchParsedHtml(markdownToRender);

            // Update content container and title
            this.contentContainer.innerHTML = htmlContent;
            // Title formatting might belong elsewhere, but keep here for now
            document.title = this.formatPageName(this.pageName);

            // Set background color based on mode
            this.updateBackground(mode);

            // Re-initialize tags for the newly rendered content
            if (window.initializeTags) {
                 // Assuming initializeTags knows how to find TagManager (currently global)
                window.initializeTags();
            } else {
                console.warn("window.initializeTags function not found. Tags may not render correctly.");
            }

        } catch (error) {
            console.error('ContentManager: Error updating content:', error);
            if (this.contentContainer) {
                 this.contentContainer.innerHTML = `<p class="error-message">Error loading content: ${error.message}</p>`; // Show error in UI
                 this.updateBackground('default'); // Reset background on error
            }
        } finally {
            // Remove loading state and show content
            document.body.classList.remove('loading-content');
            if (this.contentContainer) {
                this.contentContainer.style.opacity = '1';
            }
            // Note: Sidebar toggles should be updated by the caller (Sidebar) after updateContent finishes or in its own flow.
        }
    }

    /**
     * Sets the background color based on the current content mode.
     * @param {string} mode - 'default', 'contributions', or 'personalization'.
     */
    updateBackground(mode) {
        let color = '#ffffff'; // Default white
        if (mode === 'contributions') {
            color = '#e6ffe6'; // Light green
        } else if (mode === 'personalization') {
            color = '#fff3e6'; // Light orange
        }
        document.body.style.backgroundColor = color;
    }

    /**
     * Helper to format page name for the title.
     * @param {string} filename
     * @returns {string} Formatted name.
     */
     formatPageName(filename) {
        const name = filename.replace(/\.md$/i, '');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
} 