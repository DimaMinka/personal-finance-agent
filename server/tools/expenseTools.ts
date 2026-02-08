import { tool } from 'ai';
import { z } from 'zod';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';
import { detectAnomalies } from '../utils/anomaly-helper';
import * as math from '../utils/math-helpers';

// Shared filter parameters schema
const filterParamsSchema = {
    startDate: z.string().optional().describe('Start date for filtering (YYYY-MM-DD). Mandatory for period-specific queries like "this month" or "last month".'),
    endDate: z.string().optional().describe('End date for filtering (YYYY-MM-DD). Inclusive.'),
    category: z.string().optional().describe('Filtering by category (e.g., "groceries", "dining")'),
    minAmount: z.number().optional().describe('Minimum amount filter (e.g., use 50 for "over $50")'),
    maxAmount: z.number().optional().describe('Maximum amount filter'),
    merchant: z.string().optional().describe('Filter by merchant/vendor name (partial match)'),
    excludeOutliers: z.boolean().optional().describe('Whether to exclude statistical outliers from the calculation'),
};

interface FilterParams {
    startDate?: string;
    endDate?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    merchant?: string;
    excludeOutliers?: boolean;
    limit?: number;
}

/**
 * Filters expenses based on provided criteria
 */
function filterExpenses(expenses: Expense[], params: FilterParams): Expense[] {
    let filtered = expenses;

    if (params.category) {
        filtered = filtered.filter(e => e.category?.toLowerCase() === params.category!.toLowerCase());
    }
    if (params.startDate || params.endDate) {
        filtered = filtered.filter(e => isBetween(e.date, params.startDate, params.endDate));
    }
    if (params.minAmount !== undefined) {
        filtered = filtered.filter(e => e.amount >= params.minAmount!);
    }
    if (params.maxAmount !== undefined) {
        filtered = filtered.filter(e => e.amount <= params.maxAmount!);
    }
    if (params.merchant) {
        filtered = filtered.filter(e => e.vendor.toLowerCase().includes(params.merchant!.toLowerCase()));
    }

    if (params.excludeOutliers) {
        filtered = removeOutliers(filtered);
    }

    return filtered;
}

/**
 * Removes statistical outliers from expense list
 */
function removeOutliers(expenses: Expense[]): Expense[] {
    const outliers = detectAnomalies(expenses, 2);
    const outlierKeys = new Set(outliers.map(o => `${o.date}-${o.amount}-${o.vendor}`));
    return expenses.filter(e => !outlierKeys.has(`${e.date}-${e.amount}-${e.vendor}`));
}

export const createTools = (expenses: Expense[]) => ({
    get_categories: tool({
        description: 'Get all unique expense categories',
        inputSchema: z.object({}),
        execute: async () => {
            const categories = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));
            return { categories: categories as string[] };
        },
    }),

    list_expenses: tool({
        description: 'Filter and list expenses',
        execute: async (params) => {
            const limit = params.limit || 50;
            const filtered = filterExpenses(expenses, params);
            const limitedExpenses = filtered.slice(0, limit);

            return {
                count: filtered.length,
                limit,
                expenses: limitedExpenses,
                warning: filtered.length > limit ? `Showing ${limit} of ${filtered.length} expenses. Refine filters to see more.` : undefined
            };
        },
        inputSchema: z.object({
            limit: z.number().optional().default(50).describe('Max number of expenses to return (default 50)'),
            ...filterParamsSchema
        }),
    }),

    get_spending_stats: tool({
        description: 'Calculate statistical metrics (total, average, median, min, max, count) with filters for dates, category, min/max amount, and merchant.',
        execute: async ({ metric, ...filterParams }) => {
            const filtered = filterExpenses(expenses, filterParams);
            const amounts = filtered.map(e => e.amount);

            if (metric === 'count') return { value: filtered.length };
            if (filtered.length === 0) return { value: 0 };

            let result: number;
            switch (metric) {
                case 'total': result = math.sum(amounts); break;
                case 'average': result = math.mean(amounts); break;
                case 'median': result = math.median(amounts); break;
                case 'min': result = math.min(amounts); break;
                case 'max': result = math.max(amounts); break;
                default: result = math.sum(amounts);
            }

            return {
                metric,
                value: Number(result.toFixed(2)),
                count: filtered.length
            };
        },
        inputSchema: z.object({
            metric: z.enum(['total', 'average', 'median', 'min', 'max', 'count']).describe('The statistical metric to calculate'),
            ...filterParamsSchema,
        }),
    }),

    get_spending_analysis: tool({
        description: 'Group expenses and calculate totals/counts (e.g., spending by category, monthly breakdown)',
        execute: async ({ groupBy, ...filterParams }) => {
            const filtered = filterExpenses(expenses, filterParams);
            const groups: Record<string, { total: number, count: number }> = {};

            filtered.forEach(e => {
                let key = '';
                if (groupBy === 'category') key = e.category || 'uncategorized';
                else if (groupBy === 'month') key = e.date.substring(0, 7);
                else if (groupBy === 'vendor') key = e.vendor;

                if (!groups[key]) groups[key] = { total: 0, count: 0 };
                groups[key].total += e.amount;
                groups[key].count += 1;
            });

            const results = Object.entries(groups).map(([group, stats]) => ({
                group,
                total: Number(stats.total.toFixed(2)),
                count: stats.count
            })).sort((a, b) => b.total - a.total);

            return {
                groupBy,
                results
            };
        },
        inputSchema: z.object({
            groupBy: z.enum(['category', 'month', 'vendor']).describe('Criteria to group expenses by'),
            ...filterParamsSchema,
        }),
    }),

    get_monthly_summary: tool({
        description: 'Get a high-level summary of spending for a specific month (Total, Top Categories, Top Merchants). Use this for general queries like "How was my spending last month?".',
        execute: async ({ month, category }) => {
            // 1. Filter expenses for the specific month
            const startDate = `${month}-01`;
            // Calculate end date (last day of the month)
            const [y, m] = month.split('-').map(Number);
            const nextMonth = new Date(y, m, 0); // Day 0 of next month is last day of current
            const endDate = nextMonth.toISOString().split('T')[0];

            let filtered = filterExpenses(expenses, { startDate, endDate, category, excludeOutliers: true });

            if (filtered.length === 0) {
                return { message: `No expenses found for ${month}` };
            }

            // 2. Calculate Aggregates
            const total = math.sum(filtered.map(e => e.amount));

            // 3. Top Categories
            const catGroups: Record<string, number> = {};
            filtered.forEach(e => {
                const cat = e.category || 'Uncategorized';
                catGroups[cat] = (catGroups[cat] || 0) + e.amount;
            });
            const topCategories = Object.entries(catGroups)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat, amount]) => ({ category: cat, amount: Number(amount.toFixed(2)) }));

            // 4. Top Merchants (by frequency)
            const merchantCounts: Record<string, number> = {};
            filtered.forEach(e => {
                const merch = e.vendor;
                merchantCounts[merch] = (merchantCounts[merch] || 0) + 1;
            });
            const topMerchants = Object.entries(merchantCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([merch, count]) => ({ merchant: merch, count }));

            return {
                month,
                total: Number(total.toFixed(2)),
                transactionCount: filtered.length,
                topCategories,
                topMerchants,
                note: "Outliers were automatically excluded for this summary."
            };
        },
        inputSchema: z.object({
            month: z.string().describe('The month to summarize (YYYY-MM)'),
            category: z.string().optional().describe('Optional category filter')
        }),
    }),
});
