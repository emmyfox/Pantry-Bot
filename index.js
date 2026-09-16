import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/recipe', async (req, res) => {
  if (req.body && req.body.type === 1) {
    return res.json({ type: 1 });
  }

  try {
    const ingredients = req.body.data && req.body.data.options 
      ? req.body.data.options[0].value 
      : null;

    if (!ingredients) {
      return res.json({
        type: 4,
        data: { content: 'Please provide some ingredients!' }
      });
    }

    // 1. Instantly tell Discord "Working on it!" so it never times out
    res.json({
      type: 5 // Deferred channel message with source
    });

    // 2. Generate the recipe in the background
    const prompt = `You are a cozy and helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
    Provide 2-3 easy, quick meal ideas they can make using these items (you can assume basic pantry staples like oil, salt, and pepper). 
    Keep the descriptions concise, warm, and formatted with clear titles and short instructions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // 3. Send the follow-up message back to Discord
    const webhookUrl = `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`;
    await fetch(webhookUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: response.text })
    });

  } catch (error) {
    console.error('Error generating recipes:', error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Pantry bot backend running on port ${PORT}`);

  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID) {
    try {
      const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/commands`;
      const commandData = {
        name: 'pantry',
        description: 'Get cozy meal ideas based on your available ingredients!',
        options: [{
          name: 'ingredients',
          description: 'What ingredients do you have?',
          type: 3,
          required: true
        }]
      };

      await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([commandData])
      });
      console.log('Successfully registered /pantry command!');
    } catch (err) {
      console.log('Error auto-registering command:', err);
    }
  }
});