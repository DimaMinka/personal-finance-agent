# 🎓 Learning Guide: Building a Conversational Finance Agent

This guide explains how we built the Personal Finance Agent step-by-step.

---

## 🏗️ What We Built

### The Agent (`server/agent/index.ts`)
Think of this as the "brain" of our application.

**What it does:**
- Remembers your conversation (stores messages in an array)
- Knows what "today" is (December 30, 2025)
- Can call tools to get data when needed

**Key concept:** Instead of answering each question independently, it remembers what you asked before. So when you say "What about last month?", it knows you're still talking about groceries.

### The Tools (`server/tools/expenseTools.ts`)
These are functions the AI can use to access your expense data.

**We created 4 tools:**
1. `get_categories` - Lists all expense categories
2. `list_expenses` - Filters expenses by date, category, amount, etc.
3. `get_spending_stats` - Calculates totals, averages, medians
4. `get_spending_analysis` - Groups expenses (by category, month, vendor)

**Why tools?** The AI can't see your data directly. Tools are like giving it specific actions it can perform.

---

## 🧠 Important Concepts

### 1. Date Awareness
**Problem:** When you say "last month", the AI needs to know what month it is now.

**Solution:** We told the AI in the system prompt:
```
Today's date is December 30, 2025
```

Now it knows "last month" = November 2025.

### 2. Tool Calling
The AI decides when to use tools based on your question.

**Example conversation:**
- You: "How much did I spend on groceries last month?"
- AI thinks: "I need to call `get_spending_stats` with category='groceries' and dates for November"
- AI calls the tool and gets: $288.75
- AI responds: "You spent **$288.75** on groceries last month"

### 3. Filtering Out Weird Data (Outliers)
Sometimes you have unusual expenses (like buying a laptop for $1200 when you usually spend $50).

We added an `excludeOutliers` option that removes these unusual items so they don't mess up your averages.

### 4. Smart Caching (New!)
If you ask the same question twice, the AI shouldn't think twice.

We added a **cache** that remembers recent questions and answers.
- **First time:** AI thinks hard, calls tools, generates response.
- **Second time:** AI instantly returns the previous answer.
- **Benefit:** Saves money (fewer API calls) and makes the app faster!

---

## 🎨 Making It Look Good

### Visual Improvements
We made the AI's responses prettier:
- **Emojis:** 🛒 for groceries, 🍽️ for dining
- **Bold numbers:** **$123.45** instead of $123.45
- **Clean lists:** Bullet points instead of tables

### Safari Bug Fix
We had a problem where messages didn't show in Safari.

**The issue:** We accidentally put a `<div>` inside a `<p>` tag (HTML doesn't allow this)

**The fix:** Changed the wrapper to use `<div>` everywhere

---

## ✅ Testing

We created `scripts/verify_agent.ts` to automatically test the agent.

It asks specific questions and checks if the answers are correct:
- Groceries last month → Should be **$288.75** (Total)
- Average dining → Should be **$161.16**
- Median dining (no outliers) → Should be **$81.16**

This helps us make sure everything works correctly.

---

## 🚀 How to Run

1. Install dependencies: `npm i` (in root and `/server`)
2. Add your API key to `server/.env`
3. Start the app: `npm run dev`
4. Open http://localhost:5173
5. Try asking: "How much did I spend on groceries last month?"

---

## � Key Files

- `server/agent/index.ts` - The AI agent brain
- `server/tools/expenseTools.ts` - Tools the AI can use
- `public/src/App.tsx` - Main UI component
- `public/src/components/ChatBubble.tsx` - Message display

---

## 💡 What You Learned

1. **Stateful AI:** How to make an AI remember conversations
2. **Tool Use:** How to give AI access to functions/data
3. **Prompt Engineering:** How to guide AI behavior with instructions
4. **React + AI:** How to build a chat interface for AI
5. **Cross-browser Testing:** Why Safari can be tricky

Keep experimenting and building! 🌟
