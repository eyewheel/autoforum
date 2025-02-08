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

    function findAvailableVerticalSpace(verticalCenter, excludeIcon = null) {
        const tagIcons = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
            .filter(icon => icon !== excludeIcon);
        
        // Sort icons by vertical position
        const iconPositions = tagIcons
            .map(icon => ({
                icon,
                top: parseFloat(icon.style.top) || 0
            }))
            .sort((a, b) => a.top - b.top);

        // If no icons exist, return the vertical center
        if (iconPositions.length === 0) {
            return verticalCenter;
        }

        // Find gaps between icons that can fit our new icon
        let position = verticalCenter;
        const iconHeight = 32;
        const margin = 10;
        const minSpace = iconHeight + margin;

        // Find the closest available position to the verticalCenter
        let bestPosition = position;
        let minDistance = Infinity;

        // Check each gap between icons
        for (let i = 0; i < iconPositions.length; i++) {
            const currentTop = iconPositions[i].top;
            const nextTop = i < iconPositions.length - 1 ? iconPositions[i + 1].top : Infinity;
            const gap = nextTop - (currentTop + iconHeight);

            if (gap >= margin) {
                // We can fit here
                const availablePosition = currentTop + iconHeight + margin;
                const distance = Math.abs(availablePosition - verticalCenter);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestPosition = availablePosition;
                }
            }
        }

        // Also check position above first icon
        const firstIconTop = iconPositions[0].top;
        if (firstIconTop >= minSpace) {
            const availablePosition = firstIconTop - minSpace;
            const distance = Math.abs(availablePosition - verticalCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                bestPosition = availablePosition;
            }
        }

        return bestPosition;
    }

    function positionMenu(menu, triggerRect) {
        const viewportHeight = window.innerHeight;
        const menuHeight = menu.offsetHeight;
        
        // Start with centered position
        let top = triggerRect.top + (triggerRect.height / 2) - (menuHeight / 2);
        
        // Adjust if too close to bottom
        if (top + menuHeight > viewportHeight - 10) {
            top = viewportHeight - menuHeight - 10;
        }
        
        // Adjust if too close to top
        if (top < 10) {
            top = 10;
        }
        
        menu.style.top = `${top}px`;
    }

    function handleTagOverlap(addTagPosition) {
        const addTagIcon = document.getElementById('add-tag-button');
        if (!addTagIcon) return;

        const tagIcons = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
            .map(icon => ({
                element: icon,
                top: parseFloat(icon.style.top) || 0
            }))
            .sort((a, b) => a.top - b.top);

        const iconHeight = 32;
        const overlapThreshold = iconHeight;
        const moveOffset = 15; // Fixed 15px movement

        // Find overlapping tags
        const overlappingTags = tagIcons.filter(icon =>
            Math.abs(icon.top - addTagPosition) < overlapThreshold
        );

        // Reset all tags first
        tagIcons.forEach(({element}) => {
            element.style.opacity = '1';
            element.style.transform = 'none';
            element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        });

        // Apply effects to overlapping tags
        if (overlappingTags.length > 0) {
            const center = addTagPosition;
            overlappingTags.forEach(({element, top}) => {
                element.style.opacity = '0.5';
                const direction = top > center ? 1 : -1;
                element.style.transform = `translateY(${moveOffset * direction}px)`;
            });
        }
    }

    // Store the add tag button position for new tags
    let lastAddTagPosition = null;

    // Update menu toggle function to handle positioning
    function toggleTagMenu() {
        const menu = tagMenu;
        const addTagButton = document.getElementById('add-tag-button');
        
        if (menu.style.display === 'none' || !menu.style.display) {
            menu.style.display = 'flex';
            const buttonRect = addTagButton.getBoundingClientRect();
            positionMenu(menu, buttonRect);
        } else {
            menu.style.display = 'none';
        }
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
                        const position = lastAddTagPosition || findAvailableVerticalSpace(verticalCenter - sidebarRect.top);
                        // Clear lastAddTagPosition after using it
                        lastAddTagPosition = null;
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

    // Create and add menu to document body
    const tagMenu = document.createElement('div');
    tagMenu.className = 'tag-management-menu';
    document.body.appendChild(tagMenu);
    
    Object.entries(tagIcons).forEach(([type, icon]) => {
        const button = document.createElement('button');
        button.textContent = icon;
        button.title = `Add ${type} tag`;
        button.addEventListener('click', () => {
            const selectionInfo = getCurrentSelection();
            if (selectionInfo) {
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
                toggleTagMenu();
                addTagButton.style.display = 'none';
            }
        });
        tagMenu.appendChild(button);
    });

    // Handle add tag button clicks
    function toggleTagMenu() {
        if (tagMenu.style.display === 'flex') {
            tagMenu.style.display = 'none';
            return;
        }

        const addTagButton = document.getElementById('add-tag-button');
        const buttonRect = addTagButton.getBoundingClientRect();

        // First display the menu to get its dimensions
        tagMenu.style.display = 'flex';
        tagMenu.style.visibility = 'hidden';  // Hide while positioning
        
        const menuRect = tagMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Start with position to the right of the button
        let left = buttonRect.right + 10;
        let top = buttonRect.top + (buttonRect.height / 2) - (menuRect.height / 2);

        // Check if menu would go outside viewport to the right
        if (left + menuRect.width > viewportWidth - 10) {
            // Position to the left of the button instead
            left = buttonRect.left - menuRect.width - 10;
        }

        // Ensure menu stays within viewport vertically
        const minTop = 10;
        const maxTop = viewportHeight - menuRect.height - 10;
        top = Math.max(minTop, Math.min(top, maxTop));

        // Apply the final position
        tagMenu.style.left = `${left}px`;
        tagMenu.style.top = `${top}px`;
        tagMenu.style.visibility = 'visible';  // Show menu after positioning
    }

    addTagButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (getCurrentSelection()) {
            toggleTagMenu();
        }
    });

    // Handle text selection
    function updateAddTagButtonPosition() {
        const selection = window.getSelection();
        if (!selection.isCollapsed && selection.toString().trim()) {
            const verticalCenter = getSelectionVerticalCenter();
            if (verticalCenter !== null) {
                const sidebarRect = tagSidebar.getBoundingClientRect();
                // Store position for new tag creation
                lastAddTagPosition = verticalCenter - sidebarRect.top - 15; // 15px up for better positioning
                addTagButton.style.top = `${lastAddTagPosition}px`;
                addTagButton.style.display = 'flex';
                
                // Apply overlap effects to nearby tags
                handleTagOverlap(lastAddTagPosition);
                return;
            }
        }
        // Reset tag positions and clear stored position
        addTagButton.style.display = 'none';
        lastAddTagPosition = null;
        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
            icon.style.opacity = '1';
            icon.style.transform = 'none';
        });
    }

    // Handle mouse up events for selection
    document.addEventListener('mouseup', function(event) {
        // Wait longer for triple-click to settle
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim()) {
                updateAddTagButtonPosition();
            } else {
                addTagButton.style.display = 'none';
                // Reset any affected tags
                document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
                    icon.style.opacity = '1';
                    icon.style.transform = 'none';
                });
            }
        }, 50); // Increased timeout for better triple-click handling
    });

    // Close tag menu when clicking outside
    document.addEventListener('click', (event) => {
        // Only close if click is outside the tag menu and add tag button
        if (!event.target.closest('.tag-management-menu') &&
            !event.target.closest('#add-tag-button')) {
            tagMenu.style.display = 'none';
        }
    });

    // Clear selection when clicking outside paragraphs and tag menu
    document.addEventListener('mousedown', function(event) {
        if (!event.target.closest('.paragraph') &&
            !event.target.closest('#tag-sidebar')) {
            window.getSelection().removeAllRanges();
            addTagButton.style.display = 'none';
            tagMenu.style.display = 'none';
        }
    });

    // Prevent menu clicks from bubbling up
    tagMenu.addEventListener('click', (event) => {
        event.stopPropagation();
    });
});