import { loadExpensesFromCSV } from '../server/utils/csv-loader';
import { createTools } from '../server/tools/expenseTools';

const expenses = loadExpensesFromCSV('server/expenses_data/expenses_2024-2025.csv');
const tools = createTools(expenses);

async function verify() {
    console.log('--- Verification Benchmarks ---');

    if (!tools.get_spending_stats.execute || !tools.get_spending_analysis.execute) return;

    // 1. Groceries last month (Nov 2025)
    const groceries = await (tools.get_spending_stats.execute as any)({
        metric: 'total',
        category: 'groceries',
        startDate: '2025-11-01',
        endDate: '2025-11-30'
    } as any, { toolCallId: 'v1', messages: [] });
    console.log('Groceries last month:', groceries.value, '(Expected: 288.75)');

    // 2. Average dining expense (all time)
    const avgDining = await (tools.get_spending_stats.execute as any)({
        metric: 'average',
        category: 'dining'
    } as any, { toolCallId: 'v2', messages: [] });
    console.log('Average dining (all time):', avgDining.value, '(Expected: 161.16)');

    // 3. Median dining expense, excluding outliers (all time)
    const medianDiningNoOutliers = await (tools.get_spending_stats.execute as any)({
        metric: 'median',
        category: 'dining',
        excludeOutliers: true
    } as any, { toolCallId: 'v3', messages: [] });
    console.log('Median dining no outliers:', medianDiningNoOutliers.value, '(Expected: 81.16)');

    // 4. Category analysis last month (Nov 2025)
    const categorySummary = await (tools.get_spending_analysis.execute as any)({
        groupBy: 'category',
        startDate: '2025-11-01',
        endDate: '2025-11-30'
    } as any, { toolCallId: 'v4', messages: [] });
    console.log('\n--- Category Summary Nov 2025 ---');
    categorySummary.results.forEach((r: any) => {
        console.log(`${r.group}: ${r.total}`);
    });
}

verify();
