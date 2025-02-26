import { CONSTANTS } from './constants.js';
import { DEFAULT_TAGS } from './defaultTags.js';
import { TAG_CONFIG } from './constants.js';

export class TagManager {
    constructor() {
        this.tags = new Map(); // paragraphId -> Tag[] (for efficient lookups during rendering)
        this.allTags = []; // Primary storage - array of all tags
        this.tagCounter = 0;
        this.loadFromStorage();
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
                } else {
                    // Old format - convert from paragraph-based to direct tag storage
                    console.log("Converting from old storage format...");
                    const uniqueTags = new Map();
                    
                    // Extract unique tags from paragraph-based storage
                    Object.entries(parsed).forEach(([paragraphId, tags]) => {
                        tags.forEach(tag => {
                            if (!uniqueTags.has(tag.id)) {
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
            customText: text
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
}
