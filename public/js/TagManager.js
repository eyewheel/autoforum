import { CONSTANTS } from './constants.js';
import { DEFAULT_TAGS } from './defaultTags.js';
import { TAG_CONFIG } from './constants.js';

export class TagManager {
    constructor() {
        this.tags = new Map(); // paragraphId -> Tag[] (for efficient lookups during rendering)
        this.allTags = []; // Primary storage - array of all tags
        this.tagCounter = 0;
        this.currentUser = this.getCurrentUser(); // Get or create a user ID
        this.demoMode = false; // Default to normal mode
        this.loadFromStorage();
    }

    // Get or create a unique user ID for voting tracking
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

    loadFromStorage() {
        try {
            const storageKey = CONSTANTS.STORAGE_KEY + '_' + this.getCurrentPage();
            const stored = localStorage.getItem(storageKey);

            if (stored) {
                // If tags exist in localStorage, use them
                const parsed = JSON.parse(stored);
                
                // Check if we're using the new storage format
                if (Array.isArray(parsed)) {
                    // New format - direct tag storage
                    this.allTags = parsed;

                    // Ensure all tags have score and voters properties
                    this.allTags.forEach(tag => {
                        if (typeof tag.score === 'undefined') {
                            tag.score = 0;
                        }
                        if (!tag.voters) {
                            tag.voters = {};
                        }
                    });
                } else {
                    // Old format - convert from paragraph-based to direct tag storage
                    console.log("Converting from old storage format...");
                    const uniqueTags = new Map();
                    
                    // Extract unique tags from paragraph-based storage
                    Object.entries(parsed).forEach(([paragraphId, tags]) => {
                        tags.forEach(tag => {
                            if (!uniqueTags.has(tag.id)) {
                                // Add score and voters if not present
                                if (typeof tag.score === 'undefined') {
                                    tag.score = 0;
                                }
                                if (!tag.voters) {
                                    tag.voters = {};
                                }
                                uniqueTags.set(tag.id, tag);
                            }
                        });
                    });
                    
                    this.allTags = Array.from(uniqueTags.values());
                }

                // Build the paragraph -> tags lookup map
                this.rebuildTagsMap();
            } else {
                // If no tags in localStorage, check for default tags
                const currentPage = this.getCurrentPage();
                const defaultTags = DEFAULT_TAGS[currentPage];

                if (defaultTags) {
                    // Convert default tags from old format if needed
                    const uniqueTags = new Map();
                    
                    // Extract unique tags
                    Object.entries(defaultTags).forEach(([paragraphId, tags]) => {
                        tags.forEach(tag => {
                            if (!uniqueTags.has(tag.id)) {
                                // Add score and voters if not present
                                if (typeof tag.score === 'undefined') {
                                    tag.score = 0;
                                }
                                if (!tag.voters) {
                                    tag.voters = {};
                                }
                                uniqueTags.set(tag.id, tag);
                            }
                        });
                    });
                    
                    this.allTags = Array.from(uniqueTags.values());
                    
                    // Build the paragraph -> tags lookup map
                    this.rebuildTagsMap();
                    
                    // Save to storage in new format
                    this.saveToStorage();
                }
            }

            // Find highest existing tag ID to set counter
            this.tagCounter = this.getHighestTagId() + 1;
        } catch (error) {
            console.error('Error loading tags from storage:', error);
            this.tags.clear();
            this.allTags = [];
        }
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
                this.tags.get(paragraphId).push(tag);
            });
        });
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index';
        return pageName;
    }

    saveToStorage() {
        try {
            const storageKey = CONSTANTS.STORAGE_KEY + '_' + this.getCurrentPage();
            // Store tags directly in an array
            localStorage.setItem(storageKey, JSON.stringify(this.allTags));
        } catch (error) {
            console.error('Error saving tags to storage:', error);
        }
    }

    addTag(paragraphId, selection, tagType, text) {
        // Check if we're in a non-default mode
        if (window.contentVersion && (window.contentVersion.hasContributions || window.contentVersion.hasPersonalization)) {
            console.warn('Tags cannot be added in contribution or personalization modes');
            return null;
        }

        if (!selection || !tagType) {
            throw new Error('Missing required parameters for adding tag');
        }

        const tagId = `tag-${this.tagCounter++}`;
        const newTag = {
            id: tagId,
            tagType,
            selections: Array.isArray(selection) ? selection : [selection],
            customText: text,
            score: 0,             // Initialize score to 0
            voters: {}            // Initialize empty voters object
        };

        // Add to primary storage
        this.allTags.push(newTag);

        // Add tag reference to each involved paragraph for quick lookup
        newTag.selections.forEach(sel => {
            if (!this.tags.has(sel.paragraphId)) {
                this.tags.set(sel.paragraphId, []);
            }
            this.tags.get(sel.paragraphId).push(newTag);
        });

        this.saveToStorage();
        return newTag;
    }

    deleteTag(tagId) {
        // Find the tag index in the allTags array
        const tagIndex = this.allTags.findIndex(tag => tag.id === tagId);
        if (tagIndex === -1) {
            return false;
        }
        
        // Get the tag to determine which paragraphs need updating
        const tag = this.allTags[tagIndex];
        const affectedParagraphs = tag.selections.map(s => s.paragraphId);
        
        // Remove the tag from allTags
        this.allTags.splice(tagIndex, 1);
        
        // Update the paragraph -> tags map
        affectedParagraphs.forEach(paragraphId => {
            if (this.tags.has(paragraphId)) {
                const paragraphTags = this.tags.get(paragraphId).filter(t => t.id !== tagId);
                if (paragraphTags.length === 0) {
                    this.tags.delete(paragraphId);
                } else {
                    this.tags.set(paragraphId, paragraphTags);
                }
            }
        });
        
        this.saveToStorage();
        return true;
    }

    updateTagType(tagId, newType) {
        // Find the tag in the allTags array
        const tag = this.allTags.find(t => t.id === tagId);
        if (tag) {
            tag.tagType = newType;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    updateTag(tagId, newType, customText) {
        // Find the tag in the allTags array
        const tag = this.allTags.find(t => t.id === tagId);
        if (tag) {
            tag.tagType = newType;
            tag.customText = customText;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    getMultiParagraphTags() {
        return this.allTags.filter(tag => tag.selections && tag.selections.length > 1);
    }

    getTagsForParagraph(paragraphId) {
        return [...(this.tags.get(paragraphId) || [])].sort((a, b) => {
            // Get selections for this paragraph
            const selA = a.selections.find(s => s.paragraphId === paragraphId);
            const selB = b.selections.find(s => s.paragraphId === paragraphId);
            // Sort by start offset
            return (selA?.startOffset || 0) - (selB?.startOffset || 0);
        });
    }

    getAllParagraphIds() {
        return Array.from(this.tags.keys());
    }

    getHighestTagId() {
        let highest = -1;
        this.allTags.forEach(tag => {
            const id = parseInt(tag.id.replace('tag-', ''));
            if (!isNaN(id) && id > highest) {
                highest = id;
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

    // NEW METHODS FOR TAG SCORING

    // Vote up on a tag
    upvoteTag(tagId) {
        const tag = this.getTagById(tagId);
        if (!tag) return false;

        const userId = this.currentUser;
        const currentVote = tag.voters[userId] || 0;

        // If already upvoted, remove the vote (toggle off)
        if (currentVote === 1) {
            tag.score -= 1;
            delete tag.voters[userId];
        } 
        // If downvoted, change to upvote (2 point swing)
        else if (currentVote === -1) {
            tag.score += 2;
            tag.voters[userId] = 1;
        } 
        // If no vote, add upvote
        else {
            tag.score += 1;
            tag.voters[userId] = 1;
        }

        this.saveToStorage();
        return tag.score;
    }

    // Vote down on a tag
    downvoteTag(tagId) {
        const tag = this.getTagById(tagId);
        if (!tag) return false;

        const userId = this.currentUser;
        const currentVote = tag.voters[userId] || 0;

        // If already downvoted, remove the vote (toggle off)
        if (currentVote === -1) {
            tag.score += 1;
            delete tag.voters[userId];
        } 
        // If upvoted, change to downvote (2 point swing)
        else if (currentVote === 1) {
            tag.score -= 2;
            tag.voters[userId] = -1;
        } 
        // If no vote, add downvote
        else {
            tag.score -= 1;
            tag.voters[userId] = -1;
        }

        this.saveToStorage();
        return tag.score;
    }

    // Get current user's vote on a tag
    getUserVoteForTag(tagId) {
        const tag = this.getTagById(tagId);
        if (!tag) return 0;
        return tag.voters[this.currentUser] || 0;
    }

    // Demo mode voting (simulates multiple users)
    demoVote(tagId, isUpvote) {
        if (!this.demoMode) return false;
        
        const tag = this.getTagById(tagId);
        if (!tag) return false;

        // Generate a random user ID for the demo vote
        const demoUserId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        if (isUpvote) {
            tag.score += 1;
            tag.voters[demoUserId] = 1;
        } else {
            tag.score -= 1;
            tag.voters[demoUserId] = -1;
        }

        this.saveToStorage();
        return tag.score;
    }
}
