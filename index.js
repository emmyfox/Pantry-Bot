import express from 'express';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.get('/', (req, res) => res.send('PantryHelper bot is running and cozy!'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Pantry bot backend running on port ${PORT}`);
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Pantry bot logged in successfully as ${client.user.tag}!`);
  try {
    const command = new SlashCommandBuilder()
      .setName('pantry')
      .setDescription('Get cozy meal ideas based on your available ingredients!')
      .addStringOption(option =>
        option.setName('ingredients')
          .setDescription('What ingredients do you have?')
          .setRequired(true)
      );

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: [command.toJSON()] });
  } catch (error) {
    console.error('Error registering slash command:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'pantry') return;

  const ingredients = interaction.options.getString('ingredients');
  await interaction.deferReply();

  let responseText = null;
  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash'];
  let success = false;

  const prompt = `You are a cozy and helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
  Provide 2-3 brief, quick meal ideas they can make using these items (assume basic pantry staples like oil, salt, pepper). 
  Keep it short, warm, and under 1,800 characters total.`;

  for (const modelName of modelsToTry) {
    if (success) break;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      responseText = response.text;
      success = true;
    } catch (error) {
      console.warn(`Model ${modelName} failed, trying next if available:`, error.message);
    }
  }

  if (!success) {
    responseText = `Oops! Kitchen hiccup: All models are currently experiencing high demand. Please try your command again in just a moment!`;
  }

  // Ensure text is safely under Discord's 2000 character limit
  if (responseText.length > 2000) {
    responseText = responseText.substring(0, 1997) + '...';
  }

  await interaction.editReply(responseText);
});

client.login(process.env.DISCORD_BOT_TOKEN);