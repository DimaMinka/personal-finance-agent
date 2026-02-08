import { loadExpensesFromCSV } from '../server/utils/csv-loader';
import { createTools } from '../server/tools/expenseTools';

const expenses = loadExpensesFromCSV('server/expenses_data/expenses_2024-2025.csv');
const tools = createTools(expenses);

async function test() {
    console.log('--- Testing get_categories ---');
    if (!tools.get_categories.execute) throw new Error('get_categories has no execute');
    const catResult = await tools.get_categories.execute({} as any, { toolCallId: '1', messages: [] });
    console.log('Categories:', catResult);

    console.log('\n--- Testing list_expenses (groceries) ---');
    if (!tools.list_expenses.execute) throw new Error('list_expenses has no execute');
    const listResult: any = await tools.list_expenses.execute({ category: 'groceries' }, { toolCallId: '2', messages: [] });
    console.log('Groceries count:', listResult.count);
    console.log('First 2 groceries:', listResult.expenses.slice(0, 2));
}

test();
