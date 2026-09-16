import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// Initialize the Google Gen AI SDK (it automatically picks up GEMINI_API_KEY from environment variables)
const ai = new GoogleGenAI();

app.post('/recipe', async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients) {
      return res.status(400).json({ error: 'No ingredients provided!' });
    }

    // Prompt the model to create easy recipes using the provided ingredients
    const prompt = `You are a helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
    Provide 2-3 easy, quick meal ideas they can make using these items (you can assume basic pantry staples like oil, salt, and pepper). 
    Keep the descriptions concise, cozy, and formatted with clear titles and short instructions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ recipes: response.text });
  } catch (error) {
    console.error('Error generating recipes:', error);
    res.status(500).json({ error: 'Failed to whip up a recipe right now!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pantry bot backend running on port ${PORT}`);
});