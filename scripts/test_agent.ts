import { loadExpensesFromCSV } from '../server/utils/csv-loader';
import { FinanceAgent } from '../server/agent';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const expenses = loadExpensesFromCSV('server/expenses_data/expenses_2024-2025.csv');
const agent = new FinanceAgent(expenses);

async function testAgent() {
    console.log('--- Testing Agent Conversational Logic ---');

    const q1 = "How much did I spend on groceries last month?";
    console.log(`\nUser: ${q1}`);
    const r1 = await agent.run(q1);
    console.log(`Agent: ${r1}`);

    const q2 = "What about the month before?";
    console.log(`\nUser: ${q2}`);
    const r2 = await agent.run(q2);
    console.log(`Agent: ${r2}`);

    const q3 = "Exclude outliers from both";
    console.log(`\nUser: ${q3}`);
    const r3 = await agent.run(q3);
    console.log(`Agent: ${r3}`);
}

if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    testAgent().catch(console.error);
} else {
    console.error('API Key not found in server/.env. Please ensure GOOGLE_GENERATIVE_AI_API_KEY is set.');
}
