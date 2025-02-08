import { DEFAULT_TAGS } from './defaultTags.js';
import { CONSTANTS } from './constants.js';

export class Sidebar {
    constructor() {
        this.isOpen = false;
        this.initialize();
    }

    initialize() {
        this.createSidebar();
        this.loadPages();
        this.setupEventListeners();
        this.ensureDefaultTagsLoaded();
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
        
        const navList = document.createElement('ul');
        navList.className = 'nav-sidebar-links';
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'nav-sidebar-toggle';
        toggleButton.innerHTML = '☰';

        // Create overlay for click-outside
        const overlay = document.createElement('div');
        overlay.className = 'nav-sidebar-overlay';
        
        // Assemble sidebar
        content.appendChild(title);
        content.appendChild(navList);
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
        
        // Mark active page
        if (window.location.pathname === href) {
            a.classList.add('active');
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
}