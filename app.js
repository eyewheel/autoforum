// app.js
const express = require('express');
const marked = require('marked');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Middleware to serve static files
app.use(express.static('public'));

// Custom renderer to wrap paragraphs
const renderer = new marked.Renderer();
let paragraphCounter = 0;

renderer.paragraph = (token) => {
    const id = `p-${paragraphCounter++}`;
    const content = typeof token === 'object' ? token.text : token;
    return `<div class="paragraph-container">
              <div class="paragraph" id="${id}">
                ${content}
              </div>
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});