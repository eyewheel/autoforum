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

    // tag.customText
    // Construct the prompt
    const prompt = `You are an expert in content improvement. Your task is to improve specific paragraphs in a Markdown document without altering the rest of the document.

Content to improve:
${fullText}

Paragraphs that need improvement, with their tags:
${paragraphsArray.map(p => `
Paragraph ${p.id}:
Text: ${p.text}
Tags: ${p.tags.map(tag => `
  - Type: ${tag.type}${tag.customText ? `
  - Custom Note: "${tag.customText}"` : ''}
  - Selections: ${tag.selections.map(s => `"${s.text}"`).join(', ')}`).join('\n')}
`).join('\n')}

Return the original document with only the tagged paragraphs revised, taking into consideration the users' tags., and retaining the Markdown format, as your response will be
directly inserted into the article.
Do not edit any paragraphs that are not in the list of "paragraphs that need improvement", even if changes seem obvious, but feel free to edit the paragraphs in that list
extensively in order to fulfill the user wishes as expressed in the tags. Make sure not to ignore any tagged paragraphs`;

    console.log(prompt);
    console.log(paragraphsArray);

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
