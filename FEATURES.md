# Credit Spend Analyser

> Your credit card statements, finally making sense.
>
> Last updated: 2026-05-12

---

## What is this?

Credit Spend Analyser turns the PDFs, CSVs, and spreadsheets you download from your credit card issuers into a clear picture of where your money goes. Upload a statement, and the app extracts every transaction, auto-categorizes it, and builds a dashboard of insights — no manual data entry, no spreadsheet formulas.

It's built for people who want visibility into their spending without handing their bank credentials to a third-party service.

---

## The Problem

Most people download their credit card statements and never look at them. The ones who do try to understand their spending usually end up in a spreadsheet, manually tagging hundreds of transactions. Third-party apps like Mint or Monarch require you to link your bank accounts, which not everyone is comfortable doing.

Credit Spend Analyser sits in the middle: **you stay in control of your data**, uploading only the statements you choose, and the app does the heavy lifting of extraction, categorization, and analysis.

---

## How It Works

### Upload a statement, get instant insights

Drop a statement file — PDF, CSV, Excel, or even a screenshot — and the app:

1. **Detects your card type** automatically (Discover, Chase, Amex, or Visa)
2. **Extracts every transaction** from the file using structured parsing or AI vision
3. **Categorizes each transaction** into one of 20 spending categories
4. **Shows you a review screen** where you can verify and correct categories before saving

No transaction is saved until you confirm. You're always in the loop.

### Smart categorization that learns from you

The app doesn't blindly rely on AI for every transaction. It uses a layered approach:

- **Your corrections come first** — if you've ever told the app "Costco is Groceries," it remembers that forever
- **Your card issuer's labels** — Discover says "Restaurants," Chase says "Food & Drink" — the app translates both to "Dining"
- **Built-in merchant rules** — common merchants like Walmart, Amazon, and Uber are recognized instantly
- **AI as a safety net** — only truly ambiguous transactions go to GPT-4o Mini, and you still get the final say

Every correction you make trains the system for future uploads. Over time, fewer and fewer transactions need attention.

---

## Features

### Dashboard

A single screen that answers "where is my money going?"

- **At-a-glance summary** — total spend, transaction count, credits received, and debits — each with color-coded cards
- **Category breakdown** — pie chart showing how your spending splits across Groceries, Dining, Shopping, Travel, and 16 other categories
- **Monthly spending trends** — see how your total spend changes month to month
- **Card comparison** — if you use multiple cards, see which one you're spending the most on
- **Top merchants** — your highest-spend merchants ranked, so you know where the money is really going
- **Date range & card filters** — slice the data by last 30 days, 90 days, 6 months, 1 year, or all time; filter to a single card

### Statement Upload

- Accepts **PDF, CSV, XLS/XLSX, and image** files (up to 20 MB)
- **Auto-detects** which credit card the statement is from
- Two-step flow: **preview first, save second** — you see every extracted transaction and its category before anything is written
- Transactions that couldn't be confidently categorized are flagged for your review, with a one-click "Ask AI" option
- Upload stats show how many rows were parsed, how they were categorized, and if any need attention

### Transaction Browser

- **Search, filter, and page** through all your transactions across all cards and statements
- Filter by card, category, transaction type (debit/credit/payment), or free-text search
- **Change a category inline** — click on any transaction's category to correct it
- **Bulk correction** — when you correct a merchant's category, the app asks if you want to apply it to *all* transactions from that merchant (past and future)

### Category Audit

Not sure if the auto-categorization is accurate? Run an audit.

- **Sample a batch** of transactions (25, 50, or 100) that were categorized by rules or issuer labels
- The app sends them to AI for a **second opinion** and surfaces any disagreements
- For each disagreement, you choose: accept the AI's suggestion, keep the current category, or pick your own
- See an **accuracy score** for your categorizations
- Corrections automatically update the learning system for future uploads

### Recurring Transaction Detection

Automatically finds your subscriptions, memberships, and regular charges.

- **Detects patterns** — groups transactions by merchant and analyzes their timing and amounts
- **Identifies frequency** — weekly, bi-weekly, monthly, quarterly, semi-annual, or annual
- **Tracks status** — active subscriptions, possibly cancelled ones, and newly detected patterns
- **Alerts you** to price changes, missed charges, unusual amounts, and new recurring items
- **Shows your recurring cost** — total monthly and annual recurring spend at a glance
- **Manual overrides** — dismiss false positives, force-include missed ones, or correct the detected frequency

### Reports & Export

- **Download transactions as CSV** for your own analysis or tax prep
- **Generate a formatted PDF** report of your transactions
- **View upload history** — see all statements you've uploaded with file details, transaction counts, and totals
- **Delete statements** you no longer need (transactions are removed too)

### Design & Experience

- **Dark mode** — toggle between light and dark themes
- **Responsive layout** — works on desktop and tablet with a collapsible sidebar
- **Color-coded everything** — each spending category has a distinct color across charts, badges, and tables; each card brand has its own color
- **Loading states** — skeleton screens while data loads, so the app never feels broken
- **Toast notifications** — confirmation messages for saves, deletes, and errors

---

## Supported Cards

| Card | How it's detected |
|------|-------------------|
| Discover IT Student | Recognized from statement headers and column layout |
| Chase Sapphire Preferred | Identified by Chase-specific columns in the CSV |
| Amex Blue Cash Preferred | Detected from Amex content markers |
| Visa (generic) | Fallback when no specific issuer is matched |

Adding a new card issuer is a structured process — the app has a plug-in adapter system that handles each issuer's quirks (different column names, sign conventions, category labels).

---

## Spending Categories (20)

| Category | What it covers |
|----------|---------------|
| Groceries | Supermarkets, grocery delivery |
| Dining | Restaurants, fast food, coffee shops, food delivery |
| Gas/Fuel | Gas stations |
| Entertainment | Movies, concerts, streaming, games |
| Shopping | Retail, Amazon, department stores |
| Travel | Hotels, flights, rental cars, rideshare |
| Subscriptions | Recurring digital services (Netflix, Spotify, etc.) |
| Utilities | Electric, water, gas |
| Healthcare | Doctors, pharmacy, medical bills |
| Insurance | All insurance premiums |
| Education | Tuition, books, course fees |
| Personal Care | Salon, barber, spa, cosmetics |
| Home | Furniture, home improvement, hardware stores |
| Rent | Housing rent payments |
| Phone/Internet | Mobile plans, broadband, cable |
| Government | DMV, immigration fees, government services |
| Transportation | Public transit, tolls, parking |
| Fees/Interest | Card fees, interest charges, late fees |
| Payment/Credit | Payments made, returns, statement credits |
| Other | Anything that doesn't fit above |

---

## What's Next — Roadmap Ideas

The features below are directions we're considering. They're ordered roughly by impact and feasibility, not commitment.

### Near-Term (High Impact, Buildable Now)

**Budgets & Spending Goals**
Set a monthly budget for any category — say $500 for Groceries or $200 for Dining — and see a progress bar on the dashboard showing where you stand. Get a visual warning when you're approaching or over budget.

**Month-over-Month Comparison**
Pick any two months and see a side-by-side breakdown: which categories went up, which went down, and by how much. Highlight the biggest swings so you can spot lifestyle changes.

**Duplicate Detection**
When you upload overlapping statements (e.g., a monthly and a quarterly that cover the same period), the app should flag potential duplicate transactions and let you resolve them before saving.

**AI Spending Insights**
A natural-language summary on the dashboard: "You spent 23% more on dining this month vs. your 3-month average" or "Your Uber spending has increased every month for the past 4 months." Powered by the same AI engine already in the app.

**Custom Categories**
Add your own categories beyond the built-in 20. If "Pet" or "Childcare" or "Side Hustle Expenses" matters to you, you should be able to create it and assign transactions to it.

### Medium-Term (Valuable, Needs Design)

**Bill Calendar**
A monthly calendar view showing when recurring charges are expected, based on the patterns detected by the recurring engine. Helps you plan for upcoming expenses.

**Tagging System**
Sometimes a transaction belongs to a context, not just a category. Tag transactions as "vacation," "work expense," "wedding," or anything else. Filter and total by tags for ad-hoc analysis.

**Tax-Ready Export**
At tax time, export transactions grouped by deductible categories (healthcare, education, business expenses) in a format that's easy to hand to an accountant or import into tax software.

**Year-in-Review**
An annual report page: total spent, biggest categories, top merchants, month-by-month trend, recurring costs summary, and notable spending events — all in one shareable view.

**Onboarding Flow**
A guided first-use experience: upload your first statement, see how categorization works, correct a transaction, and land on a populated dashboard — so new users aren't staring at an empty screen.

### Longer-Term (Bigger Bets)

**Bank API Integration**
Connect directly to your bank via Plaid or similar, so transactions flow in automatically without manual uploads. Keep the upload path as a fallback for privacy-conscious users.

**Household / Multi-User**
Share a household budget with a partner. Each person uploads their own cards, and you see combined dashboards and individual breakdowns. Role-based access (owner vs. viewer).

**Smart Rules Builder**
A visual UI to create and manage categorization rules: "If merchant contains 'COSTCO' and amount > $100, categorize as Groceries." Replace the need to touch regex rules by hand.

**Spending Anomaly Alerts**
Proactive notifications when something looks off: unusually large transactions, spending spikes in a category, or charges from merchants you've never used before.

**Receipt Matching**
Snap a photo of a receipt and attach it to a transaction. Useful for expense reports or warranty tracking.

---

## Principles

These guide how we build:

1. **You own your data** — no bank credentials required; upload only what you choose
2. **Human-in-the-loop** — AI assists, but you always have the final say on categorization
3. **The system learns** — every correction makes future uploads more accurate
4. **Clarity over cleverness** — the dashboard should be understandable in 5 seconds
5. **Multi-card reality** — most people have 2-4 cards; the app treats that as the default, not an edge case
