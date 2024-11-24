"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video-player";
import { TimeInput } from "@/components/time-input";
import { extractFrames, extractActualFrames, timeToSeconds, analyzeVideoFrames } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';

interface FrameInfo {
  dataUrl: string;
  timestamp: number;
  frameNumber: number;
  metadata?: {
    presentationTime: number;
    expectedDisplayTime: number;
    width: number;
    height: number;
    mediaTime: number;
    presentedFrames: number;
    processingDuration: number;
  };
}

export default function Home() {
  const [extractedFrames, setExtractedFrames] = useState<FrameInfo[]>([]);
  const [actualFrames, setActualFrames] = useState<FrameInfo[]>([]);
  const [capturedFrames, setCapturedFrames] = useState<FrameInfo[]>([]);
  const [startTime, setStartTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [endTime, setEndTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [frameInterval, setFrameInterval] = useState(100);
  const [quality, setQuality] = useState(92);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState<{
    totalFrames: number;
    duration: number;
    fps: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleExtractFrames = async () => {
    const video = document.querySelector("video");
    const canvas = document.querySelector("canvas");
    
    if (!video || !canvas) return;
  
    const startTimeInSeconds = timeToSeconds(startTime);
    const endTimeInSeconds = timeToSeconds(endTime);
  
    if (endTimeInSeconds <= startTimeInSeconds) {
      alert("End time must be greater than start time");
      return;
    }
  
    const frames = await extractFrames(
      video,
      canvas,
      startTimeInSeconds,
      endTimeInSeconds,
      {
        frameInterval,
        quality: quality / 100,
        maxFrames: 100
      }
    );
    
    setExtractedFrames(frames);
  };

  const handleExtractActualFrames = async () => {
    const video = document.querySelector("video");
    const canvas = document.querySelector("canvas");
    
    if (!video || !canvas) return;
  
    const startTimeInSeconds = timeToSeconds(startTime);
    const endTimeInSeconds = timeToSeconds(endTime);
  
    if (endTimeInSeconds <= startTimeInSeconds) {
      alert("End time must be greater than start time");
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
  
    const frames = await extractActualFrames(
      video,
      canvas,
      startTimeInSeconds,
      endTimeInSeconds,
      {
        quality: quality / 100,
        maxFrames: 100,
        onProgress: setExtractionProgress
      }
    );
    
    setActualFrames(frames);
    setIsExtracting(false);
  };

  const handleFrameCapture = (frameInfo: FrameInfo) => {
    setCapturedFrames(prev => [...prev, frameInfo]);
  };

  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    const milliseconds = Math.floor((timestamp % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const handleAnalyzeVideo = async () => {
    const video = document.querySelector("video");
    if (!video) {
      setAnalysisError("No video element found");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisError(null);
    setVideoAnalysis(null);

    try {
      const analysis = await analyzeVideoFrames(video, setAnalysisProgress);
      setVideoAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing video:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Video Frame Extractor</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <VideoPlayer onFrameCapture={handleFrameCapture} />
        </div>

        <Tabs defaultValue="interval" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interval">Time Interval Extraction</TabsTrigger>
            <TabsTrigger value="actual">Actual Frames Extraction</TabsTrigger>
            <TabsTrigger value="analysis">Video Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="interval">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium">Time Interval Extraction</h3>
                  {extractedFrames.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Extracted {extractedFrames.length} frames
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Time</label>
                    <TimeInput value={startTime} onChange={setStartTime} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Time</label>
                    <TimeInput value={endTime} onChange={setEndTime} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Frame Interval: {frameInterval}ms
                    </label>
                    <Slider
                      value={[frameInterval]}
                      onValueChange={([value]) => setFrameInterval(value)}
                      min={33}
                      max={1000}
                      step={33}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quality: {quality}%
                    </label>
                    <Slider
                      value={[quality]}
                      onValueChange={([value]) => setQuality(value)}
                      min={1}
                      max={100}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button onClick={handleExtractFrames} className="w-full">
                  Extract Frames by Interval
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="actual">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium">Actual Frames Extraction</h3>
                  {actualFrames.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Extracted {actualFrames.length} frames
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Time</label>
                    <TimeInput value={startTime} onChange={setStartTime} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Time</label>
                    <TimeInput value={endTime} onChange={setEndTime} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quality: {quality}%
                  </label>
                  <Slider
                    value={[quality]}
                    onValueChange={([value]) => setQuality(value)}
                    min={1}
                    max={100}
                    className="w-full"
                  />
                </div>

                {isExtracting && (
                  <div className="space-y-2">
                    <Progress value={extractionProgress} />
                    <p className="text-sm text-gray-500 text-center">
                      Extracting frames: {Math.round(extractionProgress)}%
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleExtractActualFrames} 
                  className="w-full"
                  disabled={isExtracting}
                >
                  {isExtracting ? "Extracting..." : "Extract Actual Frames"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium">Video Frame Analysis</h3>
                  <p className="text-sm text-gray-500">
                    Analyze the total number of frames in the video
                  </p>
                </div>

                {isAnalyzing && (
                  <div className="space-y-2">
                    <Progress value={analysisProgress} />
                    <p className="text-sm text-gray-500 text-center">
                      Analyzing video: {Math.round(analysisProgress)}%
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleAnalyzeVideo} 
                  className="w-full"
                  disabled={isAnalyzing}
                >
                  Analyze Video
                </Button>

                {analysisError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                    Error: {analysisError}
                  </div>
                )}

                {videoAnalysis && (
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Total Frames:</span> {videoAnalysis.totalFrames}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Duration:</span> {videoAnalysis.duration.toFixed(2)} seconds
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Frame Rate:</span> {videoAnalysis.fps.toFixed(2)} fps
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {(extractedFrames.length > 0 || actualFrames.length > 0 || capturedFrames.length > 0) && (
          <div className="space-y-6">
            {capturedFrames.length > 0 && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Captured Frames</h2>
                    <p className="text-sm text-gray-500">
                      Total: {capturedFrames.length} frames
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setCapturedFrames([])}
                  >
                    Clear Captured Frames
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {capturedFrames.map((frame, index) => (
                    <Card key={`captured-${index}`} className="overflow-hidden">
                      <Image 
                        src={frame.dataUrl} 
                        alt={`Captured Frame ${index + 1}`} 
                        width={300}  
                        height={200} 
                        className="w-full h-auto"
                        unoptimized
                      />
                      <div className="p-2 text-sm text-gray-500">
                        Time: {formatTimestamp(frame.timestamp)}
                        <br />
                        Frame: #{frame.frameNumber}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            )}

            {extractedFrames.length > 0 && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Interval Extracted Frames</h2>
                    <p className="text-sm text-gray-500">
                      Total: {extractedFrames.length} frames
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setExtractedFrames([])}
                  >
                    Clear Extracted Frames
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {extractedFrames.map((frame, index) => (
                    <Card key={`extracted-${index}`} className="overflow-hidden">
                      <Image 
                        src={frame.dataUrl} 
                        alt={`Extracted Frame ${index + 1}`} 
                        width={300}  
                        height={200} 
                        className="w-full h-auto" 
                        priority={false}
                      />
                      <div className="p-2 text-sm text-gray-500">
                        Time: {formatTimestamp(frame.timestamp)}
                        <br />
                        Frame: #{frame.frameNumber}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            )}

            {actualFrames.length > 0 && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Actual Video Frames</h2>
                    <p className="text-sm text-gray-500">
                      Total: {actualFrames.length} frames
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActualFrames([])}
                  >
                    Clear Actual Frames
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {actualFrames.map((frame, index) => (
                    <Card key={`actual-${index}`} className="overflow-hidden">
                      <Image 
                        src={frame.dataUrl} 
                        alt={`Actual Frame ${index + 1}`} 
                        width={300}  
                        height={200} 
                        className="w-full h-auto"
                        priority={index < 4}  
                      />
                      <div className="p-2 text-sm text-gray-500">
                        Time: {formatTimestamp(frame.timestamp)}
                        <br />
                        Frame: #{frame.frameNumber}
                        {frame.metadata && (
                          <>
                            <br />
                            Processing Time: {Math.round(frame.metadata.processingDuration)}ms
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
