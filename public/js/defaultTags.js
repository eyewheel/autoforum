import { TAG_TYPES } from './constants.js'; // Import the valid types

export const DEFAULT_TAGS = {
    // No default tags for post1
    'post2': {
        "p-1": [{
            id: "tag-1",
            tagType: TAG_TYPES.CLARIFICATION,
            selections: [{
                paragraphId: "p-1",
                startOffset: 0,
                endOffset: 16
            }]
        }],
        "p-2": [{
            id: "tag-2",
            tagType: TAG_TYPES.INSIGHTFUL,
            selections: [{
                paragraphId: "p-2",
                startOffset: 0,
                endOffset: 57
            }]
        }]
    },
    'post3': {
        "p-1": [{
            id: "tag-1",
            tagType: TAG_TYPES.CLARIFICATION,
            selections: [{
                paragraphId: "p-1",
                startOffset: 1,
                endOffset: 15
            }]
        }],
        "p-3": [{
            id: "tag-2",
            tagType: TAG_TYPES.INSIGHTFUL,
            selections: [{
                paragraphId: "p-3",
                startOffset: 0,
                endOffset: 89
            }]
        }],
        "p-4": [{
            id: "tag-3",
            tagType: TAG_TYPES.CONFUSING,
            selections: [{
                paragraphId: "p-4",
                startOffset: 0,
                endOffset: 127
            }]
        }],
        "p-8": [{
            id: "tag-4",
            tagType: TAG_TYPES.CLARIFICATION,
            selections: [{
                paragraphId: "p-8",
                startOffset: 0,
                endOffset: 166
            }]
        }]
    }
};