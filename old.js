// First, create a new directory and initialize a new Node.js project
// Run these commands in your terminal:
// mkdir markdown-server
// cd markdown-server
// npm init -y

// Install required dependencies
// npm install express marked fs path

// app.js
const express = require('express');
const marked = require('marked');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Middleware to serve static files from the 'public' directory
app.use(express.static('public'));

// Configure marked options (optional)
marked.setOptions({
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // Convert line breaks to <br>
    headerIds: true, // Add IDs to headers for linking
    mangle: false // Prevent header ID mangling
});

// Route to serve markdown files
app.get('/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const markdownPath = path.join(__dirname, 'content', `${filename}.md`);
        
        // Read the markdown file
        const markdownContent = await fs.readFile(markdownPath, 'utf8');
        
        // Convert markdown to HTML
        const htmlContent = marked.parse(markdownContent);
        
        // Wrap HTML in a template with selection functionality
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${filename}</title>
                <style>
                    body {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        font-family: -apple-system, system-ui, BlinkMacSystemFont, 
                                   "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    pre {
                        background-color: #f6f8fa;
                        padding: 16px;
                        border-radius: 6px;
                        overflow-x: auto;
                    }
                    code {
                        font-family: Consolas, Monaco, 'Andale Mono', monospace;
                    }
                    .tag-menu {
                        position: absolute;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        display: none;
                        padding: 8px;
                        z-index: 1000;
                    }
                    .tag-menu button {
                        display: block;
                        width: 100%;
                        padding: 8px 16px;
                        margin: 4px 0;
                        border: none;
                        background: #f0f0f0;
                        border-radius: 4px;
                        cursor: pointer;
                        text-align: left;
                    }
                    .tag-menu button:hover {
                        background: #e0e0e0;
                    }
                    .tagged-text {
                        position: relative;
                        display: inline;
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                    .tagged-text[data-tag="important"] {
                        background-color: #ffe6e6;
                    }
                    .tagged-text[data-tag="question"] {
                        background-color: #e6f3ff;
                    }
                    .tagged-text[data-tag="definition"] {
                        background-color: #e6ffe6;
                    }
                    .tag-label {
                        position: absolute;
                        top: -18px;
                        left: 0;
                        font-size: 12px;
                        color: #666;
                        background: white;
                        padding: 0 4px;
                        border-radius: 2px;
                        border: 1px solid #ccc;
                    }
                </style>
            </head>
            <body>
                <div id="content">
                    ${htmlContent}
                </div>
                <div id="tagMenu" class="tag-menu">
                    <button data-tag="important">Mark as Important</button>
                    <button data-tag="question">Add Question</button>
                    <button data-tag="definition">Mark as Definition</button>
                </div>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        const tagMenu = document.getElementById('tagMenu');
                        let currentSelection = null;

                        // Handle text selection
                        document.addEventListener('mouseup', function(e) {
                            const selection = window.getSelection();
                            if (selection.toString().length > 0) {
                                currentSelection = selection;
                                
                                // Position the tag menu near the selection
                                const range = selection.getRangeAt(0);
                                const rect = range.getBoundingClientRect();
                                tagMenu.style.display = 'block';
                                tagMenu.style.left = rect.left + window.scrollX + 'px';
                                tagMenu.style.top = rect.bottom + window.scrollY + 'px';
                            }
                        });

                        // Hide menu when clicking outside
                        document.addEventListener('mousedown', function(e) {
                            if (!tagMenu.contains(e.target)) {
                                tagMenu.style.display = 'none';
                            }
                        });

                        // Handle tag button clicks
                        tagMenu.querySelectorAll('button').forEach(button => {
                            button.addEventListener('click', function() {
                                if (currentSelection) {
                                    const tag = this.getAttribute('data-tag');
                                    const range = currentSelection.getRangeAt(0);
                                    
                                    // Create wrapper for tagged text
                                    const wrapper = document.createElement('span');
                                    wrapper.className = 'tagged-text';
                                    wrapper.setAttribute('data-tag', tag);
                                    
                                    // Add label
                                    const label = document.createElement('span');
                                    label.className = 'tag-label';
                                    label.textContent = tag;
                                    wrapper.appendChild(label);
                                    
                                    // Wrap selected text
                                    range.surroundContents(wrapper);
                                    
                                    // Clean up
                                    currentSelection = null;
                                    tagMenu.style.display = 'none';
                                }
                            });
                        });
                    });
                </script>
            </body>
            </html>
        `;
        
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

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Directory structure:
// markdown-server/
// ├── app.js
// ├── package.json
// ├── content/
// │   ├── example.md
// │   └── other-markdown-files.md
// └── public/
//     ├── images/
//     └── styles/
//
