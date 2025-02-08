import { DEFAULT_TAGS } from './defaultTags.js';
import { CONSTANTS } from './constants.js';
import { contributeContent } from './ai.js';

export class Sidebar {
    constructor() {
        this.isOpen = false;
        
        // Initialize content and state storage
        this.CUSTOM_CONTENT_KEY = 'custom_content';
        this.CONTRIBUTIONS_KEY = 'contributions_content';
        this.STATE_KEY = 'sidebar_state';
        this.customContent = this.loadCustomContent();
        this.contributionsContent = this.loadContributions();
        this.state = this.loadState();
        
        // Initialize sidebar
        this.initialize();
        
        // Expose sidebar instance globally
        window.sidebarInstance = this;
    }

    // Load custom content from localStorage
    loadCustomContent() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_CONTENT_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading custom content:', error);
            return {};
        }
    }

    loadContributions() {
        try {
            const stored = localStorage.getItem(this.CONTRIBUTIONS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading contributions:', error);
            return {};
        }
    }

    hasContributions(page) {
        return page in this.contributionsContent;
    }

    getContributions(page) {
        return this.contributionsContent[page] || null;
    }

    saveContributions(page, content) {
        try {
            this.contributionsContent[page] = content;
            localStorage.setItem(this.CONTRIBUTIONS_KEY, JSON.stringify(this.contributionsContent));
            
            if (this.contributionsInput) {
                this.contributionsInput.disabled = false;
                this.contributionsInput.checked = true;
                
                // Set global state
                window.contentVersion = {
                    hasContributions: true
                };
                
                // Save state to localStorage
                this.saveState();
                
                // Force a content update
                setTimeout(() => {
                    this.updateContent();
                }, 50);
            }
        } catch (error) {
            console.error('Error saving contributions:', error);
        }
    }

    // Load sidebar state from localStorage
    loadState() {
        try {
            const stored = localStorage.getItem(this.STATE_KEY);
            return stored ? JSON.parse(stored) : {
                personalization: false,
                contributions: false
            };
        } catch (error) {
            console.error('Error loading sidebar state:', error);
            return { personalization: false };
        }
    }

    // Save sidebar state to localStorage
    saveState() {
        try {
            const state = {
                personalization: this.personalizationInput?.checked || false,
                contributions: this.contributionsInput?.checked || false
            };
            localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving sidebar state:', error);
        }
    }

    // Save custom content to localStorage
    saveCustomContent(page, content) {
        try {
            this.customContent[page] = content;
            localStorage.setItem(this.CUSTOM_CONTENT_KEY, JSON.stringify(this.customContent));
            
            // Update personalization state
            if (this.personalizationInput) {
                this.personalizationInput.disabled = false;
                this.personalizationInput.checked = true;
                
                // Set global state
                window.contentVersion = {
                    hasPersonalization: true
                };
                
                // Save state to localStorage
                this.saveState();
                
                // Force a content update with a small delay to ensure state is saved
                setTimeout(() => {
                    this.updateContent();
                }, 50);
            }
        } catch (error) {
            console.error('Error saving custom content:', error);
        }
    }

    // Get custom content for a page
    getCustomContent(page) {
        return this.customContent[page] || null;
    }

    // Check if custom content exists for a page
    hasCustomContent(page) {
        return page in this.customContent;
    }

    initialize() {
        this.createSidebar();
        this.loadPages();
        this.setupEventListeners();
        this.ensureDefaultTagsLoaded();
        this.updateContent(); // Initial content update based on state
    }

    createSidebar() {
        // Create sidebar elements
        const sidebar = document.createElement('div');
        sidebar.className = 'nav-sidebar';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'nav-sidebar-close';
        closeButton.innerHTML = '×';
        
        const content = document.createElement('div');
        content.className = 'nav-sidebar-content';
        
        const title = document.createElement('h2');
        title.textContent = 'Navigation';

        // Create contributions toggle (disabled for now)
        const contributionsContainer = document.createElement('div');
        contributionsContainer.className = 'toggle-container';
        const contributionsLabel = document.createElement('span');
        contributionsLabel.className = 'toggle-label';
        contributionsLabel.textContent = 'Contributions';
        const contributionsToggle = document.createElement('label');
        contributionsToggle.className = 'toggle-switch';
        const contributionsInput = document.createElement('input');
        contributionsInput.type = 'checkbox';
        contributionsInput.disabled = true;
        const contributionsSlider = document.createElement('span');
        contributionsSlider.className = 'toggle-slider';
        contributionsToggle.appendChild(contributionsInput);
        contributionsToggle.appendChild(contributionsSlider);
        contributionsContainer.appendChild(contributionsLabel);
        contributionsContainer.appendChild(contributionsToggle);

        // Create personalization toggle
        const personalizationContainer = document.createElement('div');
        personalizationContainer.className = 'toggle-container';
        const personalizationLabel = document.createElement('span');
        personalizationLabel.className = 'toggle-label';
        personalizationLabel.textContent = 'Personalization';
        const personalizationToggle = document.createElement('label');
        personalizationToggle.className = 'toggle-switch';
        const personalizationInput = document.createElement('input');
        personalizationInput.type = 'checkbox';
        
        // Check if custom content exists for current page
        const pathname = window.location.pathname;
        const page = pathname === '/' ? 'index' : pathname.substring(1);
        
        // Set initial toggle state
        if (this.hasCustomContent(page)) {
            personalizationInput.disabled = false;
            personalizationInput.checked = this.state.personalization;
        } else {
            personalizationInput.disabled = true;
            personalizationInput.checked = false;
        }
        
        // Set initial contributions toggle state
        if (this.hasContributions(page)) {
            contributionsInput.disabled = false;
            contributionsInput.checked = this.state.contributions;
        } else {
            contributionsInput.disabled = true;
            contributionsInput.checked = false;
        }

        // Add event listener for contributions toggle
        contributionsInput.addEventListener('change', () => {
            this.saveState();
            window.contentVersion = {
                hasContributions: this.contributionsInput.checked,
                hasPersonalization: false
            };
            this.updateContent();
        });

        // Update global state to match
        window.contentVersion = {
            hasPersonalization: personalizationInput.checked && !personalizationInput.disabled,
            hasContributions: contributionsInput.checked && !contributionsInput.disabled
        };
        
        const personalizationSlider = document.createElement('span');
        personalizationSlider.className = 'toggle-slider';
        personalizationToggle.appendChild(personalizationInput);
        personalizationToggle.appendChild(personalizationSlider);
        personalizationContainer.appendChild(personalizationLabel);
        personalizationContainer.appendChild(personalizationToggle);

        // Add event listener for personalization toggle
        personalizationInput.addEventListener('change', () => {
            this.saveState();
            window.contentVersion = {
                hasPersonalization: this.personalizationInput.checked
            };
            this.updateContent();
        });
        
        const navList = document.createElement('ul');
        navList.className = 'nav-sidebar-links';
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'nav-sidebar-toggle';
        toggleButton.innerHTML = '☰';

        // Create overlay for click-outside
        const overlay = document.createElement('div');
        overlay.className = 'nav-sidebar-overlay';
        
        // Create toggle controls container
        const toggleControls = document.createElement('div');
        toggleControls.className = 'toggle-controls';

        // Create personalize button
        const personalizeButton = document.createElement('button');
        personalizeButton.className = 'personalize-button';
        personalizeButton.textContent = 'Personalize';
        personalizeButton.addEventListener('click', () => {
            document.querySelector('.personalize-popup-overlay').classList.add('visible');
            document.querySelector('.personalize-popup').classList.add('visible');
        });

        // Create contribute button
        const contributeButton = document.createElement('button');
        contributeButton.className = 'personalize-button contribute-button';
        contributeButton.textContent = 'Contribute';
        contributeButton.addEventListener('click', () => {
            this.handleContribute();
        });

        toggleControls.appendChild(personalizeButton);
        toggleControls.appendChild(contributeButton);
        toggleControls.appendChild(contributionsContainer);
        toggleControls.appendChild(personalizationContainer);

        // Assemble sidebar
        content.appendChild(title);
        content.appendChild(navList);
        content.appendChild(toggleControls);
        sidebar.appendChild(closeButton);
        sidebar.appendChild(content);
        
        // Add to document
        document.body.appendChild(sidebar);
        document.body.appendChild(toggleButton);
        document.body.appendChild(overlay);
        
        // Store references
        this.sidebar = sidebar;
        this.navList = navList;
        this.toggleButton = toggleButton;
        this.closeButton = closeButton;
        this.overlay = overlay;
        this.contributionsInput = contributionsInput;
        this.personalizationInput = personalizationInput;
    }

    ensureDefaultTagsLoaded() {
        const defaultsLoadedKey = 'defaultTagsLoaded';
        if (!localStorage.getItem(defaultsLoadedKey)) {
            // Load default tags for each page
            Object.entries(DEFAULT_TAGS).forEach(([page, tags]) => {
                const storageKey = `${CONSTANTS.STORAGE_KEY}_${page}`;
                if (!localStorage.getItem(storageKey)) {
                    localStorage.setItem(storageKey, JSON.stringify(tags));
                }
            });
            localStorage.setItem(defaultsLoadedKey, 'true');
        }
    }

    getTagCount(page) {
        // Try to get tags from localStorage
        const storageKey = `${CONSTANTS.STORAGE_KEY}_${page}`;
        let count = 0;
        
        try {
            const storedTags = localStorage.getItem(storageKey);
            if (storedTags) {
                const tags = JSON.parse(storedTags);
                count = Object.values(tags).reduce((acc, pageTags) => acc + pageTags.length, 0);
            } else if (DEFAULT_TAGS[page]) {
                // If no localStorage but we have default tags
                count = Object.values(DEFAULT_TAGS[page]).reduce((acc, pageTags) => acc + pageTags.length, 0);
            }
        } catch (error) {
            console.error('Error getting tag count:', error);
        }
        
        return count;
    }

    async loadPages() {
        try {
            // Add home link
            this.addNavLink('Home', '/', 0);

            // Get list of markdown files
            const response = await fetch('/api/pages');
            const pages = await response.json();
            
            // Add links for each page
            pages.forEach(page => {
                const tagCount = this.getTagCount(page);
                this.addNavLink(this.formatPageName(page), `/${page}`, tagCount);
            });

        } catch (error) {
            console.error('Error loading pages:', error);
        }
    }

    addNavLink(text, href, tagCount) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        
        // Add page name
        const pageName = document.createElement('span');
        pageName.textContent = text;
        a.appendChild(pageName);
        
        // Add tag count if not home page
        if (href !== '/') {
            const count = document.createElement('span');
            count.className = 'nav-tag-count';
            count.textContent = tagCount;
            a.appendChild(count);
        }
        
        // Mark active page and handle personalization
        if (window.location.pathname === href) {
            a.classList.add('active');
            
            // Update personalization toggle state for the new page
            const page = href === '/' ? 'index' : href.substring(1);
            if (this.personalizationInput) {
                const hasCustomContent = this.hasCustomContent(page);
                this.personalizationInput.disabled = !hasCustomContent;
                this.personalizationInput.checked = hasCustomContent && this.state.personalization;
                
                // Update global state and trigger content update if needed
                window.contentVersion = {
                    hasPersonalization: this.personalizationInput.checked && !this.personalizationInput.disabled
                };
                
                if (this.personalizationInput.checked && hasCustomContent) {
                    setTimeout(() => this.updateContent(), 50);
                }
            }
        }
        
        li.appendChild(a);
        this.navList.appendChild(li);
    }

    formatPageName(filename) {
        // Remove .md extension and capitalize
        const name = filename.replace('.md', '');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    setupEventListeners() {
        // Toggle sidebar
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });

        // Close sidebar
        this.closeButton.addEventListener('click', () => {
            this.close();
        });

        // Close on overlay click
        this.overlay.addEventListener('click', () => {
            this.close();
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.sidebar.classList.add('open');
        this.overlay.classList.add('visible');
        this.isOpen = true;
    }

    close() {
        this.sidebar.classList.remove('open');
        this.overlay.classList.remove('visible');
        this.isOpen = false;
    }

    async handleContribute() {
        // Create overlay if it doesn't exist
        let overlay = document.querySelector('.contribute-overlay');
        let cancelButton = document.querySelector('.contribute-cancel');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'contribute-overlay';
            
            cancelButton = document.createElement('button');
            cancelButton.className = 'contribute-cancel';
            cancelButton.textContent = '×';
            cancelButton.addEventListener('click', () => {
                overlay.classList.remove('visible');
            });
            
            overlay.appendChild(cancelButton);
            document.body.appendChild(overlay);
        }

        // Show overlay
        overlay.classList.add('visible');
        
        // Get all paragraphs with tags
        const taggedParagraphs = new Map();
        const paragraphs = document.querySelectorAll('.paragraph');
        
        paragraphs.forEach(paragraph => {
            const paragraphId = paragraph.id;
            // console.log(paragraphId);
            const tags = window.tagManager.getTagsForParagraph(paragraphId);
            
            if (tags && tags.length > 0) {
                taggedParagraphs.set(paragraphId, {
                    text: paragraph.dataset.originalText || paragraph.textContent,
                    tags: tags.map(tag => ({
                        type: tag.tagType,
                        selections: tag.selections.filter(s => s.paragraphId === paragraphId)
                            .map(s => ({
                                text: s.selectedText,
                                startOffset: s.startOffset,
                                endOffset: s.endOffset
                            }))
                    }))
                });
            }
        });

        // If no tagged paragraphs, show message and return
        if (taggedParagraphs.size === 0) {
            alert('No tagged paragraphs found. Please add tags to contribute.');
            overlay.classList.remove('visible');
            return;
        }
try {
    // Add loading indicator
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    overlay.appendChild(loadingSpinner);
    
    // Send to LLM and get response
    const response = await contributeContent(taggedParagraphs);
    
    // Get current page path
    const pathname = window.location.pathname;
    const page = pathname === '/' ? 'index' : pathname.substring(1);
    
    // Save as a contribution
    this.saveContributions(page, response);
    
    // Clean up
    overlay.classList.remove('visible');
    loadingSpinner.remove();
    
    // Update the contributions toggle
    if (this.contributionsInput) {
        this.contributionsInput.disabled = false;
        this.contributionsInput.checked = true;
        window.contentVersion = {
            hasContributions: true,
            hasPersonalization: false
        };
        this.saveState();
    }
    
    // Close the sidebar
    this.close();
    
} catch (error) {
    console.error('Error during contribution:', error);
    alert('An error occurred while processing your contribution. Please try again.');
    overlay.classList.remove('visible');
}
        // console.log('Tagged paragraphs:', taggedParagraphs);
    }

    async updateContent() {
        // Get current page path
        const pathname = window.location.pathname;
        const page = pathname === '/' ? 'index' : pathname.substring(1);

        // Get content container
        const contentContainer = document.getElementById('content');
        if (!contentContainer) return;

        // Check content mode
        const hasCustomContent = this.hasCustomContent(page);
        const hasContributions = this.hasContributions(page);
        const isPersonalizationEnabled = this.personalizationInput?.checked && !this.personalizationInput?.disabled;
        const isContributionsEnabled = this.contributionsInput?.checked && !this.contributionsInput?.disabled;

        // Add loading state
        document.body.classList.add('loading-content');
        contentContainer.style.opacity = '0';

        try {
            let url = `/api/content/${page}`;
            let content = null;
            
            // Determine which content to show
            if (isContributionsEnabled && hasContributions) {
                content = this.getContributions(page);
                // console.log('Raw contributions content:', content);
                
                // Ensure proper markdown formatting by adding double line breaks
                content = content.replace(/\n/g, '\n\n');
                // console.log('Formatted contributions content:', content);
                
                url += `?contributions=1&customContent=${encodeURIComponent(content)}`;
                // console.log('Request URL:', url);
            } else if (isPersonalizationEnabled && hasCustomContent) {
                content = this.getCustomContent(page);
                // console.log('Raw personalization content:', content);
                
                // Add same line break formatting for consistency
                content = content.replace(/\n/g, '\n\n');
                // console.log('Formatted personalization content:', content);
                
                url += `?personalization=1&customContent=${encodeURIComponent(content)}`;
            }

            // Fetch content
            const response = await fetch(url);
            const data = await response.json();
            
            // Update content
            contentContainer.innerHTML = data.content;
            document.title = page;

            // Set background color based on mode
            if (isContributionsEnabled && hasContributions) {
                document.body.style.backgroundColor = '#e6ffe6'; // light green for contributions
            } else if (isPersonalizationEnabled && hasCustomContent) {
                document.body.style.backgroundColor = '#fff3e6'; // light orange for personalization
            } else {
                document.body.style.backgroundColor = '#ffffff'; // default
            }

            // Initialize tags if needed
            if (window.initializeTags) {
                window.initializeTags();
            }

            // Remove loading state and show content with a smooth transition
            document.body.classList.remove('loading-content');
            contentContainer.style.opacity = '1';

        } catch (error) {
            console.error('Error updating content:', error);
            document.body.classList.remove('loading-content');
            contentContainer.style.opacity = '1';
        }
    }
}