import { DEFAULT_TAGS } from './defaultTags.js';
import { CONSTANTS } from './constants.js';

export class Sidebar {
    constructor() {
        this.isOpen = false;
        
        // Initialize content and state storage
        this.CUSTOM_CONTENT_KEY = 'custom_content';
        this.STATE_KEY = 'sidebar_state';
        this.customContent = this.loadCustomContent();
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

    // Load sidebar state from localStorage
    loadState() {
        try {
            const stored = localStorage.getItem(this.STATE_KEY);
            return stored ? JSON.parse(stored) : { personalization: false };
        } catch (error) {
            console.error('Error loading sidebar state:', error);
            return { personalization: false };
        }
    }

    // Save sidebar state to localStorage
    saveState() {
        try {
            const state = {
                personalization: this.personalizationInput?.checked || false
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
        
        // Update global state to match
        window.contentVersion = {
            hasPersonalization: personalizationInput.checked && !personalizationInput.disabled
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

        toggleControls.appendChild(personalizeButton);
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

    async updateContent() {
        // Get current page path
        const pathname = window.location.pathname;
        const page = pathname === '/' ? 'index' : pathname.substring(1);

        // Get content container
        const contentContainer = document.getElementById('content');
        if (!contentContainer) return;

        // Check if we need to show personalized content
        const hasCustomContent = this.hasCustomContent(page);
        const isPersonalizationEnabled = this.personalizationInput?.checked && !this.personalizationInput?.disabled;

        // Add loading state immediately
        document.body.classList.add('loading-content');
        contentContainer.style.opacity = '0';

        try {

            const customContent = this.getCustomContent(page);
            
            let url = `/api/content/${page}`;
            
            if (isPersonalizationEnabled && hasCustomContent && customContent) {
                url += `?personalization=1&customContent=${encodeURIComponent(customContent)}`;
            }

            // Fetch content with appropriate parameters
            const response = await fetch(url);
            const data = await response.json();
            
            // Update content
            contentContainer.innerHTML = data.content;
            document.title = page;

            // Set background color based on content mode
            if (isPersonalizationEnabled && hasCustomContent) {
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