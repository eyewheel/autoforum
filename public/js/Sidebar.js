import { StateManager } from './StateManager.js';
import { TagManager } from './TagManager.js';
import { ContributionProcessor } from './ContributionProcessor.js';
import { ContentManager } from './ContentManager.js';
import { personalizeContent } from './ai.js';

export class Sidebar {
    constructor() {
        this.isOpen = false;
        this.pageName = this.getCurrentPageName();

        // Instantiate managers
        this.stateManager = new StateManager(this.pageName);
        // Expose TagManager globally (still needed for ContributionProcessor and potentially initializeTags)
        window.tagManager = new TagManager(this.pageName, this.stateManager);
        this.contributionProcessor = new ContributionProcessor(window.tagManager);
        this.contentManager = new ContentManager(this.pageName, this.stateManager); // Instantiate ContentManager

        // Initialize UI
        this.initializeUI();

        // Initial content load using ContentManager
        this.contentManager.updateContent();

        // Expose sidebar instance globally (optional)
        window.sidebarInstance = this;
    }

    getCurrentPageName() {
        const pathname = window.location.pathname;
        // Handle root path ('/') -> 'index', otherwise take the last segment
        const page = pathname === '/' ? 'index' : pathname.substring(pathname.lastIndexOf('/') + 1);
        // Remove potential .html or other extensions if needed, assuming .md implies no extension in URL
        return page || 'index'; // Fallback to index
    }

    initializeUI() {
        this.createSidebarElements();
        this.loadPageLinks();
        this.setupEventListeners();
        this.updateTogglesState(); // Set initial toggle states based on StateManager
    }

    // Renamed from createSidebar to be more specific
    createSidebarElements() {
        // Create sidebar elements (largely the same as before)
        const sidebar = document.createElement('div');
        sidebar.className = 'nav-sidebar';

        const closeButton = document.createElement('button');
        closeButton.className = 'nav-sidebar-close';
        closeButton.innerHTML = '×';

        const content = document.createElement('div');
        content.className = 'nav-sidebar-content';

        const title = document.createElement('h2');
        title.textContent = 'Navigation';

        // Contributions Toggle
        const contributionsContainer = document.createElement('div');
        contributionsContainer.className = 'toggle-container';
        const contributionsLabel = document.createElement('span');
        contributionsLabel.textContent = 'Contributions';
        contributionsLabel.className = 'toggle-label';
        const contributionsToggle = this.createToggleSwitch('contributions'); // Helper to create toggle
        contributionsContainer.appendChild(contributionsLabel);
        contributionsContainer.appendChild(contributionsToggle);
        this.contributionsInput = contributionsToggle.querySelector('input'); // Store input reference

        // Personalization Toggle
        const personalizationContainer = document.createElement('div');
        personalizationContainer.className = 'toggle-container';
        const personalizationLabel = document.createElement('span');
        personalizationLabel.textContent = 'Personalization';
        personalizationLabel.className = 'toggle-label';
        const personalizationToggle = this.createToggleSwitch('personalization'); // Helper
        personalizationContainer.appendChild(personalizationLabel);
        personalizationContainer.appendChild(personalizationToggle);
        this.personalizationInput = personalizationToggle.querySelector('input'); // Store input reference

        // Navigation List
        const navList = document.createElement('ul');
        navList.className = 'nav-sidebar-links';

        // Sidebar Toggle Button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'nav-sidebar-toggle';
        toggleButton.innerHTML = '☰';

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'nav-sidebar-overlay';

        // Controls Container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'toggle-controls'; // Changed class name for clarity

        // Personalize Button
        const personalizeButton = document.createElement('button');
        personalizeButton.className = 'personalize-button';
        personalizeButton.textContent = 'Personalize';
        personalizeButton.addEventListener('click', () => this.openPersonalizePopup());

        // Contribute Button
        const contributeButton = document.createElement('button');
        contributeButton.className = 'personalize-button contribute-button'; // Kept class for styling
        contributeButton.textContent = 'Contribute';
        contributeButton.addEventListener('click', () => this.handleContribute());

        // Assemble Controls
        controlsContainer.appendChild(personalizeButton);
        controlsContainer.appendChild(contributeButton);
        controlsContainer.appendChild(contributionsContainer); // Add toggles to controls
        controlsContainer.appendChild(personalizationContainer);

        // Assemble Sidebar Content
        content.appendChild(title);
        content.appendChild(navList);
        content.appendChild(controlsContainer);
        sidebar.appendChild(closeButton);
        sidebar.appendChild(content);

        // Add to document
        document.body.appendChild(sidebar);
        document.body.appendChild(toggleButton);
        document.body.appendChild(overlay);

        // Store references to major elements
        this.sidebar = sidebar;
        this.navList = navList;
        this.toggleButton = toggleButton;
        this.closeButton = closeButton;
        this.overlay = overlay;
        // Input references are stored above (this.contributionsInput, this.personalizationInput)
    }

    createToggleSwitch(name) {
        const toggle = document.createElement('label');
        toggle.className = 'toggle-switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `${name}-toggle`; // Add ID for label association if needed
        input.dataset.toggleType = name; // Store type for event listener
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        toggle.appendChild(input);
        toggle.appendChild(slider);
        return toggle;
    }

    updateTogglesState() {
        const state = this.stateManager.getSidebarState();
        const hasPersonalizedCache = this.stateManager.hasPersonalizedContentCache();
        const hasCanonicalContent = this.stateManager.hasCanonicalContent(); // Canonical = contributed

        // Personalization Toggle
        this.personalizationInput.disabled = !hasPersonalizedCache;
        this.personalizationInput.checked = hasPersonalizedCache && state.personalization;

        // Contributions Toggle
        this.contributionsInput.disabled = !hasCanonicalContent;
        this.contributionsInput.checked = hasCanonicalContent && state.contributions;

        // Ensure mutual exclusivity (only one can be checked)
        if (this.personalizationInput.checked && this.contributionsInput.checked) {
            // Prioritize personalization if both somehow get checked? Or contributions?
            // Let's prioritize showing contributions if both are enabled in state and available.
            this.personalizationInput.checked = false;
             this.stateManager.updateSidebarState({ personalization: false });
        }

        // Update global state variable (consider removing this global if possible)
        window.contentVersion = {
            hasPersonalization: this.personalizationInput.checked,
            hasContributions: this.contributionsInput.checked
        };
    }

    async loadPageLinks() {
        this.navList.innerHTML = ''; // Clear existing links
        try {
            // Add home link
            this.addNavLink('Home', '/');

            // Get list of markdown files
            const response = await fetch('/api/pages');
            const pages = await response.json();

            // Add links for each page
            pages.forEach(page => {
                // Tag count is handled by TagManager/StateManager if needed elsewhere,
                // not displaying in nav for now to simplify.
                this.addNavLink(this.formatPageName(page), `/${page}`);
            });

        } catch (error) {
            console.error('Error loading page links:', error);
            this.navList.innerHTML = '<li>Error loading pages</li>'; // Show error in UI
        }
    }

    addNavLink(text, href) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        a.textContent = text; // Simple text for now

        // Mark active page
        if (window.location.pathname === href || (href === '/' && window.location.pathname === '/index.html')) { // Adjust for potential index.html
            a.classList.add('active');
            // No need to update toggle state here, it's done in initializeUI/updateTogglesState
        }

