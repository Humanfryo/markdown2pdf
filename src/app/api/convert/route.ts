import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import hljs from 'highlight.js';
import { markedHighlight } from 'marked-highlight';

// Basic CSS to mimic GitHub Markdown style
const githubMarkdownCSS = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  padding: 25px; /* Slightly reduced body padding */
  line-height: 1.6;
  color: #24292f;
  font-size: 11pt; /* Slightly larger base font */
}
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  /* border-bottom: 1px solid #eaecef; */ /* Removed header border */
  padding-bottom: 0.3em;
}
h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }
code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27,31,35,0.05);
  border-radius: 3px;
}
pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
}
pre code {
  display: inline;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}
blockquote {
  margin: 0 0 16px 0;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}
ul, ol {
  padding-left: 2em;
  margin-bottom: 16px;
}
table {
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}
td, th {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}
img {
  max-width: 100%;
}
`;

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json();

    if (typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Invalid markdown input' }, { status: 400 });
    }

    // Configure marked to use GitHub Flavored Markdown (GFM)
    marked.use({ gfm: true });
    marked.use(markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    }));

    // Configure marked options (Ensure smartLists is removed or corrected)
    marked.setOptions({
      renderer: new marked.Renderer(),
      // highlight: function(code, lang) {
      //   const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      //   return hljs.highlight(code, { language }).value;
      // },
      // langPrefix: 'hljs language-', // Deprecated: Use marked-highlight
      gfm: true,
      breaks: false, // Add <br> on single line breaks
      pedantic: false,
      // smartLists: true, // Removed: Invalid option causing type error
      // smartypants: false, // Removed: Also seems invalid for MarkedOptions
    });

    // Convert Markdown to HTML
    const htmlContent = marked.parse(markdown);

    // Wrap HTML with basic structure and CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Generated PDF</title>
        <style>${githubMarkdownCSS}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    // Launch Puppeteer
    const browser = await puppeteer.launch({
       headless: true, // Use the new headless mode
       args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necessary for some environments
    });
    const page = await browser.newPage();

    // Set content and generate PDF
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await browser.close();

    // Return PDF as a blob
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=output.pdf', // Suggest filename for download
      },
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 