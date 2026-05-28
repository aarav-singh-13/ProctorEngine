import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env.js';

const LUXAND_BASE = 'https://api.luxand.cloud';

export async function verifyFaceMatch({ luxandPersonUuid, imageBuffer }) {
  if (env.faceProvider === 'mock') {
    if (!imageBuffer?.length) {
      return { matched: false, score: 0, message: 'No image provided' };
    }
    return { matched: true, score: 1, message: 'Mock verification (dev only)' };
  }

  if (env.faceProvider !== 'luxand') {
    throw new Error(`Unsupported FACE_PROVIDER: ${env.faceProvider}`);
  }

  if (!env.luxandApiToken) {
    throw new Error(
      'LUXAND_API_TOKEN is required when FACE_PROVIDER=luxand. Get a free key at https://luxand.cloud/'
    );
  }

  if (!luxandPersonUuid) {
    return {
      matched: false,
      score: 0,
      message: 'Student has no enrolled face profile. Run enrollment first.',
    };
  }

  const form = new FormData();
  form.append('photo', imageBuffer, {
    filename: 'capture.jpg',
    contentType: 'image/jpeg',
  });
  form.append('threshold', String(env.luxandMatchThreshold));

  const { data } = await axios.post(
    `${LUXAND_BASE}/photo/verify/${luxandPersonUuid}`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        token: env.luxandApiToken,
      },
      timeout: 30000,
    }
  );

  const score = data?.score ?? data?.similarity ?? (data?.status === 'success' ? 1 : 0);
  const matched =
    data?.status === 'success' ||
    data?.verified === true ||
    (typeof score === 'number' && score >= env.luxandMatchThreshold);

  return {
    matched: Boolean(matched),
    score: typeof score === 'number' ? score : matched ? 1 : 0,
    message: matched ? 'Face matched' : 'Face did not match',
    raw: data,
  };
}

/**
 * Enroll a student reference photo with Luxand (run once per student during setup).
 */
export async function enrollStudentFace({ name, imageBuffer }) {
  if (env.faceProvider === 'mock') {
    return { personUuid: `mock-${name}`, message: 'Mock enrollment' };
  }

  if (!env.luxandApiToken) {
    throw new Error('LUXAND_API_TOKEN is required for enrollment');
  }

  const form = new FormData();
  form.append('name', name);
  form.append('photos', imageBuffer, {
    filename: 'reference.jpg',
    contentType: 'image/jpeg',
  });

  const { data } = await axios.post(`${LUXAND_BASE}/person`, form, {
    headers: {
      ...form.getHeaders(),
      token: env.luxandApiToken,
    },
    timeout: 30000,
  });

  const personUuid = data?.uuid || data?.id;
  if (!personUuid) {
    throw new Error('Luxand enrollment did not return a person UUID');
  }

  return { personUuid, raw: data };
}
