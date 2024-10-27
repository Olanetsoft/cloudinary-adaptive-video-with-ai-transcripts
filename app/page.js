// import Image from "next/image";
"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Upload, Subtitles } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const videoRef = useRef(null);

  const POLLING_INTERVAL = 10000; // 10 seconds

  // Add these states to your component
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [bandwidth, setBandwidth] = useState(null);
  const [isThrottled, setIsThrottled] = useState(false);

  // Add this function for bandwidth simulation
  const simulateThrottling = () => {
    setIsThrottled(!isThrottled);
    if (videoRef.current) {
      if (!isThrottled) {
        // Simulate low bandwidth
        setCurrentQuality("360p");
        toast.info("Simulating low bandwidth connection");
      } else {
        // Restore normal bandwidth
        setCurrentQuality("auto");
        toast.info("Restored normal bandwidth");
      }
    }
  };

  // Add quality control component
  const QualityControl = () => (
    <select
      value={currentQuality}
      onChange={(e) => setCurrentQuality(e.target.value)}
      className="bg-black/70 text-white px-3 py-1 rounded-md text-sm backdrop-blur-sm"
    >
      <option value="auto">Auto</option>
      <option value="1080p">1080p</option>
      <option value="720p">720p</option>
      <option value="480p">480p</option>
      <option value="360p">360p</option>
    </select>
  );

  // Add bandwidth monitoring
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let lastLoadedBytes = 0;
    let lastLoadedTime = Date.now();

    const updateBandwidth = () => {
      const loadedBytes = video.buffered.length
        ? video.buffered.end(video.buffered.length - 1) * 1024 * 1024
        : 0;
      const currentTime = Date.now();
      const timeDiff = (currentTime - lastLoadedTime) / 1000;
      const bytesDiff = loadedBytes - lastLoadedBytes;

      if (timeDiff > 0) {
        const bandwidthMbps = bytesDiff / timeDiff / (1024 * 1024);
        setBandwidth(bandwidthMbps);
      }

      lastLoadedBytes = loadedBytes;
      lastLoadedTime = currentTime;
    };

    const intervalId = setInterval(updateBandwidth, 1000);
    return () => clearInterval(intervalId);
  }, [videoRef.current]);

  const checkTranscriptionStatus = async (url) => {
    if (!url) {
      console.error("No URL provided for transcript check");
      setError("Failed to get transcript URL");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/transcript?url=${encodeURIComponent(url)}`
      );

      const data = await response.json();

      // If we have transcript data, use it
      if (data.available && data.transcript) {
        setTranscript(data.transcript);
        setTranscriptSegments(data.segments);
        setIsLoading(false);
        return;
      }

      // If still processing, continue polling
      const currentRetries = parseInt(
        sessionStorage.getItem("transcriptRetries") || "0"
      );

      // Increase max retries for longer videos
      if (currentRetries > 120) {
        // 20 minutes max (120 * 10 seconds)
        setError("Transcript generation timed out. Please try again.");
        setIsLoading(false);
        sessionStorage.removeItem("transcriptRetries");
        return;
      }

      console.log(
        `Attempt ${currentRetries + 1}: ${
          data.message || "Still processing..."
        }`
      );
      sessionStorage.setItem(
        "transcriptRetries",
        (currentRetries + 1).toString()
      );

      // Continue polling
      setTimeout(() => checkTranscriptionStatus(url), POLLING_INTERVAL);
    } catch (error) {
      console.error("Error checking transcript:", error);
      setError("Failed to fetch transcript");
      setIsLoading(false);
    }
  };
  useEffect(() => {
    return () => {
      sessionStorage.removeItem("transcriptRetries");
    };
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError("");
    setTranscript(""); // Clear any existing transcript
    setTranscriptSegments([]); // Clear any existing segments
    sessionStorage.removeItem("transcriptRetries");

    const formData = new FormData();
    formData.append("video_file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      if (!data.transcriptFiles?.json) {
        throw new Error("No transcript URL in response");
      }

      setVideoUrl(data.videoUrl);

      // Start polling with debug log
      console.log(
        "Starting transcript polling with URL:",
        data.transcriptFiles.json
      );
      checkTranscriptionStatus(data.transcriptFiles.json);

      // Add VTT subtitles track if available
      if (videoRef.current && data.transcriptFiles.vtt) {
        const track = document.createElement("track");
        track.kind = "subtitles";
        track.label = "English";
        track.srclang = "en";
        track.src = data.transcriptFiles.vtt;
        track.default = true;
        videoRef.current.appendChild(track);
      }
    } catch (err) {
      setError(err.message || "Failed to upload video");
      setIsLoading(false);
    }
  };

  const toggleSubtitles = () => {
    setShowSubtitles(!showSubtitles);
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = showSubtitles ? "hidden" : "showing";
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Cloudinary Adaptive Video Player
          </h1>
          <p className="text-gray-400 mt-2">
            Upload your video for AI-powered transcription and adaptive
            streaming
          </p>
        </header>

        {error && toast.error(error)}

        <div className="space-y-6">
          {!videoUrl ? (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <label className="cursor-pointer group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="space-y-4">
                  {isLoading ? (
                    <Loader2 className="w-12 h-12 mx-auto text-blue-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto text-gray-500 group-hover:text-blue-400 transition-colors" />
                      <p className="text-gray-400 group-hover:text-gray-300">
                        Click to upload or drag and drop video
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          ) : (
            <>
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full aspect-video"
                  controls
                  crossOrigin="anonymous"
                  src={videoUrl}
                />
              </div>

              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={simulateThrottling}
                  className={`px-3 py-1 rounded-md text-sm backdrop-blur-sm flex items-center gap-2 ${
                    isThrottled ? "bg-red-500/70" : "bg-black/70"
                  }`}
                >
                  {isThrottled ? "Throttled" : "Normal"} Bandwidth
                </button>
                <QualityControl />
                <button
                  onClick={toggleSubtitles}
                  className="bg-black/70 text-white px-3 py-1 rounded-md text-sm backdrop-blur-sm flex items-center gap-2"
                >
                  <Subtitles className="w-4 h-4" />
                  {showSubtitles ? "Hide" : "Show"} Subtitles
                </button>
              </div>

              {/* Add bandwidth info */}
              {videoUrl && (
                <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2">Network Stats</h3>
                  <div className="text-sm text-gray-400">
                    <p>Current Quality: {currentQuality}</p>
                    <p>
                      Bandwidth:{" "}
                      {bandwidth
                        ? `${bandwidth.toFixed(2)} Mbps`
                        : "Measuring..."}
                    </p>
                    <p>Connection: {isThrottled ? "Throttled" : "Normal"}</p>
                  </div>
                </div>
              )}
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Subtitles className="w-5 h-5" />
                  Transcript
                </h2>
                <div className="max-h-[400px] overflow-y-auto pr-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                  ) : transcript ? (
                    <div className="space-y-3">
                      {transcriptSegments.map((segment, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700/50"
                        >
                          <p className="text-gray-300">{segment.text}</p>
                          <span className="text-xs text-gray-500 mt-2 inline-block px-2 py-1 rounded-full bg-gray-700/50">
                            {Math.floor(segment.startTime)}s -{" "}
                            {Math.floor(segment.endTime)}s
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-center">
                      Processing transcript...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
        />
      </div>
    </div>
  );
}
