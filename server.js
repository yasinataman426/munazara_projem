import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

app.get('/api/token', async (req, res) => {
  const room = req.query.room;
  const username = req.query.username;

  if (!room || !username) {
    return res.status(400).json({ error: 'room and username parameters are required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit API key or secret is not configured in .env' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: '10m', // Token expires in 10 minutes
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

app.listen(PORT, () => {
  console.log(`Token API server listening on http://localhost:${PORT}`);
});
