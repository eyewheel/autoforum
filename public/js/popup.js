import { personalizeContent } from './ai.js';

export class PopupManager {
    constructor() {
        this.initialize();
    }

    async initialize() {
        try {
            const response = await fetch('/html/popup.html');
            const html = await response.text();
            
            // Create temp container and insert HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Add popup elements to body
            while (temp.firstChild) {
                document.body.appendChild(temp.firstChild);
            }
            
            // Get popup elements after they're added to DOM
            this.overlay = document.querySelector('.personalize-popup-overlay');
            this.popup = document.querySelector('.personalize-popup');
            this.closeButton = document.querySelector('.personalize-popup-close');
            this.input = document.querySelector('.personalize-input');
            this.submitButton = document.querySelector('.personalize-submit');
            this.presetButtons = document.querySelectorAll('.preset-button');
            this.loadingSection = document.querySelector('.personalize-loading');
            this.cancelButton = document.querySelector('.loading-cancel');
            
            // Loading state flag
            this.isLoading = false;
            this.currentRequest = null;

            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load popup HTML:', error);
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
        if (this.currentRequest) {
            this.currentRequest = null;
        }
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

    async getCurrentContent() {
        // Get current page
        const pathname = window.location.pathname;
        const page = pathname === '/' ? 'index' : pathname.substring(1);
        
        // Get content without any parameters - always get default content
        const response = await fetch(`/api/content/${page}`);
        const data = await response.json();
        return data.content;
    }

    async handleSubmit(e) {
        e?.preventDefault();
        if (this.validateInput()) {
            try {
                this.showLoading();
                
                // Get current page content (always default)
                const currentContent = await this.getCurrentContent();
                
                // Create a clean version without HTML tags
                const contentText = new DOMParser()
                    .parseFromString(currentContent, 'text/html')
                    .body.textContent;
                
                // Start personalization request
                this.currentRequest = personalizeContent(contentText, this.input.value.trim());
                const personalizedContent = await this.currentRequest;
                
                if (this.currentRequest) { // Only proceed if not canceled
                    // Get current page
                    const pathname = window.location.pathname;
                    const page = pathname === '/' ? 'index' : pathname.substring(1);
                    
                    // Save personalized content
                    window.sidebarInstance.saveCustomContent(page, personalizedContent);
                    
                    // Enable personalization if not already enabled
                    window.sidebarInstance.personalizationInput.checked = true;
                    
                    // Update content
                    await window.sidebarInstance.updateContent();
                    
                    // Reset form
                    this.input.value = '';
                    
                    // Close popup components and sidebar
                    this.overlay.classList.remove('visible');
                    this.popup.classList.remove('visible');
                    window.sidebarInstance.close();
                }
            } catch (error) {
                console.error('Personalization error:', error);
                this.input.classList.add('error');
            } finally {
                if (this.currentRequest) { // Only hide if not already canceled
                    this.hideLoading();
                    this.currentRequest = null;
                }
            }
        }
    }

    setupEventListeners() {
        // Preset button texts
        const presetTexts = {
            '¿Hablas español?': 'Please translate this post into Spanish while preserving its meaning and context.',
            'Make it accessible for high school math': 'Please explain this content using high school level math concepts and terminology.',
            'Explain like I\'m five': 'Please explain this content in simple terms that a 5-year-old could understand.'
        };

        // Add preset button handlers
        this.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.input.value = presetTexts[button.textContent];
                this.input.classList.remove('error');
                this.input.focus();
            });
        });

        // Remove error on focus or input
        this.input.addEventListener('focus', () => this.input.classList.remove('error'));
        this.input.addEventListener('input', () => this.input.classList.remove('error'));

        // Submit on button click
        this.submitButton.addEventListener('click', (e) => this.handleSubmit(e));

        // Handle keydown events
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                this.handleSubmit(e);
            }
        });
    
        // Close on X button click
        this.closeButton.addEventListener('click', () => this.closePopup());
    
        // Close on overlay click with intelligent behavior
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay && !this.isLoading) {
                // Close popup
                this.closePopup();
                
                // Close sidebar too
                const sidebarInstance = window.sidebarInstance;
                if (sidebarInstance && sidebarInstance.isOpen) {
                    sidebarInstance.close();
                }
            }
        });
    
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isLoading) {
                this.closePopup();
            }
        });

        // Add cancel button handler
        this.cancelButton.addEventListener('click', () => this.handleCancel());
    }
}