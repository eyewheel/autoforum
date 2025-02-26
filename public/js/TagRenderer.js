import { TAG_CONFIG } from './constants.js';

export class TagRenderer {
    constructor(tagManager) {
        this.tagManager = tagManager;
        this.sidebarElement = document.getElementById('tag-sidebar');
        this.addTagButton = this.createAddTagButton();
        this.tagMenu = this.createTagMenu();

        if (!this.sidebarElement) {
            throw new Error('Tag sidebar element not found');
        }

        // Listen for window resize to adjust visible menus
        window.addEventListener('resize', () => {
            this.adjustVisibleMenus();
        });
    }

    createAddTagButton() {
        // Use the template instead of creating button with JS
        const template = document.getElementById('add-tag-button-template');
        if (!template) {
            console.warn('Add tag button template not found, waiting for templates to load');
            // Create a simple fallback button if template isn't available yet
            const button = document.createElement('button');
            button.className = 'selection-tag-icon';
            button.innerHTML = '+';
            button.dataset.description = 'Add Tag';
            button.id = 'add-tag-button';
            button.style.display = 'none';
            this.sidebarElement.appendChild(button);
            return button;
        }
        
        const button = template.content.cloneNode(true).querySelector('#add-tag-button');
        button.dataset.description = 'Add Tag';
        this.sidebarElement.appendChild(button);
        return button;
    }

    createTagMenu() {
        // Use the template instead of creating menu with JS
        const template = document.getElementById('add-tag-menu-template');
        if (!template) {
            console.warn('Tag menu template not found, waiting for templates to load');
            // Create a simple menu as fallback
            const menu = document.createElement('div');
            menu.className = 'tag-management-menu add-tag-menu';
            menu.style.display = 'none';
            document.body.appendChild(menu);
            return menu;
        }
        
        const menu = template.content.cloneNode(true).querySelector('.tag-management-menu');
        document.body.appendChild(menu);
        
        // Get the buttons container
        const buttonsContainer = menu.querySelector('.tag-buttons-container');
        
        // Create separate containers for reactions and additions
        const reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'reactions-container';
        
        const reactionsTitle = document.createElement('h4');
        reactionsTitle.className = 'section-title';
        reactionsTitle.textContent = 'Reactions';
        reactionsContainer.appendChild(reactionsTitle);
        
        const additionsContainer = document.createElement('div');
        additionsContainer.className = 'additions-container';
        
        const additionsTitle = document.createElement('h4');
        additionsTitle.className = 'section-title';
        additionsTitle.textContent = 'Additions';
        additionsContainer.appendChild(additionsTitle);
        
        // Categorize and add tag buttons
        Object.entries(TAG_CONFIG).forEach(([type, config]) => {
            const tagButtonTemplate = document.getElementById('tag-button-template');
            const button = tagButtonTemplate.content.cloneNode(true).querySelector('.tag-button');
            
            button.textContent = config.displayName;
            button.dataset.tagType = type;
            button.dataset.icon = config.icon;
            button.dataset.description = config.description;
            button.style.color = config.color;
            
            // Add to the appropriate container based on whether it requires custom text
            if (config.requiresCustomText) {
                additionsContainer.appendChild(button);
            } else {
                reactionsContainer.appendChild(button);
            }
        });
        
        // Add containers to the buttons container
        buttonsContainer.appendChild(reactionsContainer);
        buttonsContainer.appendChild(additionsContainer);
        
        // Add event listeners for input handling
        const inputContainer = menu.querySelector('.tag-input-container');
        const input = menu.querySelector('.tag-input');
        const submitButton = menu.querySelector('.tag-submit');
        
        // Prevent menu from closing when clicking on input or button
        inputContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        inputContainer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        // Set up textarea auto-resize
        this.setupTextareaAutoResize(input);
        
        return menu;
    }

    // Add method to handle textarea auto-resize
    setupTextareaAutoResize(textarea) {
        if (!textarea) return;
        
        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(120, textarea.scrollHeight) + 'px';
        };
        
