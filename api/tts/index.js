// GET /api/tts — whether the site's natural voice is set up (Azure keys present).
import { createTts } from '../../server/tts.js';

export default function handler(req, res) {
  const tts = createTts();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ available: tts.available, voice: tts.available ? tts.voice : null });
}
