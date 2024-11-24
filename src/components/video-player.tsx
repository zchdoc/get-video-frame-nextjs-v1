"use client";

import { useRef, useState, useCallback } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  onFrameCapture?: (frameInfo: {
    dataUrl: string;
    timestamp: number;
    frameNumber: number;
  }) => void;
}

export function VideoPlayer({ onFrameCapture }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // 确保视频已加载
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg");
      onFrameCapture?.({
        dataUrl,
        timestamp: video.currentTime,
        frameNumber: Math.floor(video.currentTime * video.videoHeight)
      });
    }
  }, [onFrameCapture]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setFileName(file.name);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
        {videoUrl ? (
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="w-full h-full">
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  controls
                  src={videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={captureFrame}>
                Capture Current Frame
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No video selected</p>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('video-upload')?.click()}
              >
                Choose MP4 Video
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <input
          id="video-upload"
          type="file"
          accept="video/mp4"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button 
          variant="outline"
          onClick={() => document.getElementById('video-upload')?.click()}
        >
          Choose Another Video
        </Button>
        {fileName && (
          <span className="text-sm text-gray-500">
            Selected: {fileName}
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}