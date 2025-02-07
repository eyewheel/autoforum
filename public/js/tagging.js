document.addEventListener('DOMContentLoaded', function() {
    // Tag icons
    const tagIcons = {
        important: '★',
        question: '?',
        definition: '§'
    };

    let selectionTags = {}; // In-memory storage
    let tagCounter = 0;
    const localStorageKey = 'markdownTagging_selectionTags'; // Define localStorage key

    // Load tags from LocalStorage on page load
    const storedTags = localStorage.getItem(localStorageKey);
    if (storedTags) {
        selectionTags = JSON.parse(storedTags);
        // Re-render tags on load
        Object.keys(selectionTags).forEach(paragraphId => {
            renderTagsForParagraph(paragraphId);
        });
    }

    function getCurrentSelection() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const paragraph = range.startContainer.parentElement.closest('.paragraph');
        if (!paragraph) {
            return null;
        }

        const selectedText = selection.toString().trim(); // Trimmed selected text
        if (!selectedText) { // Check for empty selection after trimming
            return null;
        }

        const paragraphText = paragraph.textContent;
        const startIndex = paragraphText.indexOf(selectedText, paragraphText.indexOf(range.startContainer.textContent.trimStart()));
        const endIndex = startIndex + selectedText.length;

        return {
            selection: selection,
            range: range,
            paragraph: paragraph,
            selectedText: selectedText,
            startIndex: startIndex,
            endIndex: endIndex
        };
    }

    function renderTagsForParagraph(paragraphId) {
        console.log('renderTagsForParagraph CALLED for paragraphId:', paragraphId);

        const paragraph = document.getElementById(paragraphId);
        if (!paragraph) {
            return;
        }
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

                // Tag management menu (initially hidden)
                const tagMenu = document.createElement('div');
                tagMenu.className = 'tag-management-menu';
                tagMenu.dataset.tagId = tag.id; // Associate menu with tag
                tagMenu.style.display = 'none'; // Initially hidden

                // Tag type buttons in menu
                Object.entries(tagIcons).forEach(([type, icon]) => {
                    const typeButton = document.createElement('button');
                    typeButton.textContent = icon;
                    typeButton.title = `Change tag to ${type}`;
                    typeButton.addEventListener('click', () => changeTagType(tag.id, type, paragraphId));
                    tagMenu.appendChild(typeButton);
                });

                // Delete button in menu
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'X';
                deleteButton.title = 'Delete tag';
                deleteButton.addEventListener('click', () => deleteTag(tag.id, paragraphId));
                tagMenu.appendChild(deleteButton);


                tagIconSpan.appendChild(tagMenu); // Add menu to icon
                tagIconSpan.addEventListener('click', (event) => toggleTagMenu(event, tag.id)); // Toggle menu on icon click


                tagSidebar.appendChild(tagIconSpan);

                // Vertical positioning (same as before)
                setTimeout(() => {
                    const selectionRange = document.createRange();
                    selectionRange.selectNodeContents(taggedSpan);
                    const rects = selectionRange.getClientRects();
                    if (rects.length > 0) {
                        const firstRect = rects[0];
                        const lastRect = rects[rects.length - 1];
                        const verticalCenter = (firstRect.top + lastRect.bottom) / 2;

                        const sidebarRect = tagSidebar.getBoundingClientRect();
                        const contentRect = document.getElementById('content').getBoundingClientRect();

                        const sidebarTop = verticalCenter - sidebarRect.top - contentRect.left;

                        tagIconSpan.style.top = `${sidebarTop}px`;
                    }
                }, 0);


                currentIndex = tag.endOffset;
            });
        }

        if (currentIndex < originalText.length) {
            paragraph.appendChild(document.createTextNode(originalText.substring(currentIndex)));
        }

        if (!selectionTags[paragraphId] || selectionTags[paragraphId].length === 0) {
            paragraph.textContent = originalText;
        }

        // Save to LocalStorage after rendering
        localStorage.setItem(localStorageKey, JSON.stringify(selectionTags));
    }


    function changeTagType(tagId, newTagType, paragraphId) {
        selectionTags[paragraphId] = selectionTags[paragraphId].map(tag => {
            if (tag.id === tagId) {
                return { ...tag, tagType: newTagType };
            }
            return tag;
        });
        renderTagsForParagraph(paragraphId); // Re-render to update visual
    }

    function deleteTag(tagId, paragraphId) {
        selectionTags[paragraphId] = selectionTags[paragraphId].filter(tag => tag.id !== tagId);
        renderTagsForParagraph(paragraphId); // Re-render to update visual
    }

    function toggleTagMenu(event, tagId) {
        event.stopPropagation(); // Prevent document click from immediately closing

        const tagMenu = event.currentTarget.querySelector('.tag-management-menu');
        if (tagMenu) {
            // Close any other open menus
            document.querySelectorAll('.tag-management-menu').forEach(menu => {
                if (menu !== tagMenu) {
                    menu.style.display = 'none';
                }
            });
            tagMenu.style.display = tagMenu.style.display === 'none' ? 'flex' : 'none';
        }
    }

    // Close tag menus when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.tag-management-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    });


    // Initialize tag icons for each paragraph
    document.querySelectorAll('.tag-icons').forEach(iconContainer => {
        const paragraphId = iconContainer.getAttribute('data-for');

        // Create Trigger Icon
        const triggerIcon = document.createElement('button');
        triggerIcon.className = 'trigger-icon';
        triggerIcon.innerHTML = '+'; // Or any other icon
        triggerIcon.title = 'Add Tag';
        triggerIcon.addEventListener('click', () => {
            const selectionInfo = getCurrentSelection();
            if (selectionInfo) {
                // Trigger tag type selection UI here (next step)
                console.log('Trigger icon clicked. Selected text:', selectionInfo.selectedText);
                // For now, let's just log the selection info
            } else {
                console.log('No valid text selection.');
            }
        });
        iconContainer.appendChild(triggerIcon);


        Object.entries(tagIcons).forEach(([tagType, icon]) => {
            const button = document.createElement('button');
            button.className = 'tag-button';
            button.setAttribute('data-tag', tagType);
            button.innerHTML = icon;
            button.style.display = 'none'; // Initially hide tag type buttons
            button.addEventListener('click', () => {
                const selectionInfo = getCurrentSelection();
                if (selectionInfo) {
                    const { paragraph, selectedText, startIndex, endIndex } = selectionInfo;
                    const paragraphId = paragraph.id;
                    const tagId = `tag-${tagCounter++}`;

                    const newTag = {
                        id: tagId,
                        startOffset: startIndex,
                        endOffset: endIndex,
                        tagType: tagType,
                        text: selectedText
                    };

                    if (!selectionTags[paragraphId]) {
                        selectionTags[paragraphId] = [];
                    }
                    selectionTags[paragraphId].push(newTag);

                    renderTagsForParagraph(paragraphId);

                    button.classList.toggle('active');
                } else {
                    console.log('No text selected within a paragraph.');
                }
            });

            iconContainer.appendChild(button);
        });
    });

    let currentSelection = null; // Store current selection info

    document.addEventListener('mouseup', function(event) {
        console.log('mouseup event');
        currentSelection = getCurrentSelection();
        document.querySelectorAll('.tag-icons').forEach(iconContainer => {
            console.log('iconContainer', iconContainer);
            if (currentSelection && currentSelection.paragraph.parentElement.parentElement === iconContainer.parentElement) { // Check if selection is in the paragraph associated with this iconContainer
                iconContainer.classList.add('selection-active'); // Show trigger icon
                // Hide tag type buttons for now, will be shown in next step
                iconContainer.querySelectorAll('.tag-button').forEach(button => button.style.display = 'none');
            } else {
                iconContainer.classList.remove('selection-active'); // Hide trigger icon
                // Hide tag type buttons
                iconContainer.querySelectorAll('.tag-button').forEach(button => button.style.display = 'none');
            }
        });
    });

    document.addEventListener('mousedown', function(event) {
        // Clear selection when clicking outside of a paragraph (or maybe always on mousedown to simplify)
        if (!event.target.closest('.paragraph-container')) {
            window.getSelection().removeAllRanges();
            currentSelection = null;
            document.querySelectorAll('.tag-icons').forEach(iconContainer => {
                iconContainer.classList.remove('selection-active'); // Hide trigger icon
                // Hide tag type buttons
                iconContainer.querySelectorAll('.tag-button').forEach(button => button.style.display = 'none');
            });
        }
    });

});