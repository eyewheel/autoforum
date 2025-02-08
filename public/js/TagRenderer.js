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
        button.title = 'Add Tag';
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
            button.title = config.description;
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

    renderParagraph(paragraphId) {
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

        const paragraph = document.getElementById(paragraphId);
        if (!paragraph || !paragraph.dataset.originalText) {
            console.error('Paragraph or original text not found:', paragraphId);
            return;
        }

        // Clear existing content and restore original text
        const originalText = paragraph.dataset.originalText;
        paragraph.innerHTML = originalText;

        // Clear existing sidebar icons for this paragraph
        this.clearSidebarIcons(paragraphId);

        // Get and sort tags
        const tags = this.tagManager.getTagsForParagraph(paragraphId);
        if (!tags.length) return;

        // Render tag icons and their hover handlers
        tags.forEach(tag => {
            this.renderTag(tag, paragraph);
        });
    }

    highlightParagraphSelection(paragraph, selection, tag) {
        const originalText = paragraph.dataset.originalText;
        const beforeText = originalText.substring(0, selection.startOffset);
        const selectedText = originalText.substring(selection.startOffset, selection.endOffset);
        const afterText = originalText.substring(selection.endOffset);

        // Use TAG_CONFIG for styling
        const config = TAG_CONFIG[tag.tagType];
        const highlightClass = `tagged-${tag.tagType}-highlighted`;
        const style = `background-color: ${config.backgroundColor};`;

        paragraph.innerHTML = `${beforeText}<span class="tagged-selection ${highlightClass}" 
            data-tag-id="${tag.id}" style="${style}">${selectedText}</span>${afterText}`;
    }

    renderTag(tag, paragraph) {
        // Create sidebar icon with enhanced styling
        const iconElement = this.createTagIcon(tag);
        
        // Find the selection for this paragraph
        const selection = tag.selections.find(s => s.paragraphId === paragraph.id);
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
        icon.title = config.displayName;
        icon.dataset.tagId = tag.id;
        icon.style.color = config.color;
        
        // Add custom text indicator if present
        if (tag.customText) {
            icon.classList.add('has-custom-text');
            icon.title += `: ${tag.customText}`;
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
            button.title = `Change to ${config.displayName}`;
            button.dataset.newType = type;
            button.dataset.icon = config.icon;
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
        deleteButton.title = 'Delete tag';
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
                const paragraph = document.getElementById(selection.paragraphId);
                if (paragraph) {
                    if (!paragraph.dataset.originalText) {
                        paragraph.dataset.originalText = paragraph.textContent;
                    }
                    this.highlightParagraphSelection(paragraph, selection, tag);
                }
            });
        });

        icon.addEventListener('mouseleave', () => {
            tag.selections.forEach(selection => {
                const paragraph = document.getElementById(selection.paragraphId);
                if (paragraph) {
                    paragraph.innerHTML = paragraph.dataset.originalText;
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
            const paragraph = document.getElementById(selection.paragraphId);
            if (!paragraph) return null;

            const range = document.createRange();
            const textNode = paragraph.firstChild;
            range.setStart(textNode, selection.startOffset);
            range.setEnd(textNode, selection.endOffset);
            rects = range.getClientRects();
        }

        if (!rects.length) return null;

        const sidebarRect = this.sidebarElement.getBoundingClientRect();
        const elementHeight = 32; // Fixed height for consistency
        const position = (rects[0].top + rects[rects.length - 1].bottom) / 2 - (elementHeight / 2) - sidebarRect.top;
        
        return position;
    }

    updateAddTagButtonPosition(selection) {
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

    clearSidebarIcons(paragraphId) {
        const icons = Array.from(this.sidebarElement.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'));
        icons.forEach(icon => {
            const paragraphIds = icon.dataset.paragraphId?.split(',') || [];
            if (paragraphIds.includes(paragraphId)) {
                icon.remove();
            }
        });
    }
}