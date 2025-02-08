import { renderTagsForParagraph, handleTagOverlap, tagIcons } from './tag_management.js';

export let selectionTags = {}; // In-memory storage


let tagCounter = 0;
document.addEventListener('DOMContentLoaded', function() {
    const localStorageKey = 'markdownTagging_selectionTags';
    // Load tags from LocalStorage on page load
    const storedTags = localStorage.getItem(localStorageKey);
    if (storedTags) {
        selectionTags = JSON.parse(storedTags);
        Object.keys(selectionTags).forEach(paragraphId => {
            const paragraph = document.getElementById(paragraphId);
            if (paragraph) {
                paragraph.dataset.originalText = paragraph.textContent;
                renderTagsForParagraph(paragraphId, localStorageKey);
            }
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
        
        console.log('Selection paragraphs:', {
            startParagraphId: startParagraph?.id,
            endParagraphId: endParagraph?.id,
            isSameParagraph: startParagraph === endParagraph
        });

        if (!startParagraph || !endParagraph) {
            return null;
        }

        let selectedText = selection.toString().trim();
        if (!selectedText) {
            return null;
        }

        let selections = [];
        if (startParagraph === endParagraph) {
            // Calculate offsets relative to paragraph content
            const startOffset = getTextOffset(startParagraph, range.startContainer, range.startOffset);
            const endOffset = getTextOffset(endParagraph, range.endContainer, range.endOffset);

            selections.push({
                paragraphId: startParagraph.id,
                startOffset: startOffset,
                endOffset: endOffset,
                selectedText: selectedText
            });
        } else {
            let currentParagraph = startParagraph;
            let currentOffset = getTextOffset(startParagraph, range.startContainer, range.startOffset);

            while (currentParagraph) {
                const paragraphId = currentParagraph.id;
                const paragraphText = currentParagraph.textContent;

                let endOffset;
                if (currentParagraph === endParagraph) {
                    endOffset = getTextOffset(endParagraph, range.endContainer, range.endOffset);
                } else {
                    endOffset = paragraphText.length;
                }

                const selectedText = paragraphText.substring(currentOffset, endOffset);

                selections.push({
                    paragraphId: paragraphId,
                    startOffset: currentOffset,
                    endOffset: endOffset,
                    selectedText: selectedText
                });

                if (currentParagraph === endParagraph) {
                    break;
                }

                currentParagraph = currentParagraph.nextElementSibling?.closest('.paragraph');
                currentOffset = 0; // Reset offset for next paragraph
            }
        }

        return {
            selection: selection,
            range: range,
            startParagraph: startParagraph,
            endParagraph: endParagraph,
            selectedText: selectedText,
            selections: selections
        };
    }

    function getTextOffset(paragraph, container, offset) {
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

    // Create and add menu to document body
    const tagMenu = document.createElement('div');
    tagMenu.className = 'tag-management-menu';
    tagMenu.style.position = 'fixed';  // Ensure menu is positioned relative to viewport
    tagMenu.style.zIndex = '1000';     // Keep menu above other elements
    
    // Stop click propagation on the menu itself
    tagMenu.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    
    document.body.appendChild(tagMenu);
    
    // Store current selection info
    let currentSelectionInfo = null;

    function updateCurrentSelection() {
        currentSelectionInfo = getCurrentSelection();
        return currentSelectionInfo;
    }

    // Create tag menu buttons
    Object.entries(tagIcons).forEach(([type, icon]) => {
        const button = document.createElement('button');
        button.textContent = icon;
        button.title = `Add ${type} tag`;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log('Tag button clicked:', type);
            if (currentSelectionInfo) {
                const { selections } = currentSelectionInfo;
                const tagId = `tag-${tagCounter++}`;

                selections.forEach(selection => {
                    const { paragraphId, startOffset, endOffset, selectedText } = selection;

                    console.log('Creating new tag:', {
                        paragraphId,
                        startOffset,
                        endOffset,
                        selectedText,
                        type
                    });

                    const newTag = {
                        id: tagId,
                        tagType: type,
                        paragraphId: paragraphId,
                        startOffset: startOffset,
                        endOffset: endOffset,
                        text: selectedText
                    };

                    if (!selectionTags[paragraphId]) {
                        selectionTags[paragraphId] = [];
                    }
                    selectionTags[paragraphId].push(newTag);

                    console.log('Updated selectionTags:', selectionTags);
                    
                    // Hide menu before rendering to prevent layout shifts
                    tagMenu.style.display = 'none';
                    addTagButton.style.display = 'none';
                    
                    // Force render immediately
                    renderTagsForParagraph(paragraphId, localStorageKey);
                });
            }
        });
        tagMenu.appendChild(button);
    });

    // Update current selection before showing menu
    addTagButton.addEventListener('mouseenter', updateCurrentSelection);

    // Handle add tag button clicks
    function toggleTagMenu() {
        const menu = tagMenu;
        const addTagButton = document.getElementById('add-tag-button');
        
        // Update and check selection before showing menu
        currentSelectionInfo = updateCurrentSelection();
        if (!currentSelectionInfo) {
            console.log('No valid selection found');
            menu.style.display = 'none';
            return;
        }
        
        console.log('Opening menu with selection:', {
            paragraphId: currentSelectionInfo.startParagraph.id,
            startOffset: currentSelectionInfo.startOffset,
            endOffset: currentSelectionInfo.endOffset,
            selectedText: currentSelectionInfo.selectedText
        });
        
        const buttonRect = addTagButton.getBoundingClientRect();
        
        // Position menu to the right of the button
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';
        menu.style.left = `${buttonRect.right + 10}px`;
        menu.style.top = `${buttonRect.top}px`;
        
        // Check if menu would go outside viewport to the right
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        if (menuRect.right > viewportWidth - 10) {
            // Position to the left of the button instead
            menu.style.left = `${buttonRect.left - menuRect.width - 10}px`;
        }
    }

    // Cache selection on add button click
    addTagButton.addEventListener('mousedown', (event) => {
        event.preventDefault(); // Prevent selection from being cleared
        event.stopPropagation();
        currentSelectionInfo = updateCurrentSelection();
    });

    addTagButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        console.log('Add button clicked, selection:', currentSelectionInfo);
        if (currentSelectionInfo) {
            toggleTagMenu();
        } else {
            console.log('No selection available');
        }
    });

    // Add click listeners to menu items
    tagMenu.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent menu from closing immediately
    });

    // Handle text selection
    function updateAddTagButtonPosition() {
        // Update the current selection info
        currentSelectionInfo = updateCurrentSelection();
        if (currentSelectionInfo) {
            const verticalCenter = getSelectionVerticalCenter();
            if (verticalCenter !== null) {
                const sidebarRect = tagSidebar.getBoundingClientRect();
                let position = verticalCenter - sidebarRect.top;

                // Find available position considering existing tags
                const existingPositions = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
                    .map(icon => parseFloat(icon.style.top) || 0)
                    .sort((a, b) => a - b);

                const margin = 10;
                while (existingPositions.some(p => Math.abs(p - position) < margin)) {
                    position += margin;
                }

                addTagButton.style.top = `${position}px`;
                addTagButton.style.display = 'flex';

                console.log('Selection ready for tagging:', {
                    paragraphId: currentSelectionInfo.startParagraph.id,
                    startOffset: currentSelectionInfo.startOffset,
                    endOffset: currentSelectionInfo.endOffset,
                    selectedText: currentSelectionInfo.selectedText
                });

                // Apply overlap effects to nearby tags
                handleTagOverlap(position);
                return;
            }
        }
        // Reset tag positions
        addTagButton.style.display = 'none';
        currentSelectionInfo = null;
        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
            icon.style.opacity = '1';
            icon.style.transform = 'none';
        });
    }
        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(icon => {
            icon.style.opacity = '1';
            icon.style.transform = 'none';
        });

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
    document.addEventListener('mousedown', (event) => {
        // Only close if click is outside the menu and button
        if (!event.target.closest('.tag-management-menu') &&
            !event.target.closest('#add-tag-button') &&
            tagMenu.style.display === 'flex') {
            event.preventDefault(); // Prevent text selection from being cleared
            event.stopPropagation();
            tagMenu.style.display = 'none';
            addTagButton.style.display = 'none';
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
