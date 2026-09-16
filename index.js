import express from 'express';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
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

// 3. Initialize Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  console.log(`Pantry bot logged in successfully as ${client.user.tag}!`);

  // Automatically register the /pantry slash command on startup
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
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: [command.toJSON()] },
    );
    console.log('Successfully registered /pantry slash command!');
  } catch (error) {
    console.error('Error registering slash command:', error);
  }
});

// 4. Listen for slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'pantry') return;

  const ingredients = interaction.options.getString('ingredients');

  // Defer the reply so Render/Gemini has time to think without timing out
  await interaction.deferReply();

  try {
    const prompt = `You are a cozy and helpful kitchen assistant. The user has these ingredients on hand: "${ingredients}". 
    Provide 2-3 easy, quick meal ideas they can make using these items (you can assume basic pantry staples like oil, salt, and pepper). 
    Keep the descriptions concise, warm, and formatted with clear titles and short instructions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    await interaction.editReply(response.text);
  } catch (error) {
    console.error('Error generating recipes:', error);
    await interaction.editReply('Oh no, my kitchen is a bit overwhelmed right now! Try again in a second.');
  }
});

// 5. Log into Discord
client.login(process.env.DISCORD_BOT_TOKEN);