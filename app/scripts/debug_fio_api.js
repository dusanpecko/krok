const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from app/.env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function debugFio() {
  const token = process.env.FIO_API_TOKEN;
  console.log("Token from env:", token ? `${token.substring(0, 10)}... (length: ${token.length})` : "MISSING");
  
  if (!token) {
    console.error("FIO_API_TOKEN is not defined in .env.local");
    return;
  }

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatDate = (date) => date.toISOString().split('T')[0];
  const dateFrom = formatDate(thirtyDaysAgo);
  const dateTo = formatDate(today);

  const url = `https://fioapi.fio.cz/v1/rest/periods/${token}/${dateFrom}/${dateTo}/transactions.json`;
  console.log("Request URL:", url.replace(token, "[TOKEN_REDACTED]"));

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log("Response Status:", response.status, response.statusText);
    console.log("Response Headers:");
    response.headers.forEach((val, key) => {
      console.log(`  ${key}: ${val}`);
    });

    const text = await response.text();
    console.log("\nResponse Body (truncated to 1000 chars):");
    console.log(text.substring(0, 1000));
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

debugFio();
