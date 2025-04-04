import { TAG_CONFIG } from './constants.js';
import { DEFAULT_TAGS } from './defaultTags.js';
// Removed CONSTANTS import as storage key logic is moved to StateManager
// No direct localStorage access needed here

export class TagManager {
    constructor(pageName, stateManager) {
        if (!pageName || !stateManager) {
            throw new Error("TagManager requires pageName and stateManager instances.");
        }
        this.pageName = pageName;
        this.stateManager = stateManager;

        this.tags = new Map(); // paragraphId -> Tag[] (for efficient lookups during rendering)
        this.allTags = []; // Primary storage - array of all tags
        this.tagCounter = 0;
        this.currentUser = this.getCurrentUser(); // Get or create a user ID
        this.demoMode = false; // Default to normal mode

        this.loadTags(); // Load tags via StateManager
    }

    // Get or create a unique user ID for voting tracking (still uses localStorage directly for user ID)
    getCurrentUser() {
        let userId = localStorage.getItem('tagSystem_userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('tagSystem_userId', userId);
        }
        return userId;
    }

    // Toggle demo mode for unlimited voting
    toggleDemoMode(isEnabled) {
        this.demoMode = isEnabled;
    }

    // Load tags using StateManager
    loadTags() {
        try {
            let loadedTags = this.stateManager.getTags(); // Assumes StateManager handles the key logic

            if (loadedTags) {
                 // Check if we're using the new storage format (already handled by StateManager potentially)
                if (Array.isArray(loadedTags)) {
                    // New format - direct tag storage
                    this.allTags = loadedTags;

                    // Ensure all tags have score and voters properties
                    this.allTags.forEach(tag => {
                        tag.score = tag.score ?? 0; // Use nullish coalescing
                        tag.voters = tag.voters || {};
                    });
                } else {
                    // Handle potential old format if StateManager didn't convert it (unlikely but safe)
                    console.warn("Detected old tag format during load; converting...");
                    this.convertAndSetOldFormatTags(loadedTags);
                    this.saveTags(); // Save immediately in the new format
                }
            } else {
                // No tags in storage, check for default tags
                const defaultTagsForPage = DEFAULT_TAGS[this.pageName];
                if (defaultTagsForPage) {
                    console.log(`Loading default tags for page: ${this.pageName}`);
                    // Convert default tags (assumed old format for now)
                    this.convertAndSetOldFormatTags(defaultTagsForPage);
                    this.saveTags(); // Save defaults to storage immediately
                } else {
                    // No stored tags and no defaults
                    this.allTags = [];
                }
            }

            // Build the paragraph -> tags lookup map
            this.rebuildTagsMap();

            // Find highest existing tag ID to set counter
            this.tagCounter = this.getHighestTagId() + 1;

        } catch (error) {
            console.error('Error loading tags via StateManager:', error);
            this.tags.clear();
            this.allTags = [];
        }
    }

    // Helper to convert old paragraph-based format to new array format
    convertAndSetOldFormatTags(oldFormatTags) {
        const uniqueTags = new Map();
        Object.entries(oldFormatTags).forEach(([paragraphId, tags]) => {
            tags.forEach(tag => {
                if (!uniqueTags.has(tag.id)) {
                    tag.score = tag.score ?? 0;
                    tag.voters = tag.voters || {};
                    uniqueTags.set(tag.id, tag);
                }
            });
        });
        this.allTags = Array.from(uniqueTags.values());
    }

    // Helper method to rebuild the paragraph -> tags map
    rebuildTagsMap() {
        this.tags.clear();
        this.allTags.forEach(tag => {
            tag.selections.forEach(selection => {
                const paragraphId = selection.paragraphId;
                if (!this.tags.has(paragraphId)) {
                    this.tags.set(paragraphId, []);
                }
                // Avoid duplicates if tag spans multiple selections in same paragraph
                if (!this.tags.get(paragraphId).some(existingTag => existingTag.id === tag.id)) {
                    this.tags.get(paragraphId).push(tag);
                }
            });
        });
    }

    // Removed getCurrentPage() - pageName is now provided in constructor

    // Save tags using StateManager
    saveTags() {
        try {
            // Pass the current state of allTags to StateManager
            this.stateManager.saveTags(this.allTags);
        } catch (error) {
            console.error('Error saving tags via StateManager:', error);
        }
    }

    // --- Public API --- //

    /**
     * Retrieves all tags currently stored.
     * @returns {Array<Tag>} A shallow copy of the allTags array.
     */
    getAllTags() {
        // Return a shallow copy to prevent external modification of the internal array
        return [...this.allTags];
    }

