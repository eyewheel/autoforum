import { CONSTANTS } from './constants.js';
import { DEFAULT_TAGS } from './defaultTags.js';

export class TagManager {
    constructor() {
        this.tags = new Map(); // paragraphId -> Tag[]
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
                Object.entries(parsed).forEach(([paragraphId, tags]) => {
                    this.tags.set(paragraphId, tags);
                });
            } else {
                // If no tags in localStorage, check for default tags
                const currentPage = this.getCurrentPage();
                const defaultTags = DEFAULT_TAGS[currentPage];

                if (defaultTags) {
                    // Load default tags if they exist
                    Object.entries(defaultTags).forEach(([paragraphId, tags]) => {
                        this.tags.set(paragraphId, tags);
                    });
                    // Save default tags to localStorage
                    this.saveToStorage();
                }
            }

            // Find highest existing tag ID to set counter
            this.tagCounter = this.getHighestTagId() + 1;
        } catch (error) {
            console.error('Error loading tags from storage:', error);
            this.tags.clear();
        }
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index';
        return pageName;
    }

    saveToStorage() {
        try {
            const storageKey = CONSTANTS.STORAGE_KEY + '_' + this.getCurrentPage();
            const toSave = Object.fromEntries(this.tags);
            localStorage.setItem(storageKey, JSON.stringify(toSave));
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

        // Add tag reference to each involved paragraph
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
        let deleted = false;
        this.tags.forEach((tags, paragraphId) => {
            const filteredTags = tags.filter(tag => tag.id !== tagId);
            if (filteredTags.length !== tags.length) {
                if (filteredTags.length === 0) {
                    this.tags.delete(paragraphId);
                } else {
                    this.tags.set(paragraphId, filteredTags);
                }
                deleted = true;
            }
        });

        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }

    updateTagType(tagId, newType) {
        let updated = false;
        this.tags.forEach((tags) => {
            const tag = tags.find(t => t.id === tagId);
            if (tag) {
                tag.tagType = newType;
                updated = true;
            }
        });

        if (updated) {
            this.saveToStorage();
        }
        return updated;
    }

    getMultiParagraphTags() {
        const multiParagraphTags = new Set();
        this.tags.forEach(tags => {
            tags.forEach(tag => {
                if (tag.selections && tag.selections.length > 1) {
                    multiParagraphTags.add(tag);
                }
            });
        });
        return Array.from(multiParagraphTags);
    }

    getTagsForParagraph(paragraphId) {
        return [...(this.tags.get(paragraphId) || [])].sort((a, b) =>
            a.startOffset - b.startOffset
        );
    }

    getAllParagraphIds() {
        return Array.from(this.tags.keys());
    }

    getHighestTagId() {
        let highest = -1;
        this.tags.forEach(tags => {
            tags.forEach(tag => {
                const id = parseInt(tag.id.replace('tag-', ''));
                if (!isNaN(id) && id > highest) {
                    highest = id;
                }
            });
        });
        return highest;
    }
}
