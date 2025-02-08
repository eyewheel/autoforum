import { selectionTags } from './tagging.js';

// Tag icons
const tagIcons = {
    important: '★',
    question: '?',
    definition: '§'
};

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

function calculateTagPosition(taggedSpan, tagSidebar) {
    const range = document.createRange();
    range.selectNodeContents(taggedSpan);
    const rects = range.getClientRects();
    
    if (rects.length > 0) {
        // Get middle position of the text
        const firstRect = rects[0];
        const lastRect = rects[rects.length - 1];
        const verticalCenter = (firstRect.top + lastRect.bottom) / 2;
        const sidebarRect = tagSidebar.getBoundingClientRect();
        
        // Get existing tag positions
        const existingPositions = Array.from(document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)'))
            .map(icon => parseFloat(icon.style.top) || 0)
        .sort((a, b) => a - b);
        
        let position = verticalCenter - sidebarRect.top;
        const margin = 10;
        
        // Find first available position below any overlapping tags
        while (existingPositions.some(p => Math.abs(p - position) < margin)) {
            position += margin;
        }
        
        return position;
    }
    return 0;
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

function renderTagsForParagraph(paragraphId, localStorageKey) {
    const paragraph = document.getElementById(paragraphId);
    if (!paragraph) return;

    // Get original text content before clearing
    const originalText = paragraph.dataset.originalText;
    paragraph.innerHTML = '';
    console.log('renderTagsForParagraph', paragraphId, originalText);
    console.log('originalText.length', originalText.length);

    const tagSidebar = document.getElementById('tag-sidebar');
    if (!tagSidebar) {
        console.error('Tag sidebar element not found!');
        return;
    }

    // Clear sidebar icons for this paragraph
    const existingSidebarIcons = tagSidebar.querySelectorAll(`[data-paragraph-id="${paragraphId}"]`);
    existingSidebarIcons.forEach(icon => icon.remove());

    // Only process if we have tags for this paragraph
    if (selectionTags[paragraphId]) {
        const tags = selectionTags[paragraphId];
        console.log('Processing tags:', tags);

        // Sort by start offset
        tags.sort((a, b) => a.startOffset - b.startOffset);

        // Build the tagged paragraph content
        let taggedContent = originalText;
        paragraph.innerHTML = taggedContent;

        let position;
        // Create and position tag icons after all spans are in place
        for (const tag of tags) {
            console.log("11AAAAAAAAAAaa")
            // Create a temporary span to calculate the tag position
            const tempSpan = document.createElement('span');
            tempSpan.style.position = 'absolute';
            tempSpan.style.visibility = 'hidden';
            tempSpan.textContent = originalText.substring(tag.startOffset, tag.endOffset);
            paragraph.appendChild(tempSpan);

            position = calculateTagPosition(tempSpan, tagSidebar);
            tempSpan.remove();

            console.log("22AAAAAAAAAAaa")

            // Create the tag icon in the sidebar
            const tagIconSpan = document.createElement('span');
            tagIconSpan.className = `selection-tag-icon selection-tag-icon-${tag.tagType}`;
            tagIconSpan.textContent = tagIcons[tag.tagType];
            tagIconSpan.title = tag.tagType;
            tagIconSpan.dataset.tagId = tag.id;
            tagIconSpan.dataset.paragraphId = paragraphId;

            console.log("3AAAAAAAAAAaa")

            // Add hover effects for text highlighting
            tagIconSpan.addEventListener('mouseenter', () => {
                const paragraph = document.getElementById(paragraphId);
                if (!paragraph) return;

                const originalText = paragraph.textContent;

                const tags = selectionTags[paragraphId];
                if (!tags) return;

                tags.sort((a, b) => a.startOffset - b.startOffset);

                let finalTaggedContent = originalText;
                let cumulativeOffset = 0;

                for (const tag of tags) {
                    const startOffset = tag.startOffset + cumulativeOffset;
                    const endOffset = tag.endOffset + cumulativeOffset;

                    const taggedText = originalText.substring(tag.startOffset, tag.endOffset);
                    console.log('originalText', originalText);
                    console.log('taggedContent', finalTaggedContent);
                    console.log('startOffset', startOffset);
                    console.log('endOffset', endOffset);
                    console.log('taggedText', taggedText);
                    const tagHTML = `<span class="tagged-selection tagged-${tag.tagType}-highlighted" data-tag-id="${tag.id}" data-tag-type="${tag.tagType}">${taggedText}</span>`;
                    finalTaggedContent = finalTaggedContent.substring(0, startOffset) + tagHTML + finalTaggedContent.substring(endOffset);
                    cumulativeOffset += tagHTML.length - taggedText.length;
                }
                console.log('finalTaggedContent', finalTaggedContent);
                paragraph.innerHTML = finalTaggedContent;
            });

            tagIconSpan.addEventListener('mouseleave', () => {
                const paragraph = document.getElementById(paragraphId);
                if (!paragraph) return;
                renderTagsForParagraph(paragraphId, localStorageKey);
            });

            console.log("1AAAAAAAAAAaa")

            // Create tag management menu
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

            console.log("2AAAAAAAAAAaa")

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'X';
            deleteButton.title = 'Delete tag';
            deleteButton.addEventListener('click', () => deleteTag(tag.id, paragraphId));
            tagMenu.appendChild(deleteButton);

            tagIconSpan.appendChild(tagMenu);
            tagIconSpan.addEventListener('click', (event) => toggleTagMenu(event, tag.id));

            tagSidebar.appendChild(tagIconSpan);

            // Position tag icon based on the text position
            console.log('tagSidebar', tagSidebar);
            console.log('tagIconSpan', tagIconSpan);
            console.log('position', position);
            tagIconSpan.style.top = `${position}px`;
            console.log('tagIconSpan.style.top', tagIconSpan.style.top);
            console.log('tagSidebar.appendChild(tagIconSpan) called');
        }
    }

    // Save to localStorage
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, JSON.stringify(selectionTags));
    }
}

function changeTagType(tagId, newTagType, paragraphId) {
    let tagToUpdate = null;
    let tagParagraphId = null;

    // Find the tag to update
    Object.entries(selectionTags).forEach(([pId, tags]) => {
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
            tagToUpdate = tag;
            tagParagraphId = pId;
        }
    });

    if (tagToUpdate) {
        tagToUpdate.tagType = newTagType;
        // Re-render the paragraph containing the first span
        const firstSpanParagraphId = tagToUpdate.paragraphId;
        renderTagsForParagraph(firstSpanParagraphId, localStorageKey);
    }
}

function deleteTag(tagId, paragraphId) {
    // Find and remove the tag from all paragraphs
    Object.keys(selectionTags).forEach(pId => {
        selectionTags[pId] = selectionTags[pId].filter(tag => tag.id !== tagId);
        // Clean up empty paragraph arrays
        if (selectionTags[pId].length === 0) {
            delete selectionTags[pId];
        }
        // Re-render the paragraph if it had the tag
        renderTagsForParagraph(pId, localStorageKey);
    });
}

export { renderTagsForParagraph, handleTagOverlap, tagIcons };