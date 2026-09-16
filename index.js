import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Create a Discord client instance with message intents
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

// Listen for chat messages
client.on('messageCreate', async (message) => {
  // Ignore messages from bots or messages outside of channels named pantry-helper
  if (message.author.bot) return;
  if (!message.channel.name || !message.channel.name.includes('pantry-helper')) return;

  const content = message.content.trim();

  // Check if message starts with !pantry
  if (content.startsWith('!pantry')) {
    const ingredients = content.replace('!pantry', '').trim();

    if (!ingredients) {
      await message.reply('Please list what ingredients you have! Example: `!pantry chicken, rice, garlic`');
      return;
    }

    // Show a typing indicator while Gemini thinks
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

// Log into Discord using your bot token
client.login(process.env.DISCORD_BOT_TOKEN);