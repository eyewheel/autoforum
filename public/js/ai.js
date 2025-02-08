document.addEventListener('DOMContentLoaded', async () => {
    const prompt = "What is 2+2?";

    try {
        const response = await fetch('/api/ask-openrouter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();

        if (response.ok && data.response) {
            console.log("OpenRouter Response:", data.response); // Log the response to the console
        } else {
            console.error("Error from server:", data.error);
        }
    } catch (error) {
        console.error("Network error:", error);
    }
});