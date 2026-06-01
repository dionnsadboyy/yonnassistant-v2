require("dotenv").config();

const API_URL = "https://core.snifoxai.com/v1/chat/completions";
const MODEL = "openai/gpt-5.2";

async function callGPT(messages) {

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SNIFOX_API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages
        })
    });

    const data = await response.json();

    return data.choices?.[0]?.message?.content || "";
}

async function decideNeedDatabase(question) {

    const prompt = `
Tentukan apakah pertanyaan user membutuhkan data database keuangan.

Jawab HANYA JSON VALID.

Contoh:

{"needDatabase":true}

atau

{"needDatabase":false}

User:
${question}
`;

    const result = await callGPT([
        {
            role: "system",
            content: "Kamu AI router."
        },
        {
            role: "user",
            content: prompt
        }
    ]);

    try {
        return JSON.parse(result);
    } catch {
        return {
            needDatabase: true
        };
    }
}

async function answerNormal(question) {

    return await callGPT([
        {
            role: "system",
            content: `
Kamu adalah YonnGPT.

Jawab santai.
Bahasa Indonesia.
Fokus ke produktivitas dan keuangan.
`
        },
        {
            role: "user",
            content: question
        }
    ]);
}

async function answerWithDatabase(question, databaseData) {

    return await callGPT([
        {
            role: "system",
            content: `
Kamu adalah YonnGPT.

Jawab berdasarkan data database.

Jangan mengarang.
Jika data tidak ditemukan,
katakan tidak ditemukan.
`
        },
        {
            role: "user",
            content: `
PERTANYAAN:

${question}

DATABASE:

${JSON.stringify(databaseData)}
`
        }
    ]);
}

module.exports = {
    decideNeedDatabase,
    answerNormal,
    answerWithDatabase
};