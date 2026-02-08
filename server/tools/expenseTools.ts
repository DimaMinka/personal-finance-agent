import { tool } from 'ai';
import { z } from 'zod';
import { Expense } from '../agent/types';
import { isBetween } from '../utils/date-helpers';
import { detectAnomalies } from '../utils/anomaly-helper';
import * as math from '../utils/math-helpers';

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
        execute: async ({
            startDate,
            endDate,
            category,
            minAmount,
            maxAmount,
            merchant,
            excludeOutliers
        }) => {
            let filtered = expenses;

            if (category) {
                filtered = filtered.filter(e => e.category?.toLowerCase() === category.toLowerCase());
            }
            if (startDate || endDate) {
                filtered = filtered.filter(e => isBetween(e.date, startDate, endDate));
            }
            if (minAmount !== undefined) {
                filtered = filtered.filter(e => e.amount >= minAmount);
            }
            if (maxAmount !== undefined) {
                filtered = filtered.filter(e => e.amount <= maxAmount);
            }
            if (merchant) {
                filtered = filtered.filter(e => e.vendor.toLowerCase().includes(merchant.toLowerCase()));
            }

            if (excludeOutliers) {
                const outliers = detectAnomalies(filtered, 2);
                const outlierKeys = new Set(outliers.map(o => `${o.date}-${o.amount}-${o.vendor}`));
                filtered = filtered.filter(e => !outlierKeys.has(`${e.date}-${e.amount}-${e.vendor}`));
            }

            return {
                count: filtered.length,
                expenses: filtered
            };
        },
        inputSchema: z.object({
            startDate: z.string().optional().describe('Filter by start date (YYYY-MM-DD)'),
            endDate: z.string().optional().describe('Filter by end date (YYYY-MM-DD)'),
            category: z.string().optional().describe('Filter by category'),
            minAmount: z.number().optional().describe('Minimum amount'),
            maxAmount: z.number().optional().describe('Maximum amount'),
            merchant: z.string().optional().describe('Filter by merchant name'),
            excludeOutliers: z.boolean().optional().describe('Whether to exclude statistical outliers'),
        }),
    }),

    get_spending_stats: tool({
        description: 'Calculate detailed spending statistics with optional filtering and outlier exclusion',
        execute: async ({
            metric,
            startDate,
            endDate,
            category,
            minAmount,
            maxAmount,
            merchant,
            excludeOutliers
        }) => {
            let filtered = expenses;

            if (category) {
                filtered = filtered.filter(e => e.category?.toLowerCase() === category.toLowerCase());
            }
            if (startDate || endDate) {
                filtered = filtered.filter(e => isBetween(e.date, startDate, endDate));
            }
            if (minAmount !== undefined) {
                filtered = filtered.filter(e => e.amount >= minAmount);
            }
            if (maxAmount !== undefined) {
                filtered = filtered.filter(e => e.amount <= maxAmount);
            }
            if (merchant) {
                filtered = filtered.filter(e => e.vendor.toLowerCase().includes(merchant.toLowerCase()));
            }

            if (excludeOutliers) {
                const outliers = detectAnomalies(filtered, 2);
                const outlierKeys = new Set(outliers.map(o => `${o.date}-${o.amount}-${o.vendor}`));
                filtered = filtered.filter(e => !outlierKeys.has(`${e.date}-${e.amount}-${e.vendor}`));
            }

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
            startDate: z.string().optional().describe('Filter by start date (YYYY-MM-DD)'),
            endDate: z.string().optional().describe('Filter by end date (YYYY-MM-DD)'),
            category: z.string().optional().describe('Filter by category'),
            minAmount: z.number().optional().describe('Minimum amount'),
            maxAmount: z.number().optional().describe('Maximum amount'),
            merchant: z.string().optional().describe('Filter by merchant name'),
            excludeOutliers: z.boolean().optional().describe('Whether to exclude statistical outliers'),
        }),
    }),

    get_spending_analysis: tool({
        description: 'Group expenses and calculate totals/counts (e.g., spending by category, monthly breakdown)',
        execute: async ({
            groupBy,
            startDate,
            endDate,
            category,
            minAmount,
            maxAmount,
            merchant,
            excludeOutliers
        }) => {
            let filtered = expenses;

            if (category) {
                filtered = filtered.filter(e => e.category?.toLowerCase() === category.toLowerCase());
            }
            if (startDate || endDate) {
                filtered = filtered.filter(e => isBetween(e.date, startDate, endDate));
            }
            if (minAmount !== undefined) {
                filtered = filtered.filter(e => e.amount >= minAmount);
            }
            if (maxAmount !== undefined) {
                filtered = filtered.filter(e => e.amount <= maxAmount);
            }
            if (merchant) {
                filtered = filtered.filter(e => e.vendor.toLowerCase().includes(merchant.toLowerCase()));
            }

            if (excludeOutliers) {
                const outliers = detectAnomalies(filtered, 2);
                const outlierKeys = new Set(outliers.map(o => `${o.date}-${o.amount}-${o.vendor}`));
                filtered = filtered.filter(e => !outlierKeys.has(`${e.date}-${e.amount}-${e.vendor}`));
            }

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
            startDate: z.string().optional().describe('Filter by start date (YYYY-MM-DD)'),
            endDate: z.string().optional().describe('Filter by end date (YYYY-MM-DD)'),
            category: z.string().optional().describe('Filter by category'),
            minAmount: z.number().optional().describe('Minimum amount'),
            maxAmount: z.number().optional().describe('Maximum amount'),
            merchant: z.string().optional().describe('Filter by merchant name'),
            excludeOutliers: z.boolean().optional().describe('Whether to exclude statistical outliers'),
        }),
    }),
});
