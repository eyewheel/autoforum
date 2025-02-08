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
    }

    handleMouseUp(event) {
        setTimeout(() => {
            const selection = window.getSelection();
            const selectionText = selection.toString().trim();
            
            if (selection && !selection.isCollapsed && selectionText) {
                const selectionInfo = this.getSelectionInfo(selection);
                if (selectionInfo) {
                    this.currentSelection = selectionInfo;
                    this.tagRenderer.updateAddTagButtonPosition(selection);
                }
            } else {
                // Hide add tag button if no text is selected
                this.tagRenderer.addTagButton.style.display = 'none';
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
            const tagMenu = this.tagRenderer.tagMenu;
            const buttonRect = event.target.getBoundingClientRect();
            
            tagMenu.style.display = 'flex';
            tagMenu.style.left = `${buttonRect.right + 10}px`;
            tagMenu.style.top = `${buttonRect.top}px`;

            // Check if menu would go outside viewport
            const menuRect = tagMenu.getBoundingClientRect();
            if (menuRect.right > window.innerWidth - 10) {
                tagMenu.style.left = `${buttonRect.left - menuRect.width - 10}px`;
            }
        }
    }

    handleTagMenuClick(event) {
        const tagType = event.target.dataset.tagType;
        if (!tagType || !this.currentSelection) return;

        const tag = this.tagManager.addTag(
            null, // paragraphId is no longer needed here
            this.currentSelection.selections,
            tagType
        );

        // Render all affected paragraphs
        new Set(this.currentSelection.selections.map(s => s.paragraphId))
            .forEach(paragraphId => {
                this.tagRenderer.renderParagraph(paragraphId);
            });

        this.hideAllMenus();
        window.getSelection().removeAllRanges();
    }

    handleTagIconClick(event) {
        const icon = event.target.closest('.selection-tag-icon');
        if (!icon || icon.id === 'add-tag-button') return;

        const menu = icon.querySelector('.tag-management-menu');
        if (!menu) return;

        const tagId = icon.dataset.tagId;
        const isMenuClick = event.target.closest('.tag-management-menu');

        if (isMenuClick) {
            // Handle menu item clicks
            if (event.target.dataset.newType) {
                this.tagManager.updateTagType(tagId, event.target.dataset.newType);
                this.tagRenderer.renderParagraph(icon.dataset.paragraphId);
            } else if (event.target.classList.contains('delete-tag')) {
                this.tagManager.deleteTag(tagId);
                this.tagRenderer.renderParagraph(icon.dataset.paragraphId);
            }
            menu.style.display = 'none';
        } else {
            // Toggle menu visibility
            document.querySelectorAll('.tag-management-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
        }
    }

    getSelectionInfo(selection) {
        if (!selection || selection.isCollapsed) return null;
    
        const range = selection.getRangeAt(0);
        const startParagraph = range.startContainer.nodeType === Node.TEXT_NODE ? 
            range.startContainer.parentElement.closest('.paragraph') :
            range.startContainer.closest('.paragraph');
            
        const endParagraph = range.endContainer.nodeType === Node.TEXT_NODE ?
            range.endContainer.parentElement.closest('.paragraph') :
            range.endContainer.closest('.paragraph');
    
        if (!startParagraph || !endParagraph) return null;
    
        const selections = [];
        let currentParagraph = startParagraph;
    
        while (currentParagraph) {
            const paragraphId = currentParagraph.id;
            if (!currentParagraph.dataset.originalText) {
                currentParagraph.dataset.originalText = currentParagraph.textContent;
            }
    
            const paragraphText = currentParagraph.dataset.originalText;
            const startOffset = currentParagraph === startParagraph ? 
                this.getTextOffset(startParagraph, range.startContainer, range.startOffset) : 0;
            const endOffset = currentParagraph === endParagraph ?
                this.getTextOffset(endParagraph, range.endContainer, range.endOffset) : 
                paragraphText.length;
    
            selections.push({
                paragraphId,
                startOffset,
                endOffset,
                selectedText: paragraphText.substring(startOffset, endOffset)
            });
    
            if (currentParagraph === endParagraph) break;
            currentParagraph = currentParagraph.nextElementSibling?.closest('.paragraph');
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

    hideAllMenus() {
        this.tagRenderer.tagMenu.style.display = 'none';
        this.tagRenderer.addTagButton.style.display = 'none';
        document.querySelectorAll('.tag-management-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
}