import { VOTING_CONFIG } from './constants.js';

export class TagVoting {
    constructor(tagManager, tagRenderer) {
        this.tagManager = tagManager;
        this.tagRenderer = tagRenderer;
        this.tooltips = new Map(); // Map of tagId -> tooltip element
        this.hoverTimers = new Map(); // Map of tagId -> timeout ID
        
        // Check if demo mode is enabled in localStorage
        const storedDemoMode = localStorage.getItem(VOTING_CONFIG.DEMO_MODE_KEY);
        if (storedDemoMode === 'true') {
            this.tagManager.toggleDemoMode(true);
        }
        
        this.setupStyles();
    }
    
    setupStyles() {
        // Add CSS styles for voting components
        if (!document.getElementById('tag-voting-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'tag-voting-styles';
            styleElement.textContent = `
                .tag-score {
                    position: absolute;
                    bottom: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: white;
                    border-radius: 10px;
                    padding: 0 4px;
                    font-size: 12px;
                    font-weight: bold;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    z-index: 11;
                    min-width: 14px;
                    text-align: center;
                }
                
                .tag-score.positive {
                    color: ${VOTING_CONFIG.UPVOTE_COLOR};
                }
                
                .tag-score.negative {
                    color: ${VOTING_CONFIG.DOWNVOTE_COLOR};
                }
                
                .tag-score.zero {
                    color: ${VOTING_CONFIG.NEUTRAL_COLOR};
                }
                
                .vote-tooltip {
                    position: absolute;
                    bottom: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: white;
                    border-radius: 4px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    z-index: 12;
                    overflow: hidden;
                    height: 22px;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.1s ease, visibility 0.1s ease;
                    pointer-events: all;
                }
                
                .vote-tooltip.visible {
                    opacity: 1;
                    visibility: visible;
                }
                
                .vote-button {
                    width: 22px;
                    height: 22px;
                    line-height: 22px;
                    text-align: center;
                    cursor: pointer;
                    user-select: none;
                    font-weight: bold;
                    transition: background-color 0.2s ease;
                }
                
                .vote-down {
                    background-color: #ffdddd;
                    color: ${VOTING_CONFIG.DOWNVOTE_COLOR};
                }
                
                .vote-up {
                    background-color: #ddffdd;
                    color: ${VOTING_CONFIG.UPVOTE_COLOR};
                }
                
                .vote-down:hover {
                    background-color: #ffbbbb;
                }
                
                .vote-up:hover {
                    background-color: #bbffbb;
                }
                
                .vote-down.active {
                    background-color: ${VOTING_CONFIG.DOWNVOTE_COLOR};
                    color: white;
                }
                
                .vote-up.active {
                    background-color: ${VOTING_CONFIG.UPVOTE_COLOR};
                    color: white;
                }
                
                /* Demo mode toggle button */
                .demo-mode-toggle {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    background-color: #f0f0f0;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 5px 10px;
                    font-size: 12px;
                    cursor: pointer;
                    z-index: 1000;
                }
                
                .demo-mode-toggle.active {
                    background-color: #e0f7fa;
                    border-color: #00bcd4;
                }
                
                /* Animation for score changes */
                @keyframes score-pulse {
                    0% { transform: translateX(-50%) scale(1); }
                    50% { transform: translateX(-50%) scale(1.3); }
                    100% { transform: translateX(-50%) scale(1); }
                }
                
                .score-changed {
                    animation: score-pulse ${VOTING_CONFIG.VOTE_ANIMATION_DURATION}ms ease;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    // Create the demo mode toggle button
    createDemoModeToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'demo-mode-toggle';
        toggle.textContent = this.tagManager.demoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF';
        toggle.classList.toggle('active', this.tagManager.demoMode);
        
        toggle.addEventListener('click', () => {
            this.tagManager.toggleDemoMode(!this.tagManager.demoMode);
            toggle.textContent = this.tagManager.demoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF';
            toggle.classList.toggle('active', this.tagManager.demoMode);
            
            // Save setting to localStorage
            localStorage.setItem(VOTING_CONFIG.DEMO_MODE_KEY, this.tagManager.demoMode);
        });
        
        document.body.appendChild(toggle);
    }
    
    // Create or update score display for a tag
    updateTagScore(tagIcon, score) {
        let scoreElement = tagIcon.querySelector('.tag-score');
        
        if (!scoreElement) {
            scoreElement = document.createElement('div');
            scoreElement.className = 'tag-score';
            tagIcon.appendChild(scoreElement);
        }
        
        // Update the score value
        scoreElement.textContent = score > 0 ? `+${score}` : score;
        
        // Update the styling based on the score value
        scoreElement.classList.remove('positive', 'negative', 'zero');
        if (score > 0) {
            scoreElement.classList.add('positive');
        } else if (score < 0) {
            scoreElement.classList.add('negative');
        } else {
            scoreElement.classList.add('zero');
        }
        
        // Add animation class for score changes
        scoreElement.classList.add('score-changed');
        setTimeout(() => {
            scoreElement.classList.remove('score-changed');
        }, VOTING_CONFIG.VOTE_ANIMATION_DURATION);
        
        return scoreElement;
    }
    
    // Create vote tooltip for a tag
    createVoteTooltip(tagId, tagIcon) {
        // Check if tooltip already exists
        if (this.tooltips.has(tagId)) {
            return this.tooltips.get(tagId);
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'vote-tooltip';
        tooltip.setAttribute('data-tag-id', tagId);
        
        const downButton = document.createElement('div');
        downButton.className = 'vote-button vote-down';
        downButton.textContent = '-';
        downButton.setAttribute('data-action', 'down');
        
        const upButton = document.createElement('div');
        upButton.className = 'vote-button vote-up';
        upButton.textContent = '+';
        upButton.setAttribute('data-action', 'up');
        
        tooltip.appendChild(downButton);
        tooltip.appendChild(upButton);
        
        // Add event listeners
        downButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleVote(tagId, false);
        });
        
        upButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleVote(tagId, true);
        });
        
        // Create a hover tracking system for the tag-tooltip pair
        tagIcon.isHovered = false;
        tooltip.isHovered = false;
        
        // Add mouseenter/mouseleave to both elements that coordinate together
        tagIcon.addEventListener('mouseenter', () => {
            tagIcon.isHovered = true;
            this.showTooltip(tagId);
        });
        
        tagIcon.addEventListener('mouseleave', () => {
            tagIcon.isHovered = false;
            // Use a short timeout to check if the mouse moved to the tooltip
            setTimeout(() => {
                if (!tooltip.isHovered && !tagIcon.isHovered) {
                    this.hideTooltip(tagId);
                }
            }, 50);
        });
        
        tooltip.addEventListener('mouseenter', () => {
            tooltip.isHovered = true;
        });
        
        tooltip.addEventListener('mouseleave', () => {
            tooltip.isHovered = false;
            // Use a short timeout to check if the mouse moved to the tag icon
            setTimeout(() => {
                if (!tooltip.isHovered && !tagIcon.isHovered) {
                    this.hideTooltip(tagId);
                }
            }, 50);
        });
        
        // Add to DOM
        tagIcon.appendChild(tooltip);
        
        // Store in tooltips map
        this.tooltips.set(tagId, tooltip);
        
        return tooltip;
    }
    
    // Show tooltip for a tag
    showTooltip(tagId) {
        const tagIcon = document.querySelector(`.selection-tag-icon[data-tag-id="${tagId}"]`);
        if (!tagIcon) return;
        
        // Create tooltip if it doesn't exist yet
        const tooltip = this.createVoteTooltip(tagId, tagIcon);
        
        // Update button states based on current vote
        this.updateTooltipButtonStates(tagId, tooltip);
        
        // Clear any hide timers
        if (this.hoverTimers.has(tagId)) {
            clearTimeout(this.hoverTimers.get(tagId));
            this.hoverTimers.delete(tagId);
        }
        
        // Show tooltip
        tooltip.classList.add('visible');
    }
    
    // Hide tooltip for a tag
    hideTooltip(tagId) {
        // Clear any hide timers
        if (this.hoverTimers.has(tagId)) {
            clearTimeout(this.hoverTimers.get(tagId));
            this.hoverTimers.delete(tagId);
        }
        
        const tooltip = this.tooltips.get(tagId);
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }
    
    // Update tooltip button states based on user's current vote
    updateTooltipButtonStates(tagId, tooltip) {
        const userVote = this.tagManager.getUserVoteForTag(tagId);
        
        const downButton = tooltip.querySelector('.vote-down');
        const upButton = tooltip.querySelector('.vote-up');
        
        // Reset button states
        downButton.classList.remove('active');
        upButton.classList.remove('active');
        
        // Set active state based on current vote
        if (userVote === -1) {
            downButton.classList.add('active');
        } else if (userVote === 1) {
            upButton.classList.add('active');
        }
    }
    
    // Handle a vote action
    handleVote(tagId, isUpvote) {
        let newScore;
        
        if (this.tagManager.demoMode) {
            // In demo mode, always add a vote as a new "user"
            newScore = this.tagManager.demoVote(tagId, isUpvote);
        } else {
            // In normal mode, toggle the user's vote
            newScore = isUpvote 
                ? this.tagManager.upvoteTag(tagId)
                : this.tagManager.downvoteTag(tagId);
        }
        
        if (newScore !== false) {
            // Update the score display
            const tagIcon = document.querySelector(`.selection-tag-icon[data-tag-id="${tagId}"]`);
            if (tagIcon) {
                this.updateTagScore(tagIcon, newScore);
            }
            
            // Update tooltip button states
            const tooltip = this.tooltips.get(tagId);
            if (tooltip) {
                this.updateTooltipButtonStates(tagId, tooltip);
            }
        }
    }
    
    // Initialize voting for all existing tags
    initializeTagVoting() {
        // Remove old event listeners to prevent duplicates
        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(tagIcon => {
            // Clone node to remove all event listeners
            const newIcon = tagIcon.cloneNode(true);
            if (tagIcon.parentNode) {
                tagIcon.parentNode.replaceChild(newIcon, tagIcon);
            }
        });
        
        // Add event listeners to all tag icons
        document.querySelectorAll('.selection-tag-icon:not(#add-tag-button)').forEach(tagIcon => {
            const tagId = tagIcon.dataset.tagId;
            if (!tagId) return;
            
            // Get the tag data
            const tag = this.tagManager.getTagById(tagId);
            if (!tag) return;
            
            // Add score display
            this.updateTagScore(tagIcon, tag.score);
            
            // Create tooltip (this will also set up the hover events)
            this.createVoteTooltip(tagId, tagIcon);
        });
        
        // Create demo mode toggle
        this.createDemoModeToggle();
    }
} 