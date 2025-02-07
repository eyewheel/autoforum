document.addEventListener('DOMContentLoaded', function() {
    // Tag icons
    const tagIcons = {
        important: '★',
        question: '?',
        definition: '§'
    };

    let selectionTags = {}; // In-memory storage
    let tagCounter = 0;
    const localStorageKey = 'markdownTagging_selectionTags';

    // Load tags from LocalStorage on page load
    const storedTags = localStorage.getItem(localStorageKey);
    if (storedTags) {
        selectionTags = JSON.parse(storedTags);
        Object.keys(selectionTags).forEach(paragraphId => {
            renderTagsForParagraph(paragraphId);
        });
    }

    // Initialize tag sidebar with add tag button
    const tagSidebar = document.getElementById('tag-sidebar');
    const addTagButton = document.createElement('button');
    addTagButton.className = 'selection-tag-icon';
    addTagButton.innerHTML = '+';
    addTagButton.title = 'Add Tag';
    addTagButton.id = 'add-tag-button';
    addTagButton.style.display = 'none';
    tagSidebar.appendChild(addTagButton);

    function getCurrentSelection() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const startParagraph = range.startContainer.parentElement.closest('.paragraph');
        const endParagraph = range.endContainer.parentElement.closest('.paragraph');
        
        if (!startParagraph || !endParagraph) {
            return null;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
            return null;
        }

        return {
            selection: selection,
            range: range,
            startParagraph: startParagraph,
            endParagraph: endParagraph,
            selectedText: selectedText,
            startOffset: range.startOffset,
            endOffset: range.endOffset
        };
    }

    function getSelectionVerticalCenter() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return null;

        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length === 0) return null;

        const firstRect = rects[0];
        const lastRect = rects[rects.length - 1];
        return (firstRect.top + lastRect.bottom) / 2;
    }

    function findAvailableVerticalSpace(verticalCenter) {
        const tagIcons = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'));
        const iconPositions = tagIcons.map(icon => parseFloat(icon.style.top));
        
        // If no icons exist, return the vertical center
        if (iconPositions.length === 0) {
            return verticalCenter;
        }

        // Find the first position that has enough space (10px margin)
        let position = verticalCenter;
        while (iconPositions.some(pos => Math.abs(pos - position) < 42)) { // 32px height + 10px margin
            position += 42;
        }

        return position;
    }

    function renderTagsForParagraph(paragraphId) {
        const paragraph = document.getElementById(paragraphId);
        if (!paragraph) return;

        const originalText = paragraph.textContent;
        paragraph.innerHTML = '';

        const tagSidebar = document.getElementById('tag-sidebar');
        if (!tagSidebar) {
            console.error('Tag sidebar element not found!');
            return;
        }

        // Clear sidebar icons for this paragraph
        const existingSidebarIcons = tagSidebar.querySelectorAll(`[data-paragraph-id="${paragraphId}"]`);
        existingSidebarIcons.forEach(icon => icon.remove());

        let currentIndex = 0;

        if (selectionTags[paragraphId]) {
            selectionTags[paragraphId].sort((a, b) => a.startOffset - b.startOffset);

            selectionTags[paragraphId].forEach(tag => {
                if (tag.startOffset > currentIndex) {
                    paragraph.appendChild(document.createTextNode(originalText.substring(currentIndex, tag.startOffset)));
                }

                const taggedSpan = document.createElement('span');
                taggedSpan.className = `tagged-selection tagged-${tag.tagType}`;
                taggedSpan.dataset.tagId = tag.id;
                taggedSpan.textContent = originalText.substring(tag.startOffset, tag.endOffset);
                paragraph.appendChild(taggedSpan);

                // Create tag icon for sidebar
                const tagIconSpan = document.createElement('span');
                tagIconSpan.className = `selection-tag-icon selection-tag-icon-${tag.tagType}`;
                tagIconSpan.textContent = tagIcons[tag.tagType];
                tagIconSpan.title = tag.tagType;
                tagIconSpan.dataset.tagId = tag.id;
                tagIconSpan.dataset.paragraphId = paragraphId;

                // Tag management menu
                const tagMenu = document.createElement('div');
                tagMenu.className = 'tag-management-menu';
                tagMenu.dataset.tagId = tag.id;
                tagMenu.style.display = 'none';

                Object.entries(tagIcons).forEach(([type, icon]) => {
                    const typeButton = document.createElement('button');
                    typeButton.textContent = icon;
                    typeButton.title = `Change tag to ${type}`;
                    typeButton.addEventListener('click', () => changeTagType(tag.id, type, paragraphId));
                    tagMenu.appendChild(typeButton);
                });

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'X';
                deleteButton.title = 'Delete tag';
                deleteButton.addEventListener('click', () => deleteTag(tag.id, paragraphId));
                tagMenu.appendChild(deleteButton);

                tagIconSpan.appendChild(tagMenu);
                tagIconSpan.addEventListener('click', (event) => toggleTagMenu(event, tag.id));

                tagSidebar.appendChild(tagIconSpan);

                // Position tag icon vertically
                setTimeout(() => {
                    const selectionRange = document.createRange();
                    selectionRange.selectNodeContents(taggedSpan);
                    const rects = selectionRange.getClientRects();
                    if (rects.length > 0) {
                        const firstRect = rects[0];
                        const lastRect = rects[rects.length - 1];
                        const verticalCenter = (firstRect.top + lastRect.bottom) / 2;
                        const sidebarRect = tagSidebar.getBoundingClientRect();
                        const position = findAvailableVerticalSpace(verticalCenter - sidebarRect.top);
                        tagIconSpan.style.top = `${position}px`;
                    }
                }, 0);

                currentIndex = tag.endOffset;
            });
        }

        if (currentIndex < originalText.length) {
            paragraph.appendChild(document.createTextNode(originalText.substring(currentIndex)));
        }

        localStorage.setItem(localStorageKey, JSON.stringify(selectionTags));
    }

    function changeTagType(tagId, newTagType, paragraphId) {
        selectionTags[paragraphId] = selectionTags[paragraphId].map(tag => {
            if (tag.id === tagId) {
                return { ...tag, tagType: newTagType };
            }
            return tag;
        });
        renderTagsForParagraph(paragraphId);
    }

    function deleteTag(tagId, paragraphId) {
        selectionTags[paragraphId] = selectionTags[paragraphId].filter(tag => tag.id !== tagId);
        renderTagsForParagraph(paragraphId);
    }

    function toggleTagMenu(event, tagId) {
        event.stopPropagation();
        const tagMenu = event.currentTarget.querySelector('.tag-management-menu');
        if (tagMenu) {
            document.querySelectorAll('.tag-management-menu').forEach(menu => {
                if (menu !== tagMenu) {
                    menu.style.display = 'none';
                }
            });
            tagMenu.style.display = tagMenu.style.display === 'none' ? 'flex' : 'none';
        }
    }

    // Show tag type buttons when add tag button is clicked
    addTagButton.addEventListener('click', () => {
        const selectionInfo = getCurrentSelection();
        if (selectionInfo) {
            const tagMenu = document.createElement('div');
            tagMenu.className = 'tag-management-menu';
            tagMenu.style.display = 'flex';

            Object.entries(tagIcons).forEach(([type, icon]) => {
                const button = document.createElement('button');
                button.textContent = icon;
                button.title = type;
                button.addEventListener('click', () => {
                    const { startParagraph, selectedText, startOffset, endOffset } = selectionInfo;
                    const paragraphId = startParagraph.id;
                    const tagId = `tag-${tagCounter++}`;

                    const newTag = {
                        id: tagId,
                        startOffset: startOffset,
                        endOffset: endOffset,
                        tagType: type,
                        text: selectedText
                    };

                    if (!selectionTags[paragraphId]) {
                        selectionTags[paragraphId] = [];
                    }
                    selectionTags[paragraphId].push(newTag);
                    renderTagsForParagraph(paragraphId);
                    tagMenu.remove();
                    addTagButton.style.display = 'none';
                });
                tagMenu.appendChild(button);
            });

            addTagButton.appendChild(tagMenu);
        }
    });

    // Handle text selection
    function updateAddTagButtonPosition() {
        const selection = window.getSelection();
        if (!selection.isCollapsed && selection.toString().trim()) {
            const verticalCenter = getSelectionVerticalCenter();
            if (verticalCenter !== null) {
                const sidebarRect = tagSidebar.getBoundingClientRect();
                const position = findAvailableVerticalSpace(verticalCenter - sidebarRect.top) - 10; // Adjust 10px up
                addTagButton.style.top = `${position}px`;
                addTagButton.style.display = 'flex';
                return;
            }
        }
        addTagButton.style.display = 'none';
    }

    // Only handle mouse up events for selection
    document.addEventListener('mouseup', function(event) {
        setTimeout(updateAddTagButtonPosition, 0);
    });

    // Close tag menus when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.tag-management-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    });

    // Clear selection when clicking outside paragraphs
    document.addEventListener('mousedown', function(event) {
        if (!event.target.closest('.paragraph') && !event.target.closest('#tag-sidebar')) {
            window.getSelection().removeAllRanges();
            addTagButton.style.display = 'none';
        }
    });
});