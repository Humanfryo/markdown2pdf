'use client'; // Required for useState and event handlers

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [markdown, setMarkdown] = useState('# Hello, Markdown!\n\nThis is a sample text.\n\n- List item 1\n- List item 2\n\n```javascript\nconsole.log("Hello World!");\n```'); // Added default markdown for testing
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setDownloadUrl(null); // Clear previous download link on new file drop
    const file = acceptedFiles[0];
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        setMarkdown(fileContent);
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
      };
      reader.readAsText(file);
    } else if (file) {
      setError('Please drop a valid .md file.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/markdown': ['.md'] },
    noClick: true,
    multiple: false,
  });

  const handleClear = () => {
    setMarkdown('');
    setDownloadUrl(null);
    setError(null);
  };

  const handleConvert = async () => {
    setIsLoading(true);
    setError(null);
    setDownloadUrl(null);

    // Clean up previous blob URL if it exists
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

    } catch (err) {
      console.error('Conversion failed:', err);
      let errorMessage = 'An unknown error occurred during conversion.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to clean up blob URL on unmount
  // useEffect(() => {
  //   return () => {
  //     if (downloadUrl) {
  //       URL.revokeObjectURL(downloadUrl);
  //     }
  //   };
  // }, [downloadUrl]); // Runs when downloadUrl changes or component unmounts
  // Commented out for now as it might cause issues with Next.js fast refresh

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-gray-800 dark:text-gray-100">Markdown to PDF</h1>

      <div
        {...getRootProps()}
        className={`w-full max-w-4xl bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 md:p-6 border-2 ${isDragActive ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50' : 'border-transparent dark:border-gray-700'} transition-colors duration-200 ease-in-out`}
      >
        <input {...getInputProps()} />

        <div className="flex justify-end mb-3 md:mb-4">
          <button
            onClick={handleClear}
            className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none disabled:opacity-50"
            title="Clear editor"
            disabled={isLoading}
          >
            Clear
          </button>
        </div>

        <textarea
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setDownloadUrl(null);
            setError(null);
          }}
          placeholder={isDragActive ? "Drop the .md file here..." : "Paste your Markdown here... or drag and drop a .md file"}
          className={`w-full h-80 md:h-96 p-3 md:p-4 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs md:text-sm ${isDragActive ? 'border-dashed border-blue-500 bg-blue-100 dark:bg-blue-900/50' : 'border-gray-300 dark:border-gray-600'} transition-colors duration-200 ease-in-out disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500`}
          readOnly={isDragActive}
          disabled={isLoading}
        />

        <div className="mt-5 md:mt-6 flex flex-col items-center space-y-3 md:space-y-4">
          <button
            onClick={handleConvert}
            className={`px-5 py-2.5 md:px-6 md:py-3 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out w-full sm:w-auto ${isLoading ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-gray-800'} disabled:opacity-70 disabled:cursor-not-allowed`}
            disabled={isLoading || !markdown.trim()}
          >
            {isLoading ? 'Converting...' : 'Convert to PDF'}
          </button>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm text-center px-2">Error: {error}</p>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              download="output.pdf"
              className="px-5 py-2.5 md:px-6 md:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition duration-150 ease-in-out w-full sm:w-auto text-center"
              // onClick={() => setTimeout(() => URL.revokeObjectURL(downloadUrl), 100)} // Optional: Clean up URL after click
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
       <footer className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
         Built with Next.js, Tailwind CSS, Marked, and Puppeteer.
      </footer>
    </main>
  );
}
