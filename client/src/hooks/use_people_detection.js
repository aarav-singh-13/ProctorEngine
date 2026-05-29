import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * People detection hook.
 * Uses browser's Shape Detection API (FaceDetector) where available,
 * with a canvas pixel-based fallback for unsupported browsers.
 * Counts 0, 1, or 2+ faces.
 */
export function usePeopleDetection(videoRef, interval = 2000) {
  const [peopleCount, setPeopleCount] = useState(1); // Default to 1 (assume student present)
  const [detectionTick, setDetectionTick] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const intervalRef = useRef(null);
  const faceDetectorRef = useRef(null);

  // Try to create browser's FaceDetector API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      } catch (e) {
        console.warn('FaceDetector API not available, using canvas fallback');
        faceDetectorRef.current = null;
      }
    }
  }, []);

  const detectWithFaceAPI = useCallback(async (video) => {
    if (faceDetectorRef.current) {
      try {
        const faces = await faceDetectorRef.current.detect(video);
        return faces.length;
      } catch {
        return -1; // Signal fallback needed
      }
    }
    return -1;
  }, []);

  const detectWithCanvas = useCallback((video) => {
    // Fallback: skin tone pixel analysis (rough heuristic)
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let skinPixels = 0;
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 95 && g > 40 && b > 20 && r > b && r > g && Math.abs(r - g) > 15) {
        skinPixels++;
      }
    }

    const totalSampled = (canvas.width * canvas.height) / 4;
    const skinRatio = skinPixels / totalSampled;

    if (skinRatio > 0.12) return 2;
    if (skinRatio > 0.02) return 1;
    return 0;
  }, []);

  const runDetection = useCallback(async () => {
    const video = videoRef?.current;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;

    let count = await detectWithFaceAPI(video);
    if (count === -1) {
      count = detectWithCanvas(video);
    }

    setPeopleCount(count);
    setDetectionTick((t) => t + 1);
  }, [videoRef, detectWithFaceAPI, detectWithCanvas]);

  const startDetection = useCallback(() => {
    if (intervalRef.current) return; // Already running
    setIsDetecting(true);
    runDetection(); // Run immediately
    intervalRef.current = setInterval(runDetection, interval);
  }, [runDetection, interval]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { peopleCount, detectionTick, isDetecting, startDetection, stopDetection };
}
