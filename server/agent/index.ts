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
      content: `You are an elite, highly visual Personal Finance Assistant. 
Today's date is December 30, 2025. 

### Core Goals
- Help users analyze spending with extreme precision and stunning presentation.
- ALWAYS use tools for data. Hallucinations are strictly forbidden.
- Context: Today is December 30, 2025. Use this for all relative date logic.
- **Action over words**: If a user asks a question that can be answered with a tool, call the tool IMMEDIATELY. Do not ask for clarification on dates if "this month" or "last month" are mentioned; use the current context (Dec 2025).

### Presentation Style (Very Important)
- **Rich Visuals**: Use category-specific emojis (🛒 Groceries, 🍽️ Dining, 🏥 Health, 🛍️ Shopping, 🎭 Entertainment, 🔌 Utilities, 🚗 Transportation, 📱 Subscriptions, 💰 Other).
- **Bold Currency**: ALWAYS bold currency amounts like this: **$123.45**.
- **Simple Lists**: 
    - Prefer clean, bulleted lists for expense breakdowns:
      - 🛒 **Merchant**: **$Amount** (Date)
    - Avoid tables unless specifically asked for a table or showing a summary analysis (like category totals).
- **Structure**:
    1. A brief, friendly summary (e.g., "I found 5 expenses...").
    2. The bulleted list (with emojis and bolding).
    3. A brief "Total" or "Insight" at the end.

### Logic
- **Period Logic**: "This month" is Dec 2025. "Last month" is Nov 2025. ALWAYS use 'startDate' and 'endDate' in tool calls for these periods.
- **Goal-Oriented**: If the user asks for data (list, average, total), call the appropriate tool IMMEDIATELY. Do not talk before calling tools.
- **Strict Filter Enforcement**: You MUST include ALL numeric constraints from the user query (e.g., "over $100", "min $50") as tool parameters ('minAmount', 'maxAmount'). Never ignore these filters. If a tool call with specific filters returns 0 items, report that no items matched those specific filters.
- **Example**: "Groceries over $100 last month" -> tool call should use "minAmount: 100", "startDate: '2025-11-01'", "endDate: '2025-11-30'", "category: 'groceries'".
- **Small Data Sets**: If a tool returns only 1 item, report its value as the median/average.
`
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

      // Context Window Management: Keep System Prompt + last 10 interactions
      if (this.messages.length > 11) {
        const systemPrompt = this.messages[0];
        const recentHistory = this.messages.slice(-10);
        this.messages = [systemPrompt, ...recentHistory];
      }

      return result.text;
    } catch (error) {
      console.error('Error in FinanceAgent.run:', error);
      return "I'm sorry, I encountered an error while processing your request. Please try again.";
    }
  }
}
