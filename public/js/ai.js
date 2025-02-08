// AI Helper Functions
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
            // Ensure we're returning clean markdown without any code blocks
            return data.response.replace(/```/g, '');
        } else {
            throw new Error(data.error || 'Failed to get AI response');
        }
    } catch (error) {
        console.error("AI personalization error:", error);
        throw error;
    }
}