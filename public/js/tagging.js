// public/js/tagging.js
document.addEventListener('DOMContentLoaded', function() {
    // Tag icons (using simple text for now, could be replaced with SVG icons)
    const tagIcons = {
        important: '★',
        question: '?',
        definition: '§'
    };
    
    // Initialize tag icons for each paragraph
    document.querySelectorAll('.tag-icons').forEach(iconContainer => {
        const paragraphId = iconContainer.getAttribute('data-for');
        
        // Create buttons for each tag type
        Object.entries(tagIcons).forEach(([tag, icon]) => {
            const button = document.createElement('button');
            button.className = 'tag-button';
            button.setAttribute('data-tag', tag);
            button.innerHTML = icon;
            
            button.addEventListener('click', () => {
                const paragraph = document.getElementById(paragraphId);
                const tagClass = `tagged-${tag}`;
                
                if (paragraph.classList.contains(tagClass)) {
                    paragraph.classList.remove(tagClass);
                    button.classList.remove('active');
                } else {
                    paragraph.classList.add(tagClass);
                    button.classList.add('active');
                }
            });
            
            iconContainer.appendChild(button);
        });
    });
});

