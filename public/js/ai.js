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

export async function contributeContent(taggedParagraphs) {
    // Convert the Map to an array of objects for easier prompt construction
    const paragraphsArray = Array.from(taggedParagraphs.entries()).map(([id, data]) => ({
        id,
        text: data.text,
        tags: data.tags
    }));

    // Get the full text content
    const contentContainer = document.getElementById('content');
    const fullText = contentContainer.innerText;

    // Construct the prompt
    const prompt = `You are an expert in content improvement. Your task is to improve specific paragraphs while maintaining the core meaning and educational value.

Content to improve:
${fullText}

Paragraphs that need improvement, with their tags:
${paragraphsArray.map(p => `
Paragraph ${p.id}:
Text: ${p.text}
Tags: ${p.tags.map(tag => `
  - Type: ${tag.type}
  - Selections: ${tag.selections.map(s => `"${s.text}"`).join(', ')}`).join('\n')}
`).join('\n')}

Important: Provide the improved content in markdown format:
1. Use # for the main title (e.g., "# Understanding Data Structures")
2. Use ## for section headers (e.g., "## Arrays and Lists")
3. Use regular paragraphs for content
4. Use markdown list syntax with - for bullet points
5. Do not use code blocks or special formatting
6. Keep the exact same structure and headers as the original

Return the complete content with your improvements, making sure to:
- Preserve the core meaning of tagged sections
- Maintain proper markdown formatting with # and ## for headers
- Keep the same document structure`;

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
            // console.log('Raw AI contribution response:', data.response);
            
            // Clean and format the markdown
            const formattedResponse = cleanAndFormatMarkdown(data.response);
            // console.log('Formatted markdown contribution:', formattedResponse);
            
            return formattedResponse;
        } else {
            throw new Error(data.error || 'Failed to get AI response');
        }
    } catch (error) {
        console.error("AI contribution error:", error);
        throw error;
    }
}