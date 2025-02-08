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
        
        Object.entries(TAG_ICONS).forEach(([type, icon]) => {
            const button = document.createElement('button');
            button.textContent = icon;
            button.title = `Add ${type} tag`;
            button.dataset.tagType = type;
            menu.appendChild(button);
        });
        
        return menu;
    }

    renderParagraph(paragraphId) {
        const paragraph = document.getElementById(paragraphId);
        if (!paragraph || !paragraph.dataset.originalText) {
            console.error('Paragraph or original text not found:', paragraphId);
            return;
        }

        // Clear existing content
        const originalText = paragraph.dataset.originalText;
        paragraph.innerHTML = originalText;

        // Clear existing sidebar icons for this paragraph
        this.clearSidebarIcons(paragraphId);

        // Get and sort tags
        const tags = this.tagManager.getTagsForParagraph(paragraphId);
        if (!tags.length) return;

        // Render tags
        tags.forEach(tag => {
            this.renderTag(tag, paragraph);
        });

        // Handle multi-paragraph tags that start in this paragraph
        const multiParagraphTags = this.tagManager.getMultiParagraphTags();
        multiParagraphTags.forEach(tag => {
            if (tag.selections.some(sel => sel.paragraphId === paragraphId)) {
                const selection = tag.selections.find(sel => sel.paragraphId === paragraphId);
                if (selection) {
                    this.highlightParagraphSelection(paragraph, selection, tag);
                }
            }
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

        // Add management menu
        const menu = this.createTagManagementMenu(tag);
        icon.appendChild(menu);

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
                this.renderParagraph(selection.paragraphId);
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
        // Create temporary span for position calculation
        const tempSpan = document.createElement('span');
        tempSpan.textContent = paragraph.dataset.originalText.substring(
            selection.startOffset,
            selection.endOffset
        );
        paragraph.appendChild(tempSpan);
        
        const rect = tempSpan.getBoundingClientRect();
        const sidebarRect = this.sidebarElement.getBoundingClientRect();
        const position = (rect.top + rect.bottom) / 2 - sidebarRect.top;
        
        paragraph.removeChild(tempSpan);
        
        // Adjust position if overlapping with other tags
        return this.findAvailablePosition(position);
    }

    findAvailablePosition(desiredPosition) {
        const existingPositions = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
            .map(icon => parseFloat(icon.style.top))
            .sort((a, b) => a - b);

        let position = desiredPosition;
        while (existingPositions.some(p => Math.abs(p - position) < CONSTANTS.MIN_MARGIN)) {
            position += CONSTANTS.TAG_SPACING;
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
            return;
        }

        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (!rects.length) return;

        const sidebarRect = this.sidebarElement.getBoundingClientRect();
        const verticalCenter = (rects[0].top + rects[rects.length - 1].bottom) / 2;
        const position = this.findAvailablePosition(verticalCenter - sidebarRect.top);

        this.addTagButton.style.top = `${position}px`;
        this.addTagButton.style.display = 'flex';
    }
}