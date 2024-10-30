"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [vttUrl, setVttUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [isThrottled, setIsThrottled] = useState(false);
  const [bandwidth, setBandwidth] = useState(null);
  const videoRef = useRef(null);

  // Monitor bandwidth
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let lastLoadedBytes = 0;
    let lastLoadedTime = Date.now();

    const updateBandwidth = () => {
      if (!video.buffered.length) return;

      const loadedBytes =
        video.buffered.end(video.buffered.length - 1) * 1024 * 1024;
      const currentTime = Date.now();
      const timeDiff = (currentTime - lastLoadedTime) / 1000;
      const bytesDiff = loadedBytes - lastLoadedBytes;

      if (timeDiff > 0) {
        const bandwidthMbps = (bytesDiff / timeDiff / (1024 * 1024)).toFixed(2);
        setBandwidth(bandwidthMbps);
      }

      lastLoadedBytes = loadedBytes;
      lastLoadedTime = currentTime;
    };

    const intervalId = setInterval(updateBandwidth, 1000);
    return () => clearInterval(intervalId);
  }, [videoUrl]);

  const handleUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setVideoUrl("");
    setVttUrl("");

    const formData = new FormData();
    formData.append("video_file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      console.log(data.vttUrl);
      console.log(data.videoUrl);
      setVideoUrl(data.videoUrl);
      setVttUrl(data.vttUrl);

      toast.success("Video uploaded successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload video";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateThrottling = () => {
    setIsThrottled(!isThrottled);
    if (!isThrottled) {
      // Add quality transformation for throttled state
      const throttledUrl = videoUrl.replace("/upload/", "/upload/q_auto:low/");
      setCurrentQuality("360p");
      videoRef.current.src = throttledUrl;
    } else {
      setCurrentQuality("auto");
      videoRef.current.src = videoUrl;
    }
    toast.info(
      isThrottled ? "Restored normal bandwidth" : "Simulating low bandwidth"
    );
  };

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
          <div className="space-y-6">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full aspect-video"
                controls
                crossOrigin="anonymous"
                playsInline
                autoBuffer
                muted
              >
                <source src={videoUrl} type="video/mp4" />
                {vttUrl && (
                  <track
                    label="English"
                    kind="subtitles"
                    srcLang="en"
                    src={vttUrl}
                    default
                  />
                )}
              </video>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={simulateThrottling}
                className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  isThrottled ? "bg-red-500/70" : "bg-black/70"
                }`}
              >
                {isThrottled ? "Throttled" : "Normal"} Bandwidth
              </button>

              <select
                value={currentQuality}
                onChange={(e) => setCurrentQuality(e.target.value)}
                className="bg-black/70 text-white px-4 py-2 rounded-md text-sm"
              >
                <option value="auto">Auto Quality</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Playback Stats</h3>
              <div className="text-sm text-gray-400 space-y-2">
                <p>Current Quality: {currentQuality}</p>
                <p>Connection: {isThrottled ? "Throttled" : "Normal"}</p>
                <p>
                  Bandwidth: {bandwidth ? `${bandwidth} Mbps` : "Measuring..."}
                </p>
              </div>
            </div>
          </div>
        )}

        <ToastContainer theme="dark" />
      </div>
    </div>
  );
}
