import { TAG_ICONS, CONSTANTS } from './constants.js';

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
        menu.className = 'tag-management-menu';
        menu.style.position = 'fixed';
        menu.style.zIndex = '1000';
        menu.style.display = 'none';
        document.body.appendChild(menu);
        
        // Add tag buttons
        Object.entries(TAG_ICONS).forEach(([type, icon]) => {
            const button = document.createElement('button');
            button.textContent = icon;
            button.title = `Add ${type} tag`;
            button.dataset.tagType = type;
            menu.appendChild(button);
        });

        // Add input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'tag-input-container';
        inputContainer.style.display = 'none';
        menu.appendChild(inputContainer);

        // Add input field
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter tag text...';
        input.className = 'tag-input';
        inputContainer.appendChild(input);

        // Add submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'tag-submit';
        submitButton.innerHTML = '→';
        submitButton.title = 'Submit';
        inputContainer.appendChild(submitButton);

        // Handle input events
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log('Tag text submitted:', input.value);
                input.value = '';
                this.hideMenus();
            }
        });

        submitButton.addEventListener('click', () => {
            console.log('Tag text submitted:', input.value);
            input.value = '';
            this.hideMenus();
        });
        
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

        paragraph.innerHTML = `${beforeText}<span class="tagged-selection tagged-${tag.tagType}-highlighted" data-tag-id="${tag.id}">${selectedText}</span>${afterText}`;
    }

    renderTag(tag, paragraph) {
        // Create sidebar icon
        const iconElement = this.createTagIcon(tag);
        
        // Find the selection for this paragraph
        const selection = tag.selections.find(s => s.paragraphId === paragraph.id);
        if (selection) {
            const position = this.calculateTagPosition(tag, paragraph, selection);
            iconElement.style.top = `${position}px`;
            this.sidebarElement.appendChild(iconElement);
        }
    }

    createTagIcon(tag) {
        const icon = document.createElement('span');
        icon.className = `selection-tag-icon selection-tag-icon-${tag.tagType}`;
        icon.textContent = TAG_ICONS[tag.tagType];
        icon.title = tag.tagType;
        icon.dataset.tagId = tag.id;
        
        // Set paragraphIds as a comma-separated list for multi-paragraph tags
        icon.dataset.paragraphId = tag.selections.map(s => s.paragraphId).join(',');

        // Create management menu
        const menu = this.createTagManagementMenu(tag);
        menu.dataset.tagIconId = tag.id;  // Add reference to the tag icon
        document.body.appendChild(menu);

        // Add hover handlers
        this.addTagIconListeners(icon, tag);

        return icon;
    }

    createTagManagementMenu(tag) {
        const menu = document.createElement('div');
        menu.className = 'tag-management-menu';
        menu.style.display = 'none';

        // Add type change buttons
        Object.entries(TAG_ICONS).forEach(([type, icon]) => {
            const button = document.createElement('button');
            button.textContent = icon;
            button.title = `Change to ${type}`;
            button.dataset.newType = type;
            menu.appendChild(button);
        });

        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.title = 'Delete tag';
        deleteButton.className = 'delete-tag';
        menu.appendChild(deleteButton);

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
                    // Just restore the original text without re-rendering
                    paragraph.innerHTML = paragraph.dataset.originalText;
                }
            });
        });
    }

    createHighlightedText(originalText, tags) {
        let result = originalText;
        let offset = 0;

        tags.sort((a, b) => a.startOffset - b.startOffset).forEach(tag => {
            const startPos = tag.startOffset + offset;
            const endPos = tag.endOffset + offset;
            const textToWrap = result.substring(startPos, endPos);
            const wrapped = `<span class="tagged-selection tagged-${tag.tagType}-highlighted" data-tag-id="${tag.id}">${textToWrap}</span>`;
            
            result = result.substring(0, startPos) + wrapped + result.substring(endPos);
            offset += wrapped.length - textToWrap.length;
        });

        return result;
    }

    calculateTagPosition(tag, paragraph, selection) {
        const originalText = paragraph.dataset.originalText;
        
        // Find first and last line by inserting spans at start and end of selection
        const beforeText = originalText.substring(0, selection.startOffset);
        const selectedText = originalText.substring(selection.startOffset, selection.endOffset);
        const afterText = originalText.substring(selection.endOffset);
        
        paragraph.innerHTML = `${beforeText}<span id="sel-start"></span>${selectedText}<span id="sel-end"></span>${afterText}`;
        
        const startSpan = document.getElementById('sel-start');
        const endSpan = document.getElementById('sel-end');
        
        const startRect = startSpan.getBoundingClientRect();
        const endRect = endSpan.getBoundingClientRect();

        // Dynamically calculate height
        const tempIcon = document.createElement('div');
        tempIcon.className = 'selection-tag-icon';
        tempIcon.style.display = 'none'; // Keep it hidden
        document.body.appendChild(tempIcon); // Append to body to compute styles
        const computedStyle = window.getComputedStyle(tempIcon);
        const height = parseFloat(computedStyle.height);
        document.body.removeChild(tempIcon); // Clean up temporary element
        
        // Restore original content
        paragraph.innerHTML = originalText;

        // Get sidebar position for coordinate conversion
        const sidebarRect = this.sidebarElement.getBoundingClientRect();
        
        // Calculate middle position between first and last line, converting to sidebar coordinates
        const position = (startRect.top + endRect.bottom) / 2 - sidebarRect.top;
        
        // Find available position that doesn't overlap with existing tags
        return this.findAvailablePosition(position);
    }

    findAvailablePosition(desiredPosition) {
        // Get all existing tag icons and their positions
        const existingTags = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
            .map(icon => {
                const top = parseFloat(icon.style.top);
                const rect = icon.getBoundingClientRect();
                const height = rect.height;
                return {
                    top: top,
                    bottom: top + height
                };
            })
            .filter(pos => !isNaN(pos.top))
            .sort((a, b) => a.top - b.top);

        let position = desiredPosition;
        let found = false;

        // Keep checking positions until we find a free spot
        while (!found) {
            found = true;
            for (let tag of existingTags) {
                // Check if current position would overlap with this tag
                if (Math.abs(tag.top - position) < CONSTANTS.MIN_MARGIN ||
                    (position > tag.top - CONSTANTS.MIN_MARGIN && position < tag.bottom + CONSTANTS.MIN_MARGIN)) {
                    // Move below this tag with minimum margin
                    position = tag.bottom + CONSTANTS.MIN_MARGIN;
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

    updateAddTagButtonPosition(selection) {
        if (!selection) {
            this.addTagButton.style.display = 'none';
            // Reset all tag icons to default state when hiding add button
            document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
                icon.style.opacity = '1';
                icon.style.transform = 'translateX(0)';
            });
            return;
        }

        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (!rects.length) return;

        // Get sidebar position for coordinate conversion
        const sidebarRect = this.sidebarElement.getBoundingClientRect();

        // Calculate position using the same formula as calculateTagPosition
        const buttonHeight = this.addTagButton.offsetHeight;
        const position = (rects[0].top + rects[rects.length - 1].bottom) / 2 - (buttonHeight / 2) - sidebarRect.top;
        
        // Set position and show button
        this.addTagButton.style.top = `${position}px`;
        this.addTagButton.style.display = 'flex';

        // Get updated button position for overlap calculations
        const addButtonRect = this.addTagButton.getBoundingClientRect();
        const buttonTop = addButtonRect.top;
        const buttonBottom = addButtonRect.bottom;

        // Reset and then update opacity and position for overlapping icons
        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
            // First reset styles
            icon.style.opacity = '1';
            icon.style.transform = 'translateX(0)';
            
            // Check if icon overlaps with add button's vertical space
            const iconRect = icon.getBoundingClientRect();
            const iconTop = iconRect.top;
            const iconBottom = iconRect.bottom;

            // Check for any overlap in vertical space
            if (!(iconBottom < buttonTop || iconTop > buttonBottom)) {
                icon.style.opacity = '0.5';
                icon.style.transform = 'translateX(10px)';
            }
        });
    }
}