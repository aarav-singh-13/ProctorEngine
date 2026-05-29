import { useEffect } from 'react';
import { useWebcam } from '../hooks/useWebcam.js';

export default function FaceCapture({ onCapture, loading }) {
  const { videoRef, ready, error, start, stop, captureFrame } = useWebcam();

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  async function handleCapture() {
    const blob = await captureFrame();
    onCapture(blob);
  }

  return (
    <div>
      <p>Position your face in the frame. We will match it against your registered photo.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="webcam-box">
        <video ref={videoRef} muted playsInline />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleCapture}
        disabled={!ready || loading}
      >
        {loading ? 'Verifying…' : 'Capture & verify face'}
      </button>
    </div>
  );
}
