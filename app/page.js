// app/page.js

"use client";

import { Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Adaptive Video Player
          </h1>
          <p className="text-gray-400 mt-2">
            Upload your video for adaptive streaming with automatic subtitles
          </p>
        </header>

        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
          <label className="cursor-pointer group">
            <input type="file" accept="video/*" className="hidden" disabled />
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-gray-500 group-hover:text-blue-400 transition-colors" />
              <p className="text-gray-400 group-hover:text-gray-300">
                Click to upload or drag and drop video
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
