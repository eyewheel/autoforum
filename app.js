// app.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const marked = require('marked');
const fs = require('fs').promises;
const path = require('path');
const { generateText } = require("ai"); // Import generateText from 'ai'
const { createOpenRouter } = require('@openrouter/ai-sdk-provider'); // Import createOpenRouter

const app = express();
const port = 3000;

// Initialize OpenRouter client with API key from environment variables
const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY, // Securely load API key from .env
});

// Middleware to serve static files
app.use(express.static('public'));
app.use(express.json()); // Middleware to parse JSON request bodies

// Custom renderer to wrap paragraphs
const renderer = new marked.Renderer();
let paragraphCounter = 0;

renderer.paragraph = (token) => {
    const id = `p-${paragraphCounter++}`;
    const content = typeof token === 'object' ? token.text : token;
    return `<div class="paragraph" id="${id}">
              ${content}
            </div>`;
};

// Configure marked options
const options = {
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false,
    renderer: renderer,
    xhtml: true,
    headerPrefix: 'section-'
};

// Create new marked instance with options
const parser = new marked.Marked(options);

// Root route to serve index.html
app.get('/', async (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error serving index.html:', error);
        res.status(500).send('Server error');
    }
});

// API endpoint to list available pages
app.get('/api/pages', async (req, res) => {
    try {
        const contentDir = path.join(__dirname, 'content');
        const files = await fs.readdir(contentDir);
        const markdownFiles = files.filter(file => file.endsWith('.md'));
        const pageNames = markdownFiles.map(file => file.replace('.md', ''));
        res.json(pageNames);
    } catch (error) {
        console.error('Error listing pages:', error);
        res.status(500).json({ error: 'Failed to list pages' });
    }
});

// Route to serve markdown files
app.get('/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const markdownPath = path.join(__dirname, 'content', `${filename}.md`);

        paragraphCounter = 0; // Reset paragraph counter for each file

        const markdownContent = await fs.readFile(markdownPath, 'utf8');
        const htmlContent = await parser.parse(markdownContent);

        const template = await fs.readFile(path.join(__dirname, 'views', 'template.html'), 'utf8');

        const fullHtml = template
            .replace('{{title}}', filename)
            .replace('{{content}}', htmlContent);

        res.send(fullHtml);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).send('File not found');
        } else {
            console.error('Error:', error);
            res.status(500).send('Server error');
        }
    }
});

// API endpoint to handle OpenRouter requests
app.post('/api/ask-openrouter', async (req, res) => {
    const prompt = req.body.prompt;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        const { text } = await generateText({
            model: openrouter.chat('google/gemini-2.0-flash-001'),
            prompt: prompt,
        });
        res.json({ response: text });
    } catch (error) {
        console.error("Error calling OpenRouter:", error);
        res.status(500).json({ error: "Failed to get response from OpenRouter" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});