import { generateText, CoreMessage, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { Expense } from './types';
import { createTools } from '../tools/expenseTools';

export class FinanceAgent {
  private messages: CoreMessage[] = [];
  private tools: ReturnType<typeof createTools>;

  constructor(expenses: Expense[]) {
    this.tools = createTools(expenses);

    // Initial system message with critical date context
    this.messages.push({
      role: 'system',
      content: `You are a professional personal finance assistant. 
Today's date is December 30, 2025. 

Your goal is to help users analyze their spending habits using the provided tools.
- ALWAYS use tools to get accurate data. Do not guess or hallucinate numbers.
- Today is December 30, 2025. Use this for relative date calculations (e.g., "last month" is November 2025).
- If the user asks for "outliers" or "anomalies", use the 'excludeOutliers' parameter in your tools or specific anomaly detection.
- Be conversational but precise. 
- Use Markdown for all formatting, especially for tables and bolding currency amounts.
- If you need to compare two periods, call tools multiple times or use the aggregation tool.
- Remember previous context (e.g., if asked "What about groceries?", and then "How about last month?", you should know you're still talking about groceries).`
    });
  }

  async run(query: string): Promise<string> {
    // Add user query to history
    this.messages.push({ role: 'user', content: query });

    try {
      const result = await generateText({
        model: google('gemini-2.0-flash'),
        messages: this.messages,
        tools: this.tools,
        stopWhen: stepCountIs(10), // Allow for multi-step reasoning and multiple tool calls
      });

      // Add assistant response to history to maintain context
      this.messages.push({ role: 'assistant', content: result.text });

      return result.text;
    } catch (error) {
      console.error('Error in FinanceAgent.run:', error);
      return "I'm sorry, I encountered an error while processing your request. Please try again.";
    }
  }
}
