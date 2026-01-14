import { useState } from 'react';
import type { UploadResponse } from '../types';

interface FileUploadProps {
  onLoaded: (data: UploadResponse) => void;
}

export default function FileUpload({ onLoaded }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process file');
      }

      const data = await response.json();
      onLoaded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white" style={{ backgroundColor: '#000000' }}>
      <div className="text-center max-w-md px-8">
        <h1 className="text-4xl font-bold mb-4 text-white">Speed Reader</h1>
        <p className="text-gray-300 mb-8">
          Upload a PDF, EPUB, or text file to start speed reading
        </p>

        <div className="relative">
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.epub,.txt"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className={`inline-block px-6 py-3 bg-white text-black rounded cursor-pointer hover:bg-gray-200 transition-colors ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? 'Processing...' : 'Choose File'}
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 text-sm text-gray-400">
          <p>Supported formats: PDF, EPUB, TXT</p>
        </div>
      </div>
    </div>
  );
}

