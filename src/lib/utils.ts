import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeToSeconds(time: { hours: number; minutes: number; seconds: number }): number {
  return time.hours * 3600 + time.minutes * 60 + time.seconds;
}

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

// 扩展 HTMLVideoElement 类型以包含 requestVideoFrameCallback
declare global {
  interface HTMLVideoElement {
    requestVideoFrameCallback(callback: VideoFrameRequestCallback): number;
    cancelVideoFrameCallback(handle: number): void;
  }
}

interface VideoFrameMetadata {
  presentationTime: number;
  expectedDisplayTime: number;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
  processingDuration: number;
}

type VideoFrameRequestCallback = (now: number, metadata: VideoFrameMetadata) => void;

// 原有的基于时间间隔的帧提取方法
export async function extractFrames(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  startTime: number,
  endTime: number,
  options: {
    maxFrames?: number;
    quality?: number;
    frameInterval?: number;
  } = {}
): Promise<FrameInfo[]> {
  return new Promise((resolve) => {
    const frames: FrameInfo[] = [];
    const context = canvas.getContext("2d")!;
    if (!context) return resolve([]);

    const {
      maxFrames = 100,
      quality = 0.92,
      frameInterval = 100,
    } = options;

    const duration = endTime - startTime;
    const totalFrames = Math.min(Math.floor(duration * 1000 / frameInterval), maxFrames);
    
    let currentFrame = 0;
    video.currentTime = startTime;

    video.addEventListener("seeked", function onSeeked() {
      if (currentFrame >= totalFrames) {
        video.removeEventListener("seeked", onSeeked);
        resolve(frames);
        return;
      }

      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const timestamp = startTime + (currentFrame * frameInterval / 1000);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        frames.push({
          dataUrl,
          timestamp,
          frameNumber: currentFrame + 1
        });

        currentFrame++;
        video.currentTime = startTime + (currentFrame * frameInterval / 1000);
      }
    });
  });
}

// 新增：基于实际视频帧的提取方法
export async function extractActualFrames(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  startTime: number,
  endTime: number,
  options: {
    maxFrames?: number;
    quality?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<FrameInfo[]> {
  return new Promise((resolve) => {
    const frames: FrameInfo[] = [];
    const context = canvas.getContext("2d")!;
    if (!context) return resolve([]);

    const {
      maxFrames = 100,
      quality = 0.92,
      onProgress
    } = options;

    let frameCount = 0;

    function processFrame(now: number, metadata: VideoFrameMetadata) {
      if (metadata.mediaTime < startTime) {
        video.requestVideoFrameCallback(processFrame);
        return;
      }

      if (metadata.mediaTime > endTime || frameCount >= maxFrames) {
        video.pause();
        resolve(frames);
        return;
      }

      canvas.width = metadata.width;
      canvas.height = metadata.height;
      
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);

      frames.push({
        dataUrl,
        timestamp: metadata.mediaTime,
        frameNumber: metadata.presentedFrames,
        metadata: { ...metadata }
      });

      frameCount++;
      
      // 计算并报告进度
      const progress = Math.min(
        ((metadata.mediaTime - startTime) / (endTime - startTime)) * 100,
        100
      );
      onProgress?.(progress);

      if (metadata.mediaTime <= endTime && frameCount < maxFrames) {
        video.requestVideoFrameCallback(processFrame);
      } else {
        video.pause();
        resolve(frames);
      }
    }

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      video.currentTime = startTime;
      video.play();
      video.requestVideoFrameCallback(processFrame);
    } else {
      console.warn('requestVideoFrameCallback not supported, falling back to time-based extraction');
      // 如果不支持，返回空数组
      resolve([]);
    }
  });
}

// 新增：分析视频总帧数的方法
export async function analyzeVideoFrames(
  video: HTMLVideoElement,
  onProgress?: (progress: number) => void
): Promise<{ totalFrames: number; duration: number; fps: number }> {
  return new Promise((resolve, reject) => {
    if (!video.duration) {
      reject(new Error('No video loaded or video duration is invalid'));
      return;
    }

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      let frameCount = 0;
      let startTime: number | null = null;
      let lastTime: number | null = null;

      const countFrame = (now: number, metadata: VideoFrameMetadata) => {
        try {
          if (!startTime) {
            startTime = metadata.mediaTime;
          }
          lastTime = metadata.mediaTime;
          frameCount++;

          // 计算进度
          const progress = Math.min((metadata.mediaTime / video.duration) * 100, 100);
          onProgress?.(progress);

          if (metadata.mediaTime < video.duration) {
            video.requestVideoFrameCallback(countFrame);
          } else {
            video.pause();
            video.currentTime = 0;
            const duration = lastTime - (startTime || 0);
            const fps = frameCount / duration;
            resolve({
              totalFrames: frameCount,
              duration,
              fps
            });
          }
        } catch (error) {
          video.pause();
          video.currentTime = 0;
          reject(error);
        }
      };

      try {
        video.currentTime = 0;
        video.play().catch(reject);
        video.requestVideoFrameCallback(countFrame);
      } catch (error) {
        reject(error);
      }
    } else {
      try {
        // 如果不支持 requestVideoFrameCallback，使用估算方法
        const duration = video.duration;
        const fps = 30; // 假设默认帧率为 30fps
        resolve({
          totalFrames: Math.round(duration * fps),
          duration,
          fps
        });
      } catch (error) {
        reject(error);
      }
    }
  });
}
