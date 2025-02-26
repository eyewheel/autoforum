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
    }

    createAddTagButton() {
        const button = document.createElement('button');
        button.className = 'selection-tag-icon';
        button.innerHTML = '+';
        button.dataset.description = 'Add Tag';
        button.id = 'add-tag-button';
        button.style.display = 'none';
        this.sidebarElement.appendChild(button);
        return button;
    }

    createTagMenu() {
        const menu = document.createElement('div');
        menu.className = 'tag-management-menu add-tag-menu';
        menu.style.position = 'absolute';
        menu.style.display = 'none';
        document.body.appendChild(menu);

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'tag-buttons-container';
        menu.appendChild(buttonsContainer);

        // Add tag type buttons with enhanced info
        Object.entries(TAG_CONFIG).forEach(([type, config]) => {
            const button = document.createElement('button');
            button.textContent = config.displayName;
            button.dataset.tagType = type;
            button.dataset.icon = config.icon;
            button.dataset.description = config.description;
            button.style.color = config.color;
            buttonsContainer.appendChild(button);
        });

        // Add input container for custom text
        const inputContainer = document.createElement('div');
        inputContainer.className = 'tag-input-container';
        inputContainer.style.display = 'none';
        menu.appendChild(inputContainer);

        // Add input field
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter custom text...';
        input.className = 'tag-input';
        inputContainer.appendChild(input);

        // Add submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'tag-submit';
        submitButton.innerHTML = '→';
        submitButton.title = 'Submit';
        inputContainer.appendChild(submitButton);

        return menu;
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

        // Render tag icons and their hover handlers
        tags.forEach(tag => {
            this.renderTag(tag, element);
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
                const adjustedPosition = this.findAvailablePosition(position);
                iconElement.style.top = `${adjustedPosition}px`;
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
        const menu = document.createElement('div');
        menu.className = 'tag-management-menu tag-icon-menu';
        menu.style.position = 'absolute';
        menu.style.display = 'none';

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'tag-buttons-container';
        menu.appendChild(buttonsContainer);

        // Add type change buttons
        Object.entries(TAG_CONFIG).forEach(([type, config]) => {
            const button = document.createElement('button');
            button.textContent = config.displayName;
            button.dataset.newType = type;
            button.dataset.icon = config.icon;
            button.dataset.description = config.description;
            button.style.color = config.color;
            buttonsContainer.appendChild(button);
        });

        // Add custom text if present
        if (tag.customText) {
            const textDisplay = document.createElement('div');
            textDisplay.className = 'tag-custom-text';
            textDisplay.textContent = tag.customText;
            menu.appendChild(textDisplay);
        }

        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.dataset.description = 'Delete this tag';
        deleteButton.className = 'delete-tag';
        buttonsContainer.appendChild(deleteButton);

        // Add click handler to menu buttons
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
            const tagId = menu.dataset.tagIconId;
            if (!tagId) return;

            if (event.target.dataset.newType) {
                const newType = event.target.dataset.newType;
                // Check if the new type requires custom text
                if (TAG_CONFIG[newType].requiresCustomText && !tag.customText) {
                    const input = prompt('Enter custom text for this tag:');
                    if (input) {
                        this.tagManager.updateTag(tagId, newType, input);
                    }
                } else {
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
}
