import { loadExpensesFromCSV } from '../server/utils/csv-loader';
import { FinanceAgent } from '../server/agent';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const expenses = loadExpensesFromCSV('server/expenses_data/expenses_2024-2025.csv');

interface TestCase {
    name: string;
    query: string;
    expectedValue: string;
}

const testCases: TestCase[] = [
    {
        name: "Groceries Last Month",
        query: "How much did I spend on groceries last month?",
        expectedValue: "288.75"
    },
    {
        name: "Average Dining All Time",
        query: "What is my average dining expense for all time?",
        expectedValue: "161.16"
    },
    {
        name: "Median Dining No Outliers",
        query: "What is the median dining expense for all time, excluding outliers?",
        expectedValue: "81.16"
    },
    {
        name: "Utilities Last Month",
        query: "How much were my utilities last month?",
        expectedValue: "148.90"
    }
];

async function runBenchmarks() {
    console.log('🚀 Starting Automated Agent Verification...\n');
    let passed = 0;

    for (const test of testCases) {
        process.stdout.write(`Testing: ${test.name}... `);

        // New agent instance for each test to ensure fresh context if needed, 
        // though we want to test memory too eventually. 
        // For benchmarks, let's keep them isolated for now.
        const agent = new FinanceAgent(expenses);

        try {
            const response = await agent.run(test.query);

            // Basic check: is the expected value in the response string?
            if (response.includes(test.expectedValue)) {
                console.log('✅ PASS');
                passed++;
            } else {
                console.log('❌ FAIL');
                console.log(`   Expected: ${test.expectedValue}`);
                console.log(`   Agent Response: "${response}"`);
            }
        } catch (error) {
            console.log('💥 ERROR');
            console.error(error);
        }
    }

    console.log(`\nVerification Complete: ${passed}/${testCases.length} tests passed.`);
    if (passed === testCases.length) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    runBenchmarks().catch(console.error);
} else {
    console.error('API Key not found. Please ensure GOOGLE_GENERATIVE_AI_API_KEY is set in server/.env');
    process.exit(1);
}