    addTag(paragraphId, selection, tagType, text) {
        // Check if we're in a non-default mode (using global state potentially set by Sidebar)
        // TODO: Refactor this check to use StateManager's global state if appropriate
        /*  // *** REMOVING THIS CHECK to allow tagging in personalized view ***
        const sidebarState = this.stateManager.getSidebarState();
        if (sidebarState.contributions || sidebarState.personalization) {
             console.warn('Tags cannot be added while Contributions or Personalization mode is active.');
             return null;
        }
        */

        if (!selection || !tagType) {
            throw new Error('Missing required parameters for adding tag');
        }

        const tagId = `tag-${this.tagCounter++}`;
        const newTag = {
            id: tagId,
            tagType,
            selections: Array.isArray(selection) ? selection : [selection],
            customText: text,
            score: 0, // Initialize score to 0
            voters: {} // Initialize empty voters object
        };

        // Add to primary storage
        this.allTags.push(newTag);

        // Update the lookup map
        this.rebuildTagsMap(); // Easiest way to ensure map is correct after add/delete

        this.saveTags(); // Save via StateManager
        return newTag;
    }

    deleteTag(tagId) {
        const initialLength = this.allTags.length;
        this.allTags = this.allTags.filter(tag => tag.id !== tagId);

        if (this.allTags.length < initialLength) {
            this.rebuildTagsMap(); // Update the lookup map
            this.saveTags(); // Save via StateManager
            return true;
        }
        return false;
    }

    // Update methods simply modify the tag in allTags and save
    updateTag(tagId, newType, customText) {
        const tag = this.allTags.find(t => t.id === tagId);
        if (tag) {
            tag.tagType = newType;
            // Only update customText if provided, otherwise keep existing
            if (customText !== undefined) {
                tag.customText = customText;
            }
            // Might need to rebuild map if selections change in the future
            this.saveTags();
            return true;
        }
        return false;
    }

    // Note: updateTagType is redundant if updateTag handles undefined customText
    // Keeping it might be useful if type changes have specific side effects later
    updateTagType(tagId, newType) {
       return this.updateTag(tagId, newType, undefined); // Use updateTag
    }


    getMultiParagraphTags() {
        return this.allTags.filter(tag => tag.selections && tag.selections.length > 1);
    }

    getTagsForParagraph(paragraphId) {
        // Use the map for efficient lookup
        return [...(this.tags.get(paragraphId) || [])].sort((a, b) => {
            // Sorting logic remains the same
            const selA = a.selections.find(s => s.paragraphId === paragraphId);
            const selB = b.selections.find(s => s.paragraphId === paragraphId);
            return (selA?.startOffset || 0) - (selB?.startOffset || 0);
        });
    }

    getAllParagraphIds() {
        // Get keys from the map
        return Array.from(this.tags.keys());
    }

    getHighestTagId() {
        let highest = -1;
        this.allTags.forEach(tag => {
            const idNum = parseInt(tag.id.replace('tag-', ''));
            if (!isNaN(idNum) && idNum > highest) {
                highest = idNum;
            }
        });
        return highest;
    }

    getTagById(tagId) {
        return this.allTags.find(tag => tag.id === tagId) || null;
    }

    getTagConfig(tagType) {
        return TAG_CONFIG[tagType] || null;
    }

    // --- Voting Methods --- (Save via StateManager after modification)

    upvoteTag(tagId) {
        const tag = this.getTagById(tagId);
        if (!tag) return false;

        const userId = this.currentUser;
        const currentVote = tag.voters[userId] || 0;

        if (currentVote === 1) { // Toggle off upvote
            tag.score -= 1;
            delete tag.voters[userId];
        } else if (currentVote === -1) { // Change downvote to upvote
            tag.score += 2;
            tag.voters[userId] = 1;
        } else { // Add new upvote
            tag.score += 1;
            tag.voters[userId] = 1;
        }

        this.saveTags(); // Save via StateManager
        return tag.score;
    }

    downvoteTag(tagId) {
        const tag = this.getTagById(tagId);
        if (!tag) return false;

        const userId = this.currentUser;
        const currentVote = tag.voters[userId] || 0;

        if (currentVote === -1) { // Toggle off downvote
            tag.score += 1;
            delete tag.voters[userId];
        } else if (currentVote === 1) { // Change upvote to downvote
            tag.score -= 2;
            tag.voters[userId] = -1;
        } else { // Add new downvote
            tag.score -= 1;
            tag.voters[userId] = -1;
        }

        this.saveTags(); // Save via StateManager
        return tag.score;
    }

    getUserVoteForTag(tagId) {
        const tag = this.getTagById(tagId);
        if (!tag) return 0;
        return tag.voters[this.currentUser] || 0;
    }

    demoVote(tagId, isUpvote) {
        if (!this.demoMode) return false;

        const tag = this.getTagById(tagId);
        if (!tag) return false;

        const demoUserId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

        if (isUpvote) {
            tag.score += 1;
            tag.voters[demoUserId] = 1;
        } else {
            tag.score -= 1;
            tag.voters[demoUserId] = -1;
        }

        this.saveTags(); // Save via StateManager
        return tag.score;
    }
}