        textarea.addEventListener('input', adjustHeight);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Let the textarea naturally grow to accommodate the new line
                setTimeout(adjustHeight, 0);
            }
        });
    }

    hideMenus() {
        this.tagMenu.style.display = 'none';
        this.addTagButton.style.display = 'none';
        document.querySelectorAll('.tag-management-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    renderParagraph(elementId) {
        // Check if we're in personalization mode
        if (window.contentVersion && window.contentVersion.hasPersonalization) {
            if (this.sidebarElement) {
                this.sidebarElement.style.display = 'none';
            }
            return;
        }

        // Show the tag sidebar if it was hidden
        if (this.sidebarElement) {
            this.sidebarElement.style.display = 'block';
        }

        const element = document.getElementById(elementId);
        if (!element || !element.dataset.originalText) {
            console.error('Element or original text not found:', elementId);
            return;
        }

        // Clear existing content and restore original text
        const originalText = element.dataset.originalText;
        element.innerHTML = originalText;

        // Clear existing sidebar icons for this element
        this.clearSidebarIcons(elementId);

        // Get and sort tags
        const tags = this.tagManager.getTagsForParagraph(elementId);
        if (!tags.length) return;

        // Trigger a complete recalculation of all tag positions
        // This ensures proper positioning after add/edit/delete operations
        this.recalculateAllTagPositions();
    }

    // New method to recalculate all tag positions properly
    recalculateAllTagPositions() {
        // First, collect all paragraphs with tags
        const paragraphIds = this.tagManager.getAllParagraphIds();
        
        // Next, get all tags across all paragraphs
        const allTags = [];
        paragraphIds.forEach(paragraphId => {
            const paragraphTags = this.tagManager.getTagsForParagraph(paragraphId);
            paragraphTags.forEach(tag => {
                // Find the selection for this paragraph
                const selection = tag.selections.find(s => s.paragraphId === paragraphId);
                if (selection) {
                    allTags.push({
                        tag,
                        paragraphId,
                        selection
                    });
                }
            });
        });
        
        // Remove all existing tag icons
        const existingIcons = Array.from(this.sidebarElement.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'));
        existingIcons.forEach(icon => icon.remove());
        
        // Calculate the desired position for each tag
        allTags.forEach(({ tag, paragraphId, selection }) => {
            const element = document.getElementById(paragraphId);
            if (!element) return;
            
            const iconElement = this.createTagIcon(tag);
            const position = this.calculateElementPosition(selection, iconElement);
            if (position !== null) {
                iconElement.dataset.desiredPosition = position;
                iconElement.dataset.tagId = tag.id; // Ensure tag ID is preserved
                // Don't add to DOM yet
                iconElement.style.position = 'absolute';
                document.body.appendChild(iconElement); // Temporarily add to get dimensions
            }
        });
        
        // Sort all tags by their desired position
        const iconsToPosition = Array.from(document.body.querySelectorAll('.selection-tag-icon[data-desired-position]'))
            .sort((a, b) => parseFloat(a.dataset.desiredPosition) - parseFloat(b.dataset.desiredPosition));
        
        // Now position each icon, adjusting to prevent overlaps
        let lastPosition = -20; // Initialize with a reasonable starting offset
        
        iconsToPosition.forEach(icon => {
            const desiredPosition = parseFloat(icon.dataset.desiredPosition);
            let newPosition = desiredPosition;
            
            // Ensure minimum spacing between icons
            if (newPosition < lastPosition + 35) { // Use icon height + small gap
                newPosition = lastPosition + 35;
            }
            
            icon.style.top = `${newPosition}px`;
            lastPosition = newPosition;
            
            // Move from temporary body location to sidebar
            document.body.removeChild(icon);
            this.sidebarElement.appendChild(icon);
            
            // Clean up temporary attribute
            delete icon.dataset.desiredPosition;
        });
    }

    highlightParagraphSelection(element, selection, tag) {
        // We need a more robust approach to handle elements with nested structure
        if (!element || !element.dataset.originalText) return;
        
        const originalHTML = element.dataset.originalText;
        
        // Create a temporary container to work with
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = originalHTML;
        
        // Create a document fragment to build our highlighted content
        const fragment = document.createDocumentFragment();
        const config = TAG_CONFIG[tag.tagType];
        const highlightClass = `tagged-${tag.tagType}-highlighted`;
        const style = `background-color: ${config.backgroundColor};`;
        
        try {
            // Find the text nodes and create ranges
            const startNodeInfo = this.findTextNodeAtOffset(tempContainer, selection.startOffset);
            const endNodeInfo = this.findTextNodeAtOffset(tempContainer, selection.endOffset);
            
            if (!startNodeInfo || !endNodeInfo) {
                // Fall back to the simpler approach if we can't find nodes
                element.innerHTML = originalHTML;
                return;
            }
            
            // Create the highlight span
            const highlightSpan = document.createElement('span');
            highlightSpan.className = `tagged-selection ${highlightClass}`;
            highlightSpan.dataset.tagId = tag.id;
            highlightSpan.style = style;
            
            // Clone the element to preserve its structure
            const clone = element.cloneNode(true);
            clone.innerHTML = originalHTML;
            
            // Create a range that encompasses the selection
            const range = document.createRange();
            const startNode = this.findTextNodeAtOffset(clone, selection.startOffset);
            const endNode = this.findTextNodeAtOffset(clone, selection.endOffset);
            
            if (startNode && endNode) {
                range.setStart(startNode.node, startNode.offset);
                range.setEnd(endNode.node, endNode.offset);
                
                // Surround the range with our highlight span
                try {
                    range.surroundContents(highlightSpan);
                    element.innerHTML = clone.innerHTML;
                    return;
                } catch (e) {
                    console.warn('Could not surround range, using fallback method', e);
                }
            }
            
            // Fallback to original simple method
            const originalText = element.textContent;
            const beforeText = originalText.substring(0, selection.startOffset);
            const selectedText = originalText.substring(selection.startOffset, selection.endOffset);
            const afterText = originalText.substring(selection.endOffset);
            
            element.innerHTML = `${beforeText}<span class="tagged-selection ${highlightClass}"
                data-tag-id="${tag.id}" style="${style}">${selectedText}</span>${afterText}`;
        } catch (error) {
            console.error('Error highlighting selection:', error);
            // Reset to original content on error
            element.innerHTML = originalHTML;
        }
    }

    renderTag(tag, element) {
        // Create sidebar icon with enhanced styling
        const iconElement = this.createTagIcon(tag);

        // Find the selection for this element
        const selection = tag.selections.find(s => s.paragraphId === element.id);
        if (selection) {
            const position = this.calculateElementPosition(selection, iconElement);
            if (position !== null) {
                // Set initial position but actual positioning will be handled by recalculateAllTagPositions
                iconElement.style.top = `${position}px`;
                this.sidebarElement.appendChild(iconElement);
            }
        }
    }

    createTagIcon(tag) {
        const config = TAG_CONFIG[tag.tagType];
        const icon = document.createElement('span');
        icon.className = `selection-tag-icon selection-tag-icon-${tag.tagType}`;
        icon.textContent = config.icon;
        icon.dataset.displayName = config.displayName;
        icon.dataset.description = config.description;
        icon.dataset.tagId = tag.id;
        icon.style.color = config.color;

        // Add custom text indicator if present
        if (tag.customText) {
            icon.classList.add('has-custom-text');
            icon.dataset.customText = tag.customText;
        }

        // Set paragraphIds for multi-paragraph tags
        icon.dataset.paragraphId = tag.selections.map(s => s.paragraphId).join(',');

        // Create management menu
        const menu = this.createTagManagementMenu(tag);
        menu.dataset.tagIconId = tag.id;
        document.body.appendChild(menu);

        // Add hover handlers
        this.addTagIconListeners(icon, tag);

        return icon;
    }

    createTagManagementMenu(tag) {
        // Use the template instead of creating menu with JS
        const template = document.getElementById('tag-management-menu-template');
        if (!template) {
            console.warn('Tag management menu template not found, waiting for templates to load');
            // Create a simple fallback menu
            const menu = document.createElement('div');
            menu.className = 'tag-management-menu tag-icon-menu';
            menu.style.display = 'none';
            return menu;
        }
        
        const menu = template.content.cloneNode(true).querySelector('.tag-management-menu');
        
        // Get the buttons container
        const buttonsContainer = menu.querySelector('.tag-buttons-container');
        
        // Create separate containers for reactions and additions
        const reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'reactions-container';
        
        const reactionsTitle = document.createElement('h4');
        reactionsTitle.className = 'section-title';
        reactionsTitle.textContent = 'Reactions';
        reactionsContainer.appendChild(reactionsTitle);
        
        const additionsContainer = document.createElement('div');
        additionsContainer.className = 'additions-container';
        
        const additionsTitle = document.createElement('h4');
        additionsTitle.className = 'section-title';
        additionsTitle.textContent = 'Additions';
        additionsContainer.appendChild(additionsTitle);
        
        // Categorize and add type change buttons
        Object.entries(TAG_CONFIG).forEach(([type, config]) => {
            const tagButtonTemplate = document.getElementById('tag-button-template');
            const button = tagButtonTemplate.content.cloneNode(true).querySelector('.tag-button');
            
            button.textContent = config.displayName;
            button.dataset.newType = type;
            button.dataset.icon = config.icon;
            button.dataset.description = config.description;
            button.style.color = config.color;
            
            // Add to the appropriate container based on whether it requires custom text
            if (config.requiresCustomText) {
                additionsContainer.appendChild(button);
            } else {
                reactionsContainer.appendChild(button);
            }
        });
        
        // Add containers to the buttons container
        buttonsContainer.appendChild(reactionsContainer);
        buttonsContainer.appendChild(additionsContainer);
        
        // Add delete button
        const deleteButtonTemplate = document.getElementById('delete-button-template');
        const deleteButton = deleteButtonTemplate.content.cloneNode(true).querySelector('.delete-tag');
        deleteButton.dataset.description = 'Delete this tag';
        buttonsContainer.appendChild(deleteButton);
        
        // Add custom text if present
        if (tag.customText) {
            const textDisplay = document.createElement('div');
            textDisplay.className = 'tag-custom-text';
            textDisplay.textContent = tag.customText;
            menu.querySelector('.tag-custom-text-container').appendChild(textDisplay);
        }
        
        // Set up input for custom text if needed
        const inputContainer = menu.querySelector('.tag-input-container');
        const input = menu.querySelector('.tag-input');
        
        // Only show input container if the tag type requires custom text
        const tagConfig = TAG_CONFIG[tag.tagType];
        inputContainer.style.display = tagConfig.requiresCustomText ? 'flex' : 'none';
        
        if (tag.customText) {
            input.value = tag.customText;
        }
        
        // Set up textarea auto-resize
        this.setupTextareaAutoResize(input);
        
        // Add click handler to menu buttons
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
            const tagId = menu.dataset.tagIconId;
            if (!tagId) return;

            if (event.target.dataset.newType) {
                const newType = event.target.dataset.newType;
                
                // Check if the new type requires custom text
                if (TAG_CONFIG[newType].requiresCustomText) {
                    // Show input container
                    inputContainer.style.display = 'flex';
                    input.focus();
                    
                    // Update the submit button's click handler for this specific action
                    const submitButton = menu.querySelector('.tag-submit');
                    const handleCustomTextSubmit = () => {
                        const customText = input.value.trim();
                        if (customText) {
                            this.tagManager.updateTag(tagId, newType, customText);
                            
                            const tagIcon = document.querySelector(`.selection-tag-icon[data-tag-id="${tagId}"]`);
                            if (tagIcon) {
                                const paragraphIds = tagIcon.dataset.paragraphId.split(',');
                                paragraphIds.forEach(paragraphId => {
                                    this.renderParagraph(paragraphId);
                                });
                            }
                            
                            menu.style.display = 'none';
                            inputContainer.style.display = 'none';
                            
                            // Remove this one-time event listener
                            submitButton.removeEventListener('click', handleCustomTextSubmit);
                        }
                    };
                    
                    // Add one-time event listener
                    submitButton.addEventListener('click', handleCustomTextSubmit);
                    
                    // Also handle enter key
                    const handleEnterKey = (e) => {
                        if (e.key === 'Enter') {
                            handleCustomTextSubmit();
                            input.removeEventListener('keydown', handleEnterKey);
                        }
                    };
                    input.addEventListener('keydown', handleEnterKey);
                    
                    return;
                } else {
                    // Hide input container for types that don't require custom text
                    inputContainer.style.display = 'none';
                    this.tagManager.updateTagType(tagId, newType);
                }

                const tagIcon = document.querySelector(`.selection-tag-icon[data-tag-id="${tagId}"]`);
                if (tagIcon) {
                    const paragraphIds = tagIcon.dataset.paragraphId.split(',');
                    paragraphIds.forEach(paragraphId => {
                        this.renderParagraph(paragraphId);
                    });
                }
            } else if (event.target.classList.contains('delete-tag')) {
                this.tagManager.deleteTag(tagId);
                const tagIcon = document.querySelector(`.selection-tag-icon[data-tag-id="${tagId}"]`);
                if (tagIcon) {
                    const paragraphIds = tagIcon.dataset.paragraphId.split(',');
                    paragraphIds.forEach(paragraphId => {
                        this.renderParagraph(paragraphId);
                    });
                }
            }
            menu.style.display = 'none';
        });
        
        // Prevent menu from closing when clicking on input
        inputContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        inputContainer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        // Add a method to show the menu properly positioned
        const showMenuForIcon = (icon) => {
            this.positionMenu(menu, icon);
        };
        
        // Store the show function on the menu
        menu.showForIcon = showMenuForIcon;

        return menu;
    }

    addTagIconListeners(icon, tag) {
        icon.addEventListener('mouseenter', () => {
            tag.selections.forEach(selection => {
                const element = document.getElementById(selection.paragraphId);
                if (element) {
                    if (!element.dataset.originalText) {
                        element.dataset.originalText = element.textContent;
                    }
                    this.highlightParagraphSelection(element, selection, tag);
                }
            });
        });

        icon.addEventListener('mouseleave', () => {
            tag.selections.forEach(selection => {
                const element = document.getElementById(selection.paragraphId);
                if (element) {
                    element.innerHTML = element.dataset.originalText;
                }
            });
        });

        // Add click handler to show menu
        icon.addEventListener('click', (e) => {
            // We'll let the TagEvents class handle this through its existing handleTagIconClick
            // No need to do anything here as it's already handled
        });
    }

    calculateElementPosition(selection, element) {
        let rects;

        if (selection instanceof Selection) {
            const range = selection.getRangeAt(0);
            rects = range.getClientRects();
        } else {
            const contentElement = document.getElementById(selection.paragraphId);
            if (!contentElement) return null;

            // Create range more robustly to handle different element structures
            const range = document.createRange();
            
            // Find appropriate text nodes and create range
            let startNode = this.findTextNodeAtOffset(contentElement, selection.startOffset);
            let endNode = this.findTextNodeAtOffset(contentElement, selection.endOffset);
            
            if (!startNode || !endNode) {
                console.error('Unable to find text nodes for selection', selection);
                return null;
            }
            
            // Set range positions
            range.setStart(startNode.node, startNode.offset);
            range.setEnd(endNode.node, endNode.offset);
            
            rects = range.getClientRects();
        }

        if (!rects.length) return null;

        const sidebarRect = this.sidebarElement.getBoundingClientRect();
        const elementHeight = 32; // Fixed height for consistency
        const position = (rects[0].top + rects[rects.length - 1].bottom) / 2 - (elementHeight / 2) - sidebarRect.top;

        return position;
    }

    findTextNodeAtOffset(element, targetOffset) {
        let currentOffset = 0;
        let result = null;
        
        // Function to traverse nodes recursively
        const findNode = (node) => {
            if (result) return; // Already found
            
            if (node.nodeType === Node.TEXT_NODE) {
                if (currentOffset + node.length >= targetOffset) {
                    // Found the node containing our target offset
                    result = {
                        node: node,
                        offset: targetOffset - currentOffset
                    };
                    return;
                }
                currentOffset += node.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Traverse child nodes
                for (let i = 0; i < node.childNodes.length; i++) {
                    findNode(node.childNodes[i]);
                    if (result) return; // Stop if found
                }
            }
        };
        
        findNode(element);
        return result;
    }

    updateAddTagButtonPosition(selection, animate = false) {
        if (!selection) {
            this.addTagButton.style.display = 'none';
            document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
                icon.style.opacity = '1';
                icon.style.transform = 'translateX(0)';
            });
            return;
        }

        const position = this.calculateElementPosition(selection, this.addTagButton);
        if (position === null) return;

        const currentTop = this.addTagButton.style.display !== 'none' ? 
            parseFloat(this.addTagButton.style.top) : null;
        
        // Handle animation
        if (animate && currentTop !== null && this.addTagButton.style.display === 'flex') {
            // Add transition for smooth movement
            this.addTagButton.style.transition = 'top 0.2s ease-out';
            
            // Schedule removal of the transition property
            setTimeout(() => {
                this.addTagButton.style.transition = '';
            }, 200);
        } else {
            this.addTagButton.style.transition = '';
        }
        
        this.addTagButton.style.top = `${position}px`;
        this.addTagButton.style.display = 'flex';

        const addButtonRect = this.addTagButton.getBoundingClientRect();
        const buttonTop = addButtonRect.top;
        const buttonBottom = addButtonRect.bottom;

        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
            icon.style.opacity = '1';
            icon.style.transform = 'translateX(0)';

            const iconRect = icon.getBoundingClientRect();
            if (!(iconRect.bottom < buttonTop || iconRect.top > buttonBottom)) {
                icon.style.opacity = '0.5';
                icon.style.transform = 'translateX(15px)';
            }
        });
    }

    findAvailablePosition(desiredPosition) {
        const existingTags = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
            .map(icon => {
                const top = parseFloat(icon.style.top);
                const rect = icon.getBoundingClientRect();
                return {
                    top: top,
                    bottom: top + rect.height
                };
            })
            .filter(pos => !isNaN(pos.top))
            .sort((a, b) => a.top - b.top);

        let position = desiredPosition;
        let found = false;

        while (!found) {
            found = true;
            for (let tag of existingTags) {
                if (Math.abs(tag.top - position) < 10 ||
                    (position > tag.top - 10 && position < tag.bottom + 10)) {
                    position = tag.bottom + 10;
                    found = false;
                    break;
                }
            }
        }

        return position;
    }

    clearSidebarIcons(elementId) {
        const icons = Array.from(this.sidebarElement.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'));
        icons.forEach(icon => {
            const paragraphIds = icon.dataset.paragraphId?.split(',') || [];
            if (paragraphIds.includes(elementId)) {
                icon.remove();
            }
        });
    }

    // Add a new method to position the menu and ensure it's visible
    positionMenu(menu, referenceElement) {
        // Reset any previous width adjustments
        menu.style.width = '';
        menu.style.minWidth = '220px';
        menu.style.maxWidth = '300px';
        
        // Make sure the menu is visible so we can get its dimensions
        menu.style.display = 'flex';
        menu.style.visibility = 'hidden'; // Hide it visually until positioning is complete
        
        // Get element and viewport dimensions
        const elementRect = referenceElement.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate initial position (to the right of the element)
        let left = elementRect.right + 10;
        let top = elementRect.top;
        
        // Check if menu would go off right edge of screen
        if (left + menuRect.width > viewportWidth - 20) {
            // Position to the left of the element instead
            left = elementRect.left - menuRect.width - 10;
            
            // If still off screen on the left, align with left edge of viewport
            if (left < 20) {
                left = 20;
                
                // If we're constrained on both sides, adjust the width
                let availableWidth = viewportWidth - 40; // 20px margin on each side
                
                // Don't make it too small
                availableWidth = Math.max(availableWidth, 150);
                
                menu.style.width = `${availableWidth}px`;
                menu.style.minWidth = `${availableWidth}px`;
                menu.style.maxWidth = `${availableWidth}px`;
            }
        }
        
        // Check if menu would go off bottom edge of screen
        if (top + menuRect.height > viewportHeight - 20) {
            // Align bottom of menu with bottom of viewport
            top = viewportHeight - menuRect.height - 20;
            
            // Don't let it go above the top edge
            top = Math.max(top, 20);
        }
        
        // Set final position
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = ''; // Make it visible again
        
        return menu;
    }
    
    // Function to adjust all visible menus
    adjustVisibleMenus() {
        const visibleMenus = document.querySelectorAll('.tag-management-menu[style*="display: flex"]');
        visibleMenus.forEach(menu => {
            // Find the associated tag icon
            const tagId = menu.dataset.tagIconId;
            if (tagId) {
                const icon = document.querySelector(`.selection-tag-icon[data-tag-id="${tagId}"]`);
                if (icon) {
                    this.positionMenu(menu, icon);
                }
            } else if (menu === this.tagMenu) {
                // For the add tag menu
                this.positionMenu(menu, this.addTagButton);
            }
        });
    }
}
