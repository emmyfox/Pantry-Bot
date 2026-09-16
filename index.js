import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// Initialize the Google Gen AI SDK with your Render environment variable
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
        data: { content: 'Please provide some ingredients!' }
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
app.listen(PORT, () => {
  console.log(`Pantry bot backend running on port ${PORT}`);
});