// AI Helper Functions

// Helper function to clean and format markdown content
function cleanAndFormatMarkdown(text) {
    return text
        .replace(/```[^`]*```/g, '')     // Remove code blocks with their content
        .replace(/```/g, '')             // Remove any remaining code block markers
        .replace(/^(#+)([^#\s])/gm, '$1 $2')  // Add space after # if missing
        .replace(/^\s+/gm, '')           // Remove leading spaces from all lines
        .replace(/\n{3,}/g, '\n\n')      // Normalize multiple line breaks to double
        .trim();
}

export async function personalizeContent(content, preferences) {
    const prompt = `You are an expert in personalized content adaptation. Your task is to adapt the following content according to the user's preferences while maintaining its core meaning and educational value.

Content to personalize:
${content}

User's personalization preferences:
${preferences}

Important: Provide the personalized content in markdown format. Use regular markdown headings (#, ##) and paragraphs. Do not wrap the response in code blocks or use any special formatting - just plain markdown text with basic headings and paragraphs.`;

    try {
        const response = await fetch('/api/ask-openrouter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (response.ok && data.response) {
            // Log the raw AI response
            // console.log('Raw AI response:', data.response);

            // Clean and format the markdown
            const formattedResponse = cleanAndFormatMarkdown(data.response);
            // console.log('Formatted markdown response:', formattedResponse);

            return formattedResponse;
        } else {
            throw new Error(data.error || 'Failed to get AI response');
        }
    } catch (error) {
        console.error("AI personalization error:", error);
        throw error;
    }
}

// Note: the contributeContent function is now moved to ContributionProcessor.js
// to better handle paragraph grouping and targeted replacement
