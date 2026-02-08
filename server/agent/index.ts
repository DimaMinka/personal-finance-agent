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
- If asked for "outliers" or "anomalies", use 'excludeOutliers: true'.
- Remember conversational context. "What about last month?" refers to the same filters as the previous query unless specified otherwise.`
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
