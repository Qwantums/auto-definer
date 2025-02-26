const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription(`Look up any english word's definition`)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The word you want defined')
                .setRequired(true),
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const word = interaction.options.getString('word');
        console.log(`Defining "${word}" for ${interaction.user.username}...`);
        const folderPath = path.join(__dirname, '../', '../');
        const filePath = path.join(folderPath, 'data', `${word}.json`);
        let rawString = '';
        if (fs.existsSync(filePath)) {
            rawString += fs.readFileSync(filePath, 'utf-8', (err) => {
                if (err) {
                    console.log(`${filePath} could not be read...`);
                }
            });
        } else {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            const json = await response.json();
            const newJson = json[0];
            rawString += JSON.stringify(newJson);
            fs.writeFileSync(filePath, rawString);
        }
        const def = await JSON.parse(rawString);
        let phonString = '';
        if (!def.phonetics) {
            phonString = def.phonetic;
        } else {
            for (let x = 0; x < def.phonetics.length; x++) {
                const text = def.phonetics[x].text;
                if (!phonString) {
                    phonString += text;
                } else {
                    phonString = phonString.concat(', ', text);
                }
            }
        }
        const stringArray = [];
        let topReply = `# 「${def.word}」`;
        for (let x = 0; x < def.meanings.length; x++) {
            let meanString = '## Meanings';
            meanString = meanString.concat(`\n**Part of Speech:** *${def.meanings[x].partOfSpeech}*`);
            const definiti = def.meanings[x].definitions;
            if (definiti.length > 1) {
                for (let y = 0; y < definiti.length; y++) {
                    let defString = '';
                    if (definiti[y].definition) {
                        const text = `\n- **${y + 1}**\n**Definition:** ${definiti[y].definition}`;
                        defString = await defString.concat(text);
                    }
                    if (definiti[y].example) {
                        const text = `\n**Example:** ${definiti[y].example}`;
                        defString = await defString.concat(text);
                    }
                    if (definiti[y].synonyms.length) {
                        const text = `\n**Synonyms:** ${definiti[y].synonyms}`;
                        defString = await defString.concat(text);
                    }
                    if (definiti[y].antonyms.length) {
                        const text = `\n**Antonyms:** ${definiti[y].antonyms}`;
                        defString = await defString.concat(text);
                    }
                    meanString = await meanString.concat(defString);
                }
            } else {
                let defString = '';
                if (definiti[0].definition) {
                    const text = `\n**Definition:** ${definiti[0].definition}`;
                    defString = await defString.concat(text);
                }
                if (definiti[0].example) {
                    const text = `\n**Example:** ${definiti[0].example}`;
                    defString = await defString.concat(text);
                }
                if (definiti[0].synonyms.length) {
                    const text = `\n**Synonyms:** ${definiti[0].synonyms}`;
                    defString = await defString.concat(text);
                }
                if (definiti[0].antonyms.length) {
                    const text = `\n**Antonyms:** ${definiti[0].antonyms}`;
                    defString = await defString.concat(text);
                }
                meanString = meanString.concat(defString);
            }
            stringArray[x] = meanString;
        }
        if (phonString) {
            const text = `\n***Phonetic:** [${phonString}]*`;
            topReply = await topReply.concat(text);
        }
        if (def.origin) {
            const text = `\n**Origin:** ${def.origin}`;
            topReply = await topReply.concat(text);
        }
        await interaction.editReply(topReply);
        for (let x = 0; x < stringArray.length; x++) {
            await interaction.followUp({ content:`${stringArray[x]}`, flags: MessageFlags.Ephemeral });
        }
    },
};