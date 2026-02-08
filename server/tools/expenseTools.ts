import { tool } from 'ai';
import { z } from 'zod';
import { Expense } from '../agent/types';

export const createTools = (expenses: Expense[]) => ({
    get_categories: tool({
        description: 'Get all unique expense categories',
        inputSchema: z.object({}),
        execute: async () => {
            const categories = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));
            return { categories };
        },
    }),

    list_expenses: tool({
        description: 'Filter and list expenses',
        execute: async ({ category }: { category?: string }) => {
            let filtered = expenses;
            if (category) {
                filtered = filtered.filter(
                    (e) => e.category?.toLowerCase() === category.toLowerCase()
                );
            }
            // Basic implementation for now: just category filter
            return {
                count: filtered.length,
                expenses: filtered.slice(0, 10) // Limit to 10 for basic version
            };
        },
        inputSchema: z.object({
            category: z.string().optional().describe('Filter by category (e.g., groceries, dining)'),
        }),
    }),

    get_spending_stats: tool({
        description: 'Calculate simple spending statistics',
        execute: async ({ category }: { category?: string }) => {
            let filtered = expenses;
            if (category) {
                filtered = filtered.filter(
                    (e) => e.category?.toLowerCase() === category.toLowerCase()
                );
            }
            const total = filtered.reduce((sum, e) => sum + e.amount, 0);
            return {
                count: filtered.length,
                total,
                average: filtered.length > 0 ? total / filtered.length : 0,
            };
        },
        inputSchema: z.object({
            category: z.string().optional().describe('Filter by category (e.g., groceries, dining)'),
        }),
    }),
});
