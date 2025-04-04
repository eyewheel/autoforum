import { CONSTANTS } from './constants.js';

/**
 * Manages the application state stored in localStorage, including
 * content versions (canonical, personalized), user preferences, and UI state.
 */
export class StateManager {
    constructor(pageName) {
        this.pageName = pageName; // e.g., 'readme', 'index'

        // Define localStorage keys dynamically based on pageName
        this.keys = {
            canonicalContent: `contributions_content_${this.pageName}`,
            personalizationPrefs: `personalization_prefs_${this.pageName}`,
            personalizedContentCache: `personalized_content_cache_${this.pageName}`,
            sidebarState: `sidebar_state`, // Sidebar state might be global? Or should be page specific too? Let's keep global for now.
            tags: `${CONSTANTS.STORAGE_KEY}_${this.pageName}` // Tag storage key
        };

        // Load initial state (optional, could be lazy-loaded)
        this.state = this.loadSidebarState(); // Load sidebar state globally initially
    }

    // --- Private Helper for Safe JSON Parsing ---
    _safeJsonParse(key) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error(`Error parsing JSON from localStorage key "${key}":`, error);
            localStorage.removeItem(key); // Remove corrupted data
            return null;
        }
    }

    // --- Canonical Content (Latest Contributed Version) ---
    getCanonicalContent() {
        return localStorage.getItem(this.keys.canonicalContent); // Stored as raw string (Markdown)
    }

    saveCanonicalContent(content) {
        try {
            localStorage.setItem(this.keys.canonicalContent, content);
            console.log(`Saved canonical content for page: ${this.pageName}`);
        } catch (error) {
            console.error(`Error saving canonical content for page ${this.pageName}:`, error);
        }
    }

    hasCanonicalContent() {
        return localStorage.getItem(this.keys.canonicalContent) !== null;
    }

    // --- Personalization Preferences ---
    getPersonalizationPrefs() {
        return this._safeJsonParse(this.keys.personalizationPrefs); // Stored as JSON object { prompt: "..." }
    }

    savePersonalizationPrefs(prefs) {
        try {
            localStorage.setItem(this.keys.personalizationPrefs, JSON.stringify(prefs));
            console.log(`Saved personalization prefs for page: ${this.pageName}`);
        } catch (error) {
            console.error(`Error saving personalization prefs for page ${this.pageName}:`, error);
        }
    }

    hasPersonalizationPrefs() {
        return localStorage.getItem(this.keys.personalizationPrefs) !== null;
    }

    // --- Personalized Content Cache ---
    getPersonalizedContentCache() {
        return localStorage.getItem(this.keys.personalizedContentCache); // Stored as raw string (Markdown)
    }

    savePersonalizedContentCache(content) {
        try {
            localStorage.setItem(this.keys.personalizedContentCache, content);
            console.log(`Saved personalized content cache for page: ${this.pageName}`);
        } catch (error) {
            console.error(`Error saving personalized content cache for page ${this.pageName}:`, error);
        }
    }

    hasPersonalizedContentCache() {
        return localStorage.getItem(this.keys.personalizedContentCache) !== null;
    }

    clearPersonalizedContentCache() {
        try {
            localStorage.removeItem(this.keys.personalizedContentCache);
            console.log(`Cleared personalized content cache for page: ${this.pageName}`);
        } catch (error) {
            console.error(`Error clearing personalized content cache for page ${this.pageName}:`, error);
        }
    }

    // --- Sidebar State (Global UI State) ---
    loadSidebarState() {
        const defaultState = { personalization: false, contributions: false };
        const state = this._safeJsonParse(this.keys.sidebarState);
        // Ensure state object has the expected properties
        return { ...defaultState, ...(state || {}) };
    }

    getSidebarState() {
        // Return a copy to prevent direct mutation
        return { ...this.state };
    }

    updateSidebarState(newState) {
        try {
            // Merge new state with existing state
            this.state = { ...this.state, ...newState };
            localStorage.setItem(this.keys.sidebarState, JSON.stringify(this.state));
            console.log(`Saved sidebar state:`, this.state);
        } catch (error) {
            console.error('Error saving sidebar state:', error);
        }
    }

    // --- Tag Data (Could potentially move to TagManager later) ---
    // Provides access, but modification logic might belong elsewhere
    getTags() {
        // Assuming tags are stored as JSON array or object
        return this._safeJsonParse(this.keys.tags);
    }

    saveTags(tags) {
        // Note: This might conflict if TagManager directly saves. Coordinate usage.
        try {
            localStorage.setItem(this.keys.tags, JSON.stringify(tags));
            console.log(`Saved tags for page: ${this.pageName}`);
        } catch (error) {
            console.error(`Error saving tags for page ${this.pageName}:`, error);
        }
    }
} 