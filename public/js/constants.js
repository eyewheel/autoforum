export const TAG_TYPES = {
    IMPORTANT: 'important',
    QUESTION: 'question',
    DEFINITION: 'would-like-more-real-world-examples',
    CLARIFICATION: 'needs-clarification',
    EXAMPLE: 'example',
    SUGGESTION: 'suggestion'
};

// Comprehensive tag configuration with metadata
export const TAG_CONFIG = {
    [TAG_TYPES.IMPORTANT]: {
        icon: '★',
        displayName: 'Important',
        description: 'Highlight key information or concepts',
        color: '#d32f2f',
        backgroundColor: 'rgba(211, 47, 47, 0.15)',
        requiresCustomText: false,
        aiHint: 'Emphasize and elaborate on this important concept'
    },
    [TAG_TYPES.QUESTION]: {
        icon: '?',
        displayName: 'Question',
        description: 'Mark areas needing answers or explanation',
        color: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.15)',
        requiresCustomText: true,
        aiHint: 'Address this specific question or concern'
    },
    [TAG_TYPES.DEFINITION]: {
        icon: '§',
        displayName: 'Needs Examples',
        description: 'Request more real-world examples',
        color: '#388e3c',
        backgroundColor: 'rgba(56, 142, 60, 0.15)',
        requiresCustomText: false,
        aiHint: 'Provide practical examples for this concept'
    },
    [TAG_TYPES.CLARIFICATION]: {
        icon: '↺',
        displayName: 'Needs Clarification',
        description: 'Mark text that needs to be explained better',
        color: '#f57c00',
        backgroundColor: 'rgba(245, 124, 0, 0.15)',
        requiresCustomText: true,
        aiHint: 'Clarify this concept with simpler explanation'
    },
    [TAG_TYPES.EXAMPLE]: {
        icon: '⚏',
        displayName: 'Example',
        description: 'Highlight example code or scenarios',
        color: '#7b1fa2',
        backgroundColor: 'rgba(123, 31, 162, 0.15)',
        requiresCustomText: false,
        aiHint: 'Reference this example in explanations'
    },
    [TAG_TYPES.SUGGESTION]: {
        icon: '✎',
        displayName: 'Suggestion',
        description: 'Propose improvements or alternatives',
        color: '#0288d1',
        backgroundColor: 'rgba(2, 136, 209, 0.15)',
        requiresCustomText: true,
        aiHint: 'Consider this suggestion for improvement'
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