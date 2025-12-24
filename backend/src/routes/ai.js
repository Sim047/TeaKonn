// backend/src/routes/ai.js
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Service from '../models/Service.js';
import Marketplace from '../models/Marketplace.js';

const router = express.Router();

// Simple semantic-ish search using regex over key fields
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.query || '').toString().trim();
    const sport = (req.query.sport || '').toString().trim();
    const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const sportRegex = sport ? new RegExp(sport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const eventQuery = { status: 'published' };
    if (regex) {
      eventQuery.$or = [
        { title: regex },
        { description: regex },
        { 'location.city': regex },
        { 'location.name': regex },
      ];
    }
    if (sportRegex) {
      // Events schema doesn't include explicit sport field in this version; match title/description
      eventQuery.$or = (eventQuery.$or || []).concat([{ title: sportRegex }, { description: sportRegex }]);
    }

    const serviceQuery = {};
    if (regex) {
      serviceQuery.$or = [
        { name: regex },
        { description: regex },
        { category: regex },
        { sport: regex },
      ];
    }
    if (sportRegex) {
      (serviceQuery.$or = serviceQuery.$or || []).push({ sport: sportRegex });
    }

    const userQuery = {};
    if (regex) {
      userQuery.$or = [
        { username: regex },
        { favoriteSports: regex },
      ];
    }
    if (sportRegex) {
      (userQuery.$or = userQuery.$or || []).push({ favoriteSports: sportRegex });
    }

    const marketplaceQuery = {};
    if (regex) {
      marketplaceQuery.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { tags: { $in: [regex] } },
      ];
    }

    // Fetch
    const [eventsRaw, servicesRaw, usersRaw, itemsRaw] = await Promise.all([
      Event.find(eventQuery).limit(20),
      Service.find(serviceQuery).limit(20),
      User.find(userQuery).select('username avatar favoriteSports').limit(20),
      Marketplace.find(marketplaceQuery).limit(20),
    ]);

    // Simple ranking by match strength and user favorites
    const favs = (req.query.favs || '').toString().split(',').filter(Boolean);
    const scoreText = (text = '') => {
      let s = 0;
      if (!regex) return s;
      if (text.match(regex)) s += 2;
      return s;
    };
    const scoreSport = (sportVal = '') => {
      let s = 0;
      if (sportRegex && sportVal.match(sportRegex)) s += 2;
      if (favs.length && favs.some((f) => (sportVal || '').toLowerCase().includes(f.toLowerCase()))) s += 1;
      return s;
    };

    const events = eventsRaw
      .map((e) => ({
        doc: e,
        score: scoreText(e.title) + scoreText(e.description) + scoreText(e?.location?.city) + scoreSport(e.title),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.doc);

    const services = servicesRaw
      .map((s) => ({
        doc: s,
        score: scoreText(s.name) + scoreText(s.description) + scoreSport(s.sport),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.doc);

    const users = usersRaw
      .map((u) => ({
        doc: u,
        score: scoreText(u.username) + (Array.isArray(u.favoriteSports) ? u.favoriteSports.reduce((acc, sp) => acc + scoreSport(sp), 0) : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.doc);

    const items = itemsRaw
      .map((it) => ({
        doc: it,
        score: scoreText(it.title) + scoreText(it.description) + scoreText(it.category),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.doc);

    res.json({ ok: true, events, services, users, items });
  } catch (e) {
    console.error('[AI SEARCH] error', e);
    res.status(500).json({ error: 'search_failed', details: e.message });
  }
});

// Chat assistant backed by OpenAI; falls back to local guidance if no API key
router.post('/assistant', auth, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'invalid_message' });
    }

    const userId = req.user?.id || req.user?._id;
    const me = userId ? await User.findById(userId).select('username favoriteSports') : null;

    const system = [
      'You are TeaKonn Assistant, a concise in-app guide.',
      'Help with: finding sports events, services, marketplace items, and community connections.',
      'Prefer short, actionable answers. Offer 2-3 follow-up suggestions.',
      'When asked to find, propose filters (sport, city, free/paid) and next clicks.',
    ].join(' ');

    const context = {
      username: me?.username,
      favoriteSports: me?.favoriteSports || [],
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback local reply
      const suggestions = [];
      if (context.favoriteSports?.length) {
        suggestions.push(`Try: Find ${context.favoriteSports[0]} events near me`);
      }
      suggestions.push('Browse services (physiotherapy, coaching, nutrition)');
      suggestions.push('Open Discover and pick Sports or Marketplace');
      return res.json({
        ok: true,
        reply: `Hi${context.username ? ' ' + context.username : ''}! I can help you find events, services, and people. Tell me a sport or city.`,
        suggestions,
      });
    }

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `User context: ${JSON.stringify(context)}. Query: ${message}` },
      ],
      temperature: 0.3,
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[AI ASSISTANT] OpenAI error', resp.status, errText);
      return res.status(500).json({ error: 'assistant_failed', details: errText });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ ok: true, reply });
  } catch (e) {
    console.error('[AI ASSISTANT] error', e);
    res.status(500).json({ error: 'assistant_error', details: e.message });
  }
});

export default router;

// Streaming assistant via SSE (requires auth). Proxies OpenAI stream when key exists.
router.post('/assistant/stream', auth, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).set({ 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'invalid_message' }));
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // flush headers
    res.flushHeaders?.();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const payload = { ok: true, reply: 'Hi! Set OPENAI_API_KEY to enable streaming. For now, try Quick Search chips.' };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const userId = req.user?.id || req.user?._id;
    const me = userId ? await User.findById(userId).select('username favoriteSports') : null;
    const system = [
      'You are TeaKonn Assistant, a concise in-app guide.',
      'Help with: finding sports events, services, marketplace, and community connections.',
      'Prefer short, actionable answers. Offer 2-3 follow-up suggestions.',
      'When asked to find, propose filters (sport, city, free/paid) and next clicks.',
    ].join(' ');
    const context = { username: me?.username, favoriteSports: me?.favoriteSports || [] };

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `User context: ${JSON.stringify(context)}. Query: ${message}` },
      ],
      temperature: 0.3,
      stream: true,
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok || !resp.body) {
      const errText = await resp.text();
      res.write(`data: ${JSON.stringify({ error: 'assistant_failed', details: errText })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Heartbeat to keep connections alive behind proxies
    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 15000);

    // Proxy OpenAI SSE stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (d) break;
      const chunk = decoder.decode(value);
      // OpenAI already sends SSE lines like "data: {...}\n\n"; forward as-is
      res.write(chunk);
    }
    clearInterval(heartbeat);
    try { res.write('data: [DONE]\n\n'); } catch {}
    res.end();
  } catch (e) {
    try {
      res.write(`data: ${JSON.stringify({ error: 'assistant_error', details: e?.message || 'unknown' })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch {}
    res.end();
  }
});
