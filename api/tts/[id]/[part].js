// GET /api/tts/:id/:part?h=… — the recording (mp3) of one part of one page.
// The CDN keeps each recording; h changes when the text changes, so a stale one is never served.
import { createTts } from '../../../server/tts.js';
import { textFor } from '../../../server/text.js';

const tts = createTts();

export default async function handler(req, res) {
  if (!tts.available) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ error: 'No natural voice is set up; the device voice is used instead.' });
    return;
  }
  const { id, part, h } = req.query;
  const text = textFor(String(id), String(part));
  if (!text) {
    res.status(404).json({ error: 'Nothing to read for this page and part.' });
    return;
  }
  let audio;
  try {
    audio = await tts.synthesize(text);
  } catch (err) {
    console.warn('[tts] synthesis failed:', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'The voice service did not answer; the device voice is used instead.' });
    return;
  }
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', h ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=3600, s-maxage=86400');
  // Safari asks for byte ranges before it plays audio
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const size = audio.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.setHeader('Content-Range', `bytes */${size}`);
      res.status(416).end();
      return;
    }
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(end - start + 1));
    res.status(206).end(audio.subarray(start, end + 1));
    return;
  }
  res.setHeader('Content-Length', String(audio.length));
  res.status(200).end(audio);
}