        li.appendChild(a);
        this.navList.appendChild(li);
    }

    formatPageName(filename) {
        // Remove potential .md extension and capitalize
        const name = filename.replace(/\.md$/i, '');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    setupEventListeners() {
        // Sidebar open/close
        this.toggleButton.addEventListener('click', () => this.toggle());
        this.closeButton.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Toggle switch changes
        this.personalizationInput.addEventListener('change', (e) => this.handleToggleChange(e));
        this.contributionsInput.addEventListener('change', (e) => this.handleToggleChange(e));

        // TODO: Add listener for personalize popup submission
        const personalizeForm = document.getElementById('personalize-form'); // Assuming form has this ID
        if (personalizeForm) {
            personalizeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const promptInput = document.getElementById('personalization-prompt'); // Assuming input has this ID
                if (promptInput) {
                    this.handlePersonalize(promptInput.value);
                }
                this.closePersonalizePopup();
            });
        }
    }

    handleToggleChange(event) {
        const input = event.target;
        const type = input.dataset.toggleType; // 'personalization' or 'contributions'
        const isChecked = input.checked;

        // Update state via StateManager
        this.stateManager.updateSidebarState({ [type]: isChecked });

        // Ensure mutual exclusivity
        if (isChecked) {
            if (type === 'personalization') {
                this.contributionsInput.checked = false;
                 this.stateManager.updateSidebarState({ contributions: false });
            } else if (type === 'contributions') {
                this.personalizationInput.checked = false;
                 this.stateManager.updateSidebarState({ personalization: false });
            }
        }

        // Update global variable (consider removing)
        window.contentVersion = {
             hasPersonalization: this.personalizationInput.checked,
             hasContributions: this.contributionsInput.checked
         };

        // Refresh content displayed using ContentManager
        this.contentManager.updateContent().then(() => {
            // Update toggles again after content update, in case state changed during async operations
            this.updateTogglesState();
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

    showLoadingOverlay(showCancel = false) {
        let overlay = document.querySelector('.loading-process-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-process-overlay'; // Use a different class? e.g., 'action-overlay'
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1001'; // Above sidebar overlay

            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner'; // Reuse existing spinner style
            overlay.appendChild(spinner);

            if (showCancel) {
                const cancelButton = document.createElement('button');
                cancelButton.textContent = '×';
                cancelButton.className = 'overlay-cancel-button'; // Style this button
                cancelButton.style.position = 'absolute';
                cancelButton.style.top = '20px';
                cancelButton.style.right = '20px';
                cancelButton.style.fontSize = '24px';
                cancelButton.style.background = 'none';
                cancelButton.style.border = 'none';
                cancelButton.style.color = 'white';
                cancelButton.style.cursor = 'pointer';
                cancelButton.addEventListener('click', () => this.hideLoadingOverlay());
                overlay.appendChild(cancelButton);
            }
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-process-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // --- Personalization Flow ---
    openPersonalizePopup() {
        // Assuming popup HTML is already in the document (e.g., loaded via templates)
        const overlay = document.querySelector('.personalize-popup-overlay');
        const popup = document.querySelector('.personalize-popup');
        if (overlay && popup) {
            // Populate existing prompt if available
            const prefs = this.stateManager.getPersonalizationPrefs();
            const promptInput = document.getElementById('personalization-prompt');
            if (promptInput && prefs?.prompt) {
                promptInput.value = prefs.prompt;
            }
            overlay.classList.add('visible');
            popup.classList.add('visible');
        } else {
            console.error("Personalization popup elements not found.");
        }
    }

    closePersonalizePopup() {
         const overlay = document.querySelector('.personalize-popup-overlay');
         const popup = document.querySelector('.personalize-popup');
         if (overlay && popup) {
            overlay.classList.remove('visible');
            popup.classList.remove('visible');
         }
    }

    async handlePersonalize(promptText) {
        if (!promptText || !promptText.trim()) {
            alert('Please enter a personalization prompt.');
            return;
        }

        this.showLoadingOverlay();
        this.close(); // Close sidebar while processing

        try {
            // Fetch base content (moved fetch logic to ContentManager, but need raw here)
            let baseContent = this.stateManager.getCanonicalContent();
            if (!baseContent) {
                 // Use ContentManager's helper method if possible, or duplicate fetch logic carefully
                 // Let's assume ContentManager needs a method to get raw base content
                 // baseContent = await this.contentManager.getBaseMarkdown(); // Ideal
                 // --- Temporary duplication for now: ---
                 try {
                     const response = await fetch(`/api/content/${this.pageName}?raw=true`);
                     if (!response.ok) throw new Error('Failed to fetch base content');
                     const data = await response.json();
                     baseContent = data.rawMarkdown;
                     if (!baseContent) throw new Error('Raw markdown not found in response');
                 } catch (fetchError) {
                      console.error("Failed to fetch base content for personalization:", fetchError);
                      throw new Error("Could not load base content required for personalization.");
                 }
                 // --- End Temporary duplication ---
            }

            // 2. Define and save preferences
            const prefs = { prompt: promptText };
            this.stateManager.savePersonalizationPrefs(prefs);

            // 3. Call AI for personalization
            const personalizedMarkdown = await personalizeContent(baseContent, prefs);

            // 4. Save the result to cache via StateManager
            this.stateManager.savePersonalizedContentCache(personalizedMarkdown);

            // 5. Update toggle state and UI
            this.stateManager.updateSidebarState({ personalization: true, contributions: false });
            this.updateTogglesState(); // Reflect changes in UI toggles
            await this.contentManager.updateContent(); // Trigger ContentManager to display the new cache

        } catch (error) {
            console.error('Error during personalization:', error);
            alert(`An error occurred during personalization: ${error.message}`);
            // Optionally reset state if personalization fails
            this.stateManager.updateSidebarState({ personalization: false });
            this.updateTogglesState();
        } finally {
            this.hideLoadingOverlay();
        }
    }


    // --- Contribution Flow ---
    async handleContribute() {
        const tags = window.tagManager.getAllTags(); // Use the global instance for now
        if (!tags || tags.length === 0) {
             alert('No tags have been added to contribute.');
             return;
        }

        this.showLoadingOverlay();
        this.close(); // Close sidebar

        try {
            // Determine context: Are we contributing from personalized view?
            const currentState = this.stateManager.getSidebarState();
            const isPersonalized = currentState.personalization;

            // Fetch base canonical content (again, might need ContentManager helper or duplicate)
            let baseCanonicalContent = this.stateManager.getCanonicalContent();
            if (!baseCanonicalContent) {
                 // --- Temporary duplication for now: ---
                 try {
                    const response = await fetch(`/api/content/${this.pageName}?raw=true`);
                    if (!response.ok) throw new Error('Failed to fetch base content for contribution');
                    const data = await response.json();
                    baseCanonicalContent = data.rawMarkdown;
                    if (!baseCanonicalContent) throw new Error('Raw markdown not found in response for contribution');
                 } catch (fetchError) {
                     console.error("Failed to fetch base content for contribution:", fetchError);
                     throw new Error("Could not load base content required for contribution.");
                 }
                // --- End Temporary duplication ---
            }

            // Prepare context for ContributionProcessor
            const contributionContext = {
                canonicalContent: baseCanonicalContent,
                isPersonalizedView: isPersonalized,
                personalizedContent: isPersonalized ? this.stateManager.getPersonalizedContentCache() : null,
                personalizationPrefs: isPersonalized ? this.stateManager.getPersonalizationPrefs() : null,
            };

            // Validate context if contributing from personalized view
            if (isPersonalized && !contributionContext.personalizedContent) {
                throw new Error("Cannot contribute from personalized view: Cached personalized content not found.");
            }

            // Call the processor
            const updatedCanonicalContent = await this.contributionProcessor.contribute(contributionContext);

            // Save the new canonical content
            this.stateManager.saveCanonicalContent(updatedCanonicalContent);

            // Clear the personalized cache for this page, as it's now potentially outdated
            this.stateManager.clearPersonalizedContentCache();

            // Update UI state: Switch view to show the new contributions
            this.stateManager.updateSidebarState({ contributions: true, personalization: false });
            this.updateTogglesState(); // Update UI toggles
            await this.contentManager.updateContent(); // Refresh main content to show new canonical version

            // Maybe clear the tags from TagManager after successful contribution?
            // window.tagManager.clearAllTags(); // Needs implementation in TagManager
            // this.stateManager.saveTags([]); // Update storage

        } catch (error) {
            console.error('Error during contribution processing:', error);
            alert(`An error occurred while processing your contribution: ${error.message}`);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // --- Content Update Logic (Removed - Now in ContentManager) ---
    // async updateContent() { ... }
    // updateBackground(mode) { ... }
}

