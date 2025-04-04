import { personalizeContent } from './ai.js';

export class PopupManager {
    constructor() {
        // Check if sidebar instance exists (it should initialize first)
        if (!window.sidebarInstance || !window.sidebarInstance.stateManager || !window.sidebarInstance.contentManager) {
            console.error("Sidebar instance with required managers not found. PopupManager cannot function.");
            // Optionally disable personalize button or throw error
            return;
        }
        this.sidebarInstance = window.sidebarInstance;
        this.stateManager = this.sidebarInstance.stateManager;
        this.contentManager = this.sidebarInstance.contentManager;
        this.pageName = this.sidebarInstance.pageName;

        this.initialize();
    }

    async initialize() {
        try {
            // Fetch and inject HTML (assuming this part is okay)
            const response = await fetch('/html/popup.html');
            const html = await response.text();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            while (temp.firstChild) {
                document.body.appendChild(temp.firstChild);
            }

            // Get popup elements
            this.overlay = document.querySelector('.personalize-popup-overlay');
            this.popup = document.querySelector('.personalize-popup');
            this.closeButton = document.querySelector('.personalize-popup-close');
            this.input = document.querySelector('.personalize-input');
            this.submitButton = document.querySelector('.personalize-submit');
            this.presetButtons = document.querySelectorAll('.preset-button');
            this.loadingSection = document.querySelector('.personalize-loading');
            this.cancelButton = document.querySelector('.loading-cancel');

            if (!this.overlay || !this.popup) {
                 console.error("PopupManager: Failed to find essential popup elements after loading HTML.");
                 return;
            }

            this.isLoading = false;
            this.currentRequest = null;
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load popup HTML or initialize PopupManager:', error);
        }
    }

    showLoading() {
        this.isLoading = true;
        this.popup.classList.add('loading');
        this.loadingSection.classList.add('visible');
    }

    hideLoading() {
        this.isLoading = false;
        this.popup.classList.remove('loading');
        this.loadingSection.classList.remove('visible');
    }

    closePopup() {
        if (!this.isLoading) {
            this.overlay.classList.remove('visible');
            this.popup.classList.remove('visible');
        }
    }

    handleCancel() {
        // No request to cancel yet in this flow
        this.hideLoading();
    }

    validateInput() {
        if (!this.input.value.trim()) {
            this.input.classList.add('error');
            return false;
        }
        this.input.classList.remove('error');
        return true;
    }

    /**
     * Fetches the base markdown content to be used for personalization.
     * Prioritizes the latest canonical (contributed) version, falls back to original.
     * @returns {Promise<string>} Raw markdown content.
     */
    async getBaseMarkdownForPersonalization() {
        let baseContent = this.stateManager.getCanonicalContent();
        if (!baseContent) {
            console.log('PopupManager: No canonical content found, fetching original raw markdown...');
            // Use ContentManager's method to fetch original raw content
            baseContent = await this.contentManager.fetchOriginalMarkdown();
        }
        if (!baseContent) {
             throw new Error("Could not retrieve base markdown content for personalization.");
        }
        return baseContent;
    }

    async handleSubmit(e) {
        e?.preventDefault();
        if (this.validateInput()) {
            this.showLoading();
            try {
                const promptText = this.input.value.trim();
                const prefs = { prompt: promptText };

                // 1. Get the correct base markdown content
                const baseMarkdown = await this.getBaseMarkdownForPersonalization();

                // 2. Call AI for personalization (no need to track currentRequest for cancellation here)
                const personalizedMarkdown = await personalizeContent(baseMarkdown, prefs);

                // 3. Save preferences and the result cache via StateManager
                this.stateManager.savePersonalizationPrefs(prefs);
                this.stateManager.savePersonalizedContentCache(personalizedMarkdown);

                // 4. Update sidebar UI state and trigger content update
                this.stateManager.updateSidebarState({ personalization: true, contributions: false });
                this.sidebarInstance.updateTogglesState(); // Tell sidebar to update its toggles

                 // 5. Trigger ContentManager to display the new cache
                 await this.contentManager.updateContent();

                // 6. Reset form and close popup/sidebar
                this.input.value = '';
                this.hideLoading(); // Hide loading before closing
                this.closePopup();
                this.sidebarInstance.close(); // Close the main sidebar

            } catch (error) {
                console.error('Personalization error:', error);
                alert(`Personalization failed: ${error.message}`); // Show error to user
                this.input.classList.add('error'); // Indicate error on input
                this.hideLoading(); // Hide loading on error
            }
        }
    }

    setupEventListeners() {
        if (!this.popup) return; // Don't setup if initialization failed

        // Preset button texts
        const presetTexts = {
            '¿Hablas español?': 'Please translate this post into Spanish while preserving its meaning and context.',
            'Make it accessible for high school math': 'Please explain this content using high school level math concepts and terminology.',
            'Explain like I\'m five': 'Please explain this content in simple terms that a 5-year-old could understand.'
        };
        this.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.input.value = presetTexts[button.textContent];
                this.input.classList.remove('error');
                this.input.focus();
            });
        });

        // Input validation handling
        this.input.addEventListener('focus', () => this.input.classList.remove('error'));
        this.input.addEventListener('input', () => this.input.classList.remove('error'));

        // Submit handlers
        this.submitButton.addEventListener('click', (e) => this.handleSubmit(e));
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                this.handleSubmit(e);
            }
        });
    
        // Close handlers
        this.closeButton.addEventListener('click', () => this.closePopup());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay && !this.isLoading) {
                this.closePopup();
                if (this.sidebarInstance && this.sidebarInstance.isOpen) {
                    this.sidebarInstance.close();
                }
            }
        });
    
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isLoading) {
                this.closePopup();
            }
        });

        // Cancel button handler
        this.cancelButton.addEventListener('click', () => this.handleCancel());
    }
}