import { TAG_CONFIG } from './constants.js';

export class TagEvents {
    constructor(tagManager, tagRenderer) {
        this.tagManager = tagManager;
        this.tagRenderer = tagRenderer;
        this.currentSelection = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Selection handling
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));

        // Add tag button handling
        const addTagButton = this.tagRenderer.addTagButton;
        addTagButton.addEventListener('mousedown', this.handleAddTagButtonMouseDown.bind(this));
        addTagButton.addEventListener('click', this.handleAddTagButtonClick.bind(this));

        // Tag menu handling
        const tagMenu = this.tagRenderer.tagMenu;
        tagMenu.addEventListener('click', this.handleTagMenuClick.bind(this));
        tagMenu.addEventListener('mousedown', e => e.stopPropagation());

        // Tag icon management menus
        document.addEventListener('click', this.handleTagIconClick.bind(this));

        // Custom text input handling
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(event) {
        // Handle Enter key in custom text input
        if (event.key === 'Enter' && event.target.classList.contains('tag-input')) {
            const menu = event.target.closest('.tag-management-menu');
            const submitButton = menu?.querySelector('.tag-submit');
            if (submitButton) {
                submitButton.click();
            }
        }
    }

    handleMouseUp(event) {
        // Don't update position if clicking the add tag button itself
        if (event.target.closest('#add-tag-button')) {
            return;
        }

        // Hide menus if clicking outside them and their buttons
        if (!event.target.closest('.tag-management-menu') &&
            !event.target.closest('.selection-tag-icon')) {
            document.querySelectorAll('.tag-management-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }

        // Use a timeout to allow the selection to be fully updated
        setTimeout(() => {
            const selection = window.getSelection();
            const selectionText = selection.toString().trim();

            // Check if we're in a non-default mode
            if (window.contentVersion && (window.contentVersion.hasContributions || window.contentVersion.hasPersonalization)) {
                this.tagRenderer.addTagButton.style.display = 'none';
                return;
            }

            // Clear previous selections if we have a new valid selection or no selection
            if (selection.isCollapsed || !selectionText) {
                this.tagRenderer.addTagButton.style.display = 'none';
                document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
                    icon.style.opacity = '1';
                    icon.style.transform = 'translateX(0)';
                });
                return;
            }

            // Check if selection is within sidebar or other UI elements
            if (this.isSelectionInUIElement(selection)) {
                this.tagRenderer.addTagButton.style.display = 'none';
                return;
            }

            // Process the new selection
            const selectionInfo = this.getSelectionInfo(selection);
            if (selectionInfo) {
                // Only update if we actually have a valid selection
                this.currentSelection = selectionInfo;
                
                // Smoothly transition the button position rather than teleporting
                const button = this.tagRenderer.addTagButton;
                const currentTop = button.style.display !== 'none' ? 
                    parseInt(button.style.top) : null;
                
                // Animate the transition if it's currently visible
                if (button.style.display === 'flex' && currentTop !== null) {
                    this.tagRenderer.updateAddTagButtonPosition(selection, true); // true = animate
                } else {
                    this.tagRenderer.updateAddTagButtonPosition(selection);
                }
            }
        }, 50);
    }

    handleMouseDown(event) {
        if (!event.target.closest('.paragraph') &&
            !event.target.closest('#tag-sidebar') &&
            !event.target.closest('.tag-management-menu')) {
            this.hideAllMenus();
            window.getSelection().removeAllRanges();
        }
    }

    handleAddTagButtonMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        this.currentSelection = this.getSelectionInfo(window.getSelection());
    }

    handleAddTagButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.currentSelection) {
            this.handleTagIconClick(event);
        }
    }

    handleTagMenuClick(event) {
        // Handle tag type selection
        const tagType = event.target.dataset.tagType;
        if (!tagType || !this.currentSelection) return;

        // Check if custom text is required
        if (TAG_CONFIG[tagType].requiresCustomText) {
            const menu = event.target.closest('.tag-management-menu');
            const inputContainer = menu.querySelector('.tag-input-container');
            const input = menu.querySelector('.tag-input');

            // Show input container
            inputContainer.style.display = 'flex';
            input.focus();

            // Handle submit button click
            const submitButton = menu.querySelector('.tag-submit');
            const handleSubmit = () => {
                const customText = input.value.trim();
                if (customText) {
                    var tag = this.createTag(tagType, customText);
                    console.log(tag);
                    input.value = '';
                    inputContainer.style.display = 'none';
                    this.hideAllMenus();
                }
            };

            submitButton.onclick = handleSubmit;
            return;
        }

        // Create tag without custom text
        this.createTag(tagType);
    }

    createTag(tagType, customText = null) {
        const tag = this.tagManager.addTag(
            null,
            this.currentSelection.selections,
            tagType,
            customText
        );

        // Render all affected paragraphs
        new Set(this.currentSelection.selections.map(s => s.paragraphId))
            .forEach(paragraphId => {
                this.tagRenderer.renderParagraph(paragraphId);
            });

        this.hideAllMenus();
        window.getSelection().removeAllRanges();
        return tag;
    }

    handleTagIconClick(event) {
        const icon = event.target.closest('.selection-tag-icon');
        if (!icon) return;

        // Get appropriate menu based on icon type
        let menu;
        if (icon.id === 'add-tag-button') {
            menu = this.tagRenderer.tagMenu;
        } else {
            const tagId = icon.dataset.tagId;
            menu = document.querySelector(`.tag-management-menu[data-tag-icon-id="${tagId}"]`);
        }
        if (!menu) return;

        // Only proceed if this is not a click on the menu itself
        if (!event.target.closest('.tag-management-menu')) {
            // Hide all other menus first
            document.querySelectorAll('.tag-management-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });

            // Toggle current menu
            const isVisible = menu.style.display === 'flex';
            
            if (isVisible) {
                menu.style.display = 'none';
            } else {
                // Show/hide input container based on tag type requirements
                const inputContainer = menu.querySelector('.tag-input-container');
                if (inputContainer) {
                    if (icon.id === 'add-tag-button') {
                        // For add tag button, initially hide the input
                        inputContainer.style.display = 'none';
                    } else {
                        // For existing tags, check if the tag type requires custom text
                        const tagId = icon.dataset.tagId;
                        const tag = this.tagManager.getTagById(tagId);
                        if (tag) {
                            const tagConfig = this.tagRenderer.tagManager.getTagConfig(tag.tagType);
                            inputContainer.style.display = tagConfig.requiresCustomText ? 'flex' : 'none';
                        }
                    }
                }

                // Use the new positioning function
                this.tagRenderer.positionMenu(menu, icon);
            }
        }
    }

    getSelectionInfo(selection) {
        if (!selection || selection.isCollapsed) return null;

        const range = selection.getRangeAt(0);
        const startElement = range.startContainer.nodeType === Node.TEXT_NODE ?
            range.startContainer.parentElement.closest('.paragraph, h1, h2, h3, h4, h5, h6, div, span, section') :
            range.startContainer.closest('.paragraph, h1, h2, h3, h4, h5, h6, div, span, section');

        const endElement = range.endContainer.nodeType === Node.TEXT_NODE ?
            range.endContainer.parentElement.closest('.paragraph, h1, h2, h3, h4, h5, h6, div, span, section') :
            range.endContainer.closest('.paragraph, h1, h2, h3, h4, h5, h6, div, span, section');

        if (!startElement || !endElement) return null;

        const selections = [];
        let currentElement = startElement;

        while (currentElement) {
            // Ensure the element has an ID for reference
            if (!currentElement.id) {
                currentElement.id = `content-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            }
            
            const elementId = currentElement.id;
            if (!currentElement.dataset.originalText) {
                currentElement.dataset.originalText = currentElement.textContent;
            }

            const elementText = currentElement.dataset.originalText;
            const startOffset = currentElement === startElement ?
                this.getTextOffset(startElement, range.startContainer, range.startOffset) : 0;
            const endOffset = currentElement === endElement ?
                this.getTextOffset(endElement, range.endContainer, range.endOffset) :
                elementText.length;

            selections.push({
                paragraphId: elementId, // Keep the property name for compatibility
                startOffset,
                endOffset,
                selectedText: elementText.substring(startOffset, endOffset)
            });

            if (currentElement === endElement) break;
            
            // More robust traversal to get next element
            currentElement = this.getNextContentElement(currentElement, endElement);
        }

        return { selections };
    }

    getTextOffset(paragraph, container, offset) {
        let textOffset = 0;
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        let node;

        while ((node = walker.nextNode())) {
            if (node === container) {
                return textOffset + offset;
            }
            textOffset += node.length;
        }
        return textOffset;
    }

    // New helper method to traverse between content elements
    getNextContentElement(current, end) {
        // Try next sibling first
        let next = current.nextElementSibling;
        if (next && this.isContentElement(next)) {
            return next;
        }
        
        // Otherwise, start traversing the DOM
        let node = current;
        while (node) {
            // Go to next sibling or up to parent's next sibling
            while (!node.nextElementSibling && node.parentElement) {
                node = node.parentElement;
            }
            
            if (!node.nextElementSibling) {
                return null; // No more elements
            }
            
            node = node.nextElementSibling;
            
            // Check if this node is a content element
            if (this.isContentElement(node)) {
                return node;
            }
            
            // Check if there's a content element inside this node
            const nestedContent = node.querySelector('.paragraph, h1, h2, h3, h4, h5, h6');
            if (nestedContent) {
                return nestedContent;
            }
        }
        
        return null;
    }

    // Helper to check if an element is a taggable content element
    isContentElement(element) {
        return element.classList.contains('paragraph') || 
               /^h[1-6]$/i.test(element.tagName) ||
               (element.tagName === 'DIV' && element.textContent.trim() !== '');
    }

    hideAllMenus() {
        this.tagRenderer.tagMenu.style.display = 'none';
        this.tagRenderer.addTagButton.style.display = 'none';
        document.querySelectorAll('.tag-management-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    // Add this new helper method to check if a selection is within a UI element
    isSelectionInUIElement(selection) {
        if (!selection || selection.isCollapsed) return true;
        
        const range = selection.getRangeAt(0);
        
        // Check if either the start or end container is in a UI element
        const startElement = range.startContainer.nodeType === Node.TEXT_NODE ?
            range.startContainer.parentElement : range.startContainer;
        
        const endElement = range.endContainer.nodeType === Node.TEXT_NODE ?
            range.endContainer.parentElement : range.endContainer;
        
        // Function to check if an element is part of the UI rather than content
        const isUIElement = (element) => {
            if (!element) return false;
            
            // Check for sidebar elements
            if (element.closest('.nav-sidebar, .nav-sidebar-toggle, .nav-sidebar-content, .nav-sidebar-links, .tag-sidebar, .personalize-popup, .contribute-overlay, .toggle-container')) {
                return true;
            }
            
            // Check for tag management elements
            if (element.closest('.tag-management-menu, .selection-tag-icon')) {
                return true;
            }
            
            // Check if the element is outside the main content area
            const contentContainer = document.getElementById('content');
            if (contentContainer && !contentContainer.contains(element)) {
                return true;
            }
            
            return false;
        };
        
        return isUIElement(startElement) || isUIElement(endElement);
    }
}
