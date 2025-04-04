// app.js
require('dotenv').config();
const express = require('express');
const marked = require('marked');
const fs = require('fs').promises;
const path = require('path');
const { generateText } = require("ai");
const { createOpenRouter } = require('@openrouter/ai-sdk-provider');

const app = express();
const port = 3000;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

app.use(express.static('public'));
app.use(express.json());

// --- Marked Configuration --- //
// Keep track of paragraph IDs per request
// We need a middleware or a way to reset this per request if we rely on a global counter.
// For simplicity now, let's reset it in the parse route.
// TODO: Improve paragraph ID generation to be stable across requests/renders.
let paragraphCounter = 0;

const renderer = new marked.Renderer();
renderer.paragraph = (token) => {
    // Extract text content correctly, whether input is string or token object
    const text = typeof token === 'object' && token.text ? token.text : token;
    // Add a check to ensure we actually have a string before parsing
    if (typeof text !== 'string') {
        console.error("Unexpected non-string input to paragraph renderer:", token);
        // Return an empty div or placeholder to avoid crashing
        return '<div>[Error rendering paragraph]</div>\n';
    }
    const id = `p-${paragraphCounter++}`;
    return `<div class="paragraph" id="${id}">${marked.parseInline(text)}</div>\n`;
};

const options = {
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false,
    renderer: renderer,
    xhtml: true,
    headerPrefix: 'section-',
    pedantic: false,
    smartLists: true,
    smartypants: false, // Changed to false to avoid potential issues with quotes/dashes in AI content
};
marked.setOptions(options);

// --- Helper Function to Read Content File --- //
async function readMarkdownFile(filename) {
    const markdownPath = path.join(__dirname, 'content', `${filename}.md`);
    try {
        let markdownContent = await fs.readFile(markdownPath, 'utf8');
        markdownContent = markdownContent.trim();
        // Handle old format with DEFAULT section
        if (markdownContent.includes('<!-- DEFAULT START -->')) {
            const defaultSection = markdownContent.match(/<!-- DEFAULT START -->([\s\S]*?)<!-- DEFAULT END -->/);
            if (defaultSection) {
                markdownContent = defaultSection[1].trim();
            }
        }
        return markdownContent;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('File not found'); // Throw specific error type?
        } else {
            throw error; // Re-throw other errors
        }
    }
}

// --- Routes --- //

// Root route: Serve index.html
app.get('/', async (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error serving index.html:', error);
        res.status(500).send('Server error');
    }
});

// API: Get content (raw or parsed)
app.get('/api/content/:filename', async (req, res) => {
    const filename = req.params.filename;
    const raw = req.query.raw === 'true'; // Check for ?raw=true

    try {
        const markdownContent = await readMarkdownFile(filename);

        if (raw) {
            // Return raw markdown content
            res.json({ rawMarkdown: markdownContent });
        } else {
            // DEPRECATED: This route should ideally only return raw markdown now.
            // The client should use the /api/parse-markdown endpoint.
            // Keeping the parsing logic here temporarily for backward compatibility if needed,
            // but prefer switching the client fully.
            console.warn("Deprecated usage of /api/content/:filename for parsed HTML. Use /api/parse-markdown instead.");
            paragraphCounter = 0; // Reset counter for parsing
            const htmlContent = await marked.parse(markdownContent);
            const formattedHtml = htmlContent.replace(/<\/div>/g, '</div>\n'); // Basic formatting
            res.json({
                content: formattedHtml, // Original response field
                title: filename
            });
        }
    } catch (error) {
        if (error.message === 'File not found') {
            res.status(404).json({ error: 'File not found' });
        } else {
            console.error(`Error processing /api/content/${filename}:`, error);
            res.status(500).json({ error: 'Server error processing content' });
        }
    }
});

// API: Parse Markdown to HTML
app.post('/api/parse-markdown', async (req, res) => {
    const { markdown } = req.body;

    if (typeof markdown !== 'string') {
        return res.status(400).json({ error: 'Request body must contain a "markdown" string property.' });
    }

    try {
        paragraphCounter = 0; // Reset counter before each parse
        const html = await marked.parse(markdown);
        // Optionally format further if needed
        // const formattedHtml = html.replace(/<\/div>/g, '</div>\n');
        res.json({ html: html });
    } catch (error) { // Catch errors during parsing
        console.error("Markdown parsing error:", error);
        res.status(500).json({ error: "Failed to parse markdown" });
    }
});

// API: List available pages
app.get('/api/pages', async (req, res) => {
    try {
        const contentDir = path.join(__dirname, 'content');
        const files = await fs.readdir(contentDir);
        const markdownFiles = files
            .filter(file => file.endsWith('.md'))
            .map(file => file.replace('.md', ''));
        res.json(markdownFiles);
    } catch (error) {
        console.error('Error listing pages:', error);
        res.status(500).json({ error: 'Failed to list pages' });
    }
});

// Page route: Serve the main HTML template (content is loaded client-side)
// This route might become simpler or unnecessary if everything is loaded via client-side JS
app.get('/:filename', async (req, res, next) => {
    // Check if filename looks like a file extension (e.g. .js, .css) to avoid catching asset requests
    if (path.extname(req.params.filename)) {
        return next(); // Pass to static middleware or 404
    }
    // Serve the main template for any other path, client-side routing handles the rest
    try {
        const templatePath = path.join(__dirname, 'views', 'template.html');
        // Send the template without injecting content, client will handle it.
        res.sendFile(templatePath);
    } catch (error) {
         console.error('Error serving template:', error);
         res.status(500).send('Server error');
    }
});

// API: Proxy requests to OpenRouter
app.post('/api/ask-openrouter', async (req, res) => {
    const { prompt } = req.body; // Destructure prompt from body

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        const { text } = await generateText({
            model: openrouter.chat('google/gemini-flash-1.5'), // Using recommended flash model
            prompt: prompt,
        });
        res.json({ response: text });
    } catch (error) {
        console.error("Error calling OpenRouter:", error);
        // Attempt to parse potential API error messages
        const errorMessage = error.response?.data?.error?.message || error.message || "Failed to get response from OpenRouter";
        res.status(500).json({ error: errorMessage });
    }
});

// --- Server Start --- //
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
