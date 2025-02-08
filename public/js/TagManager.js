import { CONSTANTS } from './constants.js';

export class TagManager {
    constructor() {
        this.tags = new Map(); // paragraphId -> Tag[]
        this.tagCounter = 0;
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([paragraphId, tags]) => {
                    this.tags.set(paragraphId, tags);
                });
                // Find highest existing tag ID to set counter
                this.tagCounter = this.getHighestTagId() + 1;
            }
        } catch (error) {
            console.error('Error loading tags from storage:', error);
            this.tags.clear();
        }
    }

    saveToStorage() {
        try {
            const toSave = Object.fromEntries(this.tags);
            localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(toSave));
        } catch (error) {
            console.error('Error saving tags to storage:', error);
        }
    }

    addTag(paragraphId, selection, tagType) {
        if (!selection || !tagType) {
            throw new Error('Missing required parameters for adding tag');
        }

        const tagId = `tag-${this.tagCounter++}`;
        const newTag = {
            id: tagId,
            tagType,
            selections: Array.isArray(selection) ? selection : [selection]
        };

        console.log("Selections: ", selection);

        // Add tag reference to each involved paragraph
        newTag.selections.forEach(sel => {
            if (!this.tags.has(sel.paragraphId)) {
                this.tags.set(sel.paragraphId, []);
            }
            this.tags.get(sel.paragraphId).push(newTag);
        });

        console.log('Added tag:', newTag);

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