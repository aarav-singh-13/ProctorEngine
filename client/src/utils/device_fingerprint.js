const STORAGE_KEY = 'exam_device_fingerprint';

export function getDeviceFingerprint() {
  let fp = localStorage.getItem(STORAGE_KEY);
  if (!fp) {
    fp = `dev-${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, fp);
  }
  return fp;
}
