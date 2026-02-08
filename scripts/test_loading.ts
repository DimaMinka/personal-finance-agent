import { loadExpensesFromCSV } from '../server/utils/csv-loader';

try {
    const expenses = loadExpensesFromCSV('server/expenses_data/expenses_2024-2025.csv');
    console.log(`Successfully loaded ${expenses.length} expenses.`);
    console.log('Sample expense:', expenses[0]);
} catch (error) {
    console.error('Failed to load expenses:', error);
    process.exit(1);
}
