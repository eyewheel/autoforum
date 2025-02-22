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

        setTimeout(() => {
            const selection = window.getSelection();
            const selectionText = selection.toString().trim();

            // Check if we're in a non-default mode
            if (window.contentVersion && (window.contentVersion.hasContributions || window.contentVersion.hasPersonalization)) {
                this.tagRenderer.addTagButton.style.display = 'none';
                return;
            }

            if (selection && !selection.isCollapsed && selectionText) {
                const selectionInfo = this.getSelectionInfo(selection);
                if (selectionInfo) {
                    this.currentSelection = selectionInfo;
                    this.tagRenderer.updateAddTagButtonPosition(selection);
                }
            } else {
                this.tagRenderer.addTagButton.style.display = 'none';
                document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
                    icon.style.opacity = '1';
                    icon.style.transform = 'translateX(0)';
                });
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
            menu.style.display = isVisible ? 'none' : 'flex';

            if (!isVisible) {
                // Show/hide input container based on icon type
                const inputContainer = menu.querySelector('.tag-input-container');
                if (inputContainer) {
                    inputContainer.style.display = icon.id === 'add-tag-button' ? 'none' : 'flex';
                }

                // Get the icon's position
                const buttonRect = icon.getBoundingClientRect();
                const scrollY = window.scrollY;
                const scrollX = window.scrollX;

                // Calculate absolute positions
                const absoluteButtonTop = buttonRect.top + scrollY;
                const absoluteButtonRight = buttonRect.right + scrollX;

                // Position menu
                menu.style.visibility = 'hidden';
                menu.style.display = 'flex';
                menu.style.left = `${absoluteButtonRight + 5}px`;
                menu.style.top = `${absoluteButtonTop}px`;
                menu.style.visibility = 'visible';
            }
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
