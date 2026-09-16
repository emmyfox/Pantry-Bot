import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/recipe', async (req, res) => {
  // Handle Discord's initial verification ping
  if (req.body && req.body.type === 1) {
    return res.json({ type: 1 });
  }

  try {
    // Extract ingredients from the slash command option
    const ingredients = req.body.data && req.body.data.options 
      ? req.body.data.options[0].value 
      : null;

    if (!ingredients) {
      return res.json({
        type: 4,
        data: { content: 'Please provide some ingredients! Example: `/pantry chicken, rice, garlic`' }
      });
    }

    const prompt = `You are a cozy and helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
    Provide 2-3 easy, quick meal ideas they can make using these items (you can assume basic pantry staples like oil, salt, and pepper). 
    Keep the descriptions concise, warm, and formatted with clear titles and short instructions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({
      type: 4,
      data: { content: response.text }
    });
  } catch (error) {
    console.error('Error generating recipes:', error);
    return res.json({
      type: 4,
      data: { content: 'Oh no, my kitchen is a bit overwhelmed right now! Try again in a second.' }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Pantry bot backend running on port ${PORT}`);

  // Automatically register the /pantry command with Discord if bot credentials exist
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID) {
    try {
      const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/commands`;
      const commandData = {
        name: 'pantry',
        description: 'Get cozy meal ideas based on your available ingredients!',
        options: [
          {
            name: 'ingredients',
            description: 'What ingredients do you have?',
            type: 3, // String type
            required: true
          }
        ]
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([commandData])
      });

      if (response.ok) {
        console.log('Successfully registered /pantry command with Discord!');
      } else {
        console.log('Failed to auto-register command:', await response.text());
      }
    } catch (err) {
      console.log('Error auto-registering command:', err);
    }
  }
});