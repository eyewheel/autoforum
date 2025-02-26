export const TAG_TYPES = {
    // Reaction tags (no custom text required)
    AGREE: 'agree',
    DISAGREE: 'disagree',
    INSIGHTFUL: 'insightful',
    CONFUSING: 'confusing',
    NEEDS_EVIDENCE: 'needs-evidence',
    MISLEADING: 'misleading',
    
    // Addition tags (custom text required)
    SOURCE: 'source',
    COUNTERPOINT: 'counterpoint',
    EXAMPLE: 'example',
    CLARIFICATION: 'clarification'
};

// Comprehensive tag configuration with metadata
export const TAG_CONFIG = {
    // Reaction tags
    [TAG_TYPES.AGREE]: {
        icon: '👍',
        displayName: 'Agree',
        description: 'Strongly endorse this content',
        color: '#2E7D32', // Green
        backgroundColor: 'rgba(46, 125, 50, 0.15)',
        requiresCustomText: false,
        aiHint: 'Readers strongly endorse this content'
    },
    [TAG_TYPES.DISAGREE]: {
        icon: '👎',
        displayName: 'Disagree',
        description: 'Contest this information or reasoning',
        color: '#C62828', // Red
        backgroundColor: 'rgba(198, 40, 40, 0.15)',
        requiresCustomText: false,
        aiHint: 'Readers contest this information or reasoning'
    },
    [TAG_TYPES.INSIGHTFUL]: {
        icon: '💡',
        displayName: 'Insightful',
        description: 'Highlights particularly valuable or novel ideas',
        color: '#F9A825', // Amber
        backgroundColor: 'rgba(249, 168, 37, 0.15)',
        requiresCustomText: false,
        aiHint: 'Readers find this point especially valuable or insightful'
    },
    [TAG_TYPES.CONFUSING]: {
        icon: '❓',
        displayName: 'Confusing',
        description: 'Marks text that is difficult to understand',
        color: '#7B1FA2', // Purple
        backgroundColor: 'rgba(123, 31, 162, 0.15)',
        requiresCustomText: false,
        aiHint: 'Readers find this explanation confusing or unclear'
    },
    [TAG_TYPES.NEEDS_EVIDENCE]: {
        icon: '📊',
        displayName: 'Needs Evidence',
        description: 'Claims requiring better support or data',
        color: '#0277BD', // Blue
        backgroundColor: 'rgba(2, 119, 189, 0.15)',
        requiresCustomText: false,
        aiHint: 'Readers request more evidence to support this claim'
    },
    [TAG_TYPES.MISLEADING]: {
        icon: '⚠️',
        displayName: 'Misleading',
        description: 'Flags potentially inaccurate information',
        color: '#FF5722', // Deep Orange
        backgroundColor: 'rgba(255, 87, 34, 0.15)',
        requiresCustomText: false,
        aiHint: 'Readers flag this as potentially misleading or inaccurate'
    },
    
    // Addition tags
    [TAG_TYPES.SOURCE]: {
        icon: '📚',
        displayName: 'Source',
        description: 'Add references, citations, or evidence',
        color: '#1565C0', // Blue
        backgroundColor: 'rgba(21, 101, 192, 0.15)',
        requiresCustomText: true,
        aiHint: 'Consider this source or reference added by readers'
    },
    [TAG_TYPES.COUNTERPOINT]: {
        icon: '⚖️',
        displayName: 'Counterpoint',
        description: 'Present opposing viewpoints or arguments',
        color: '#6A1B9A', // Purple
        backgroundColor: 'rgba(106, 27, 154, 0.15)',
        requiresCustomText: true,
        aiHint: 'Consider this counterargument from readers'
    },
    [TAG_TYPES.EXAMPLE]: {
        icon: '🔍',
        displayName: 'Example',
        description: 'Provide real-world examples illustrating the concept',
        color: '#2E7D32', // Green
        backgroundColor: 'rgba(46, 125, 50, 0.15)',
        requiresCustomText: true,
        aiHint: 'Consider this example added by readers'
    },
    [TAG_TYPES.CLARIFICATION]: {
        icon: '🔆',
        displayName: 'Clarification',
        description: 'Elaborate on concepts needing additional explanation',
        color: '#E65100', // Orange
        backgroundColor: 'rgba(230, 81, 0, 0.15)',
        requiresCustomText: true,
        aiHint: 'Consider this clarification from readers'
    }
};

// Keep TAG_ICONS for backward compatibility
export const TAG_ICONS = Object.fromEntries(
    Object.entries(TAG_CONFIG).map(([type, config]) => [type, config.icon])
);

export const CONSTANTS = {
    TAG_SPACING: 40,
    MIN_MARGIN: 10,
    STORAGE_KEY: 'markdownTagging_selectionTags'
};