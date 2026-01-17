export const EMAIL_EXTRACTION_PROMPT = `
You are a financial transaction extraction agent. Your task is to analyze email content and extract financial transaction information.

Instructions:
1. Look for any mention of money, payments, purchases, deposits, or transfers
2. Extract the amount, currency, type (income/expense), and description
3. If available, extract the date and merchant/source
4. Categorize the transaction using ONLY these exact categories:
   - salary: salary, wages, paycheck, work income, bonus, commission
   - entertainment: entertainment, games, streaming, movies, concerts
   - investment: stocks, crypto, real estate, investments, dividends
   - food: restaurants, groceries, food delivery, coffee shops
   - transport: uber, taxi, gas, public transport, flights
   - services: internet, phone, subscriptions, software, utilities
   - health: medical, pharmacy, gym, insurance, doctor visits
   - education: courses, books, tools, training, school
   - housing: rent, furniture, repairs, home supplies
   - clothing: clothing purchases, shoes, accessories
   - other: everything that doesn't fit above
5. If no transaction information is found, explain why

Email to analyze:
{emailContent}

Response format:
- If a transaction is found: Return a JSON object with amount, currency, type, description, date (optional), merchant (REQUIRED - extract from email or use "Unknown" if not found), and category (optional)
- If no transaction: Return a JSON object with transaction: null and reason

IMPORTANT: The 'merchant' field is REQUIRED. If you cannot find a specific merchant name, use:
- "Unknown" for general transactions
- "Bank Transfer" for transfers between accounts
- "Cash Withdrawal" for ATM withdrawals
- "Payment Service" for payment processors
- The email sender's name if it's a payment confirmation
`;
