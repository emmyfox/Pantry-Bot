import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

// 1. Keep Render's web service happy with a tiny HTTP server
const app = express();
app.get('/', (req, res) => {
  res.send('PantryHelper bot is running and cozy!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Initialize Discord Client with all required message intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Pantry bot logged in successfully as ${client.user.tag}!`);
});

// 4. Listen for chat messages
client.on('messageCreate', async (message) => {
  // Ignore bots or messages outside of the pantry channel
  if (message.author.bot) return;
  if (!message.channel.name || !message.channel.name.includes('pantry')) return;

  const content = message.content.trim();

  if (content.startsWith('!pantry')) {
    const ingredients = content.replace('!pantry', '').trim();

    if (!ingredients) {
      await message.reply('Please list what ingredients you have! Example: `!pantry chicken, rice, garlic`');
      return;
    }

    // Show typing status while Gemini cooks up ideas
    await message.channel.sendTyping();

    try {
      const prompt = `You are a cozy and helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
      Provide 2-3 easy, quick meal ideas they can make using these items (you can assume basic pantry staples like oil, salt, and pepper). 
      Keep the descriptions concise, warm, and formatted with clear titles and short instructions.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      await message.reply(response.text);
    } catch (error) {
      console.error('Error generating recipes:', error);
      await message.reply('Oh no, my kitchen is a bit overwhelmed right now! Try again in a second.');
    }
  }
});

// 5. Log into Discord
client.login(process.env.DISCORD_BOT_TOKEN);