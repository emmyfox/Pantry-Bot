import express from 'express';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.get('/', (req, res) => res.send('PantryHelper bot is running and cozy!'));

// Listen on Render's required port or fall back to 3000 for local testing
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

  try {
    const prompt = `You are a cozy and helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
    Provide 2-3 brief, quick meal ideas they can make using these items (assume basic pantry staples like oil, salt, pepper). 
    Keep it short, warm, and under 1,800 characters total.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    let replyText = response.text || 'Here are your recipes!';
    if (replyText.length > 2000) {
      replyText = replyText.substring(0, 1997) + '...';
    }

    await interaction.editReply(replyText);
  } catch (error) {
    console.error('Detailed Gemini Error:', error);
    await interaction.editReply(`Oops! Kitchen hiccup: \`${error.message || 'Unknown error'}\``);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);