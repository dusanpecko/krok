const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from app/.env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function clearMayTransactions() {
  console.log("=== CLEANSING MAY 2026 TRANSACTIONS FROM DATABASE ===");
  
  const startDate = "2026-05-01";
  const endDate = "2026-05-31";

  // 1. Získame zoznam ID transakcií za máj
  const { data: txs, error: fetchError } = await supabaseAdmin
    .from('bank_transactions')
    .select('id, entry_ref, import_batch_id')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate);

  if (fetchError) {
    console.error("Failed to fetch May transactions:", fetchError);
    return;
  }

  console.log(`Found ${txs?.length || 0} transactions in May 2026.`);

  if (!txs || txs.length === 0) {
    console.log("No transactions to delete. Your database is already clean for May 2026!");
    return;
  }

  const txIds = txs.map(t => t.id);
  const batchIds = [...new Set(txs.map(t => t.import_batch_id).filter(id => id !== null))];

  // 2. Vymažeme závislé dary (donations) pre tieto transakcie
  const { error: donationDeleteError } = await supabaseAdmin
    .from('donations')
    .delete()
    .in('bank_transaction_id', txIds);

  if (donationDeleteError) {
    console.error("Failed to delete donations:", donationDeleteError);
    return;
  }
  console.log("Deleted corresponding donations records successfully.");

  // 3. Vymažeme samotné transakcie z bank_transactions
  const { error: txDeleteError } = await supabaseAdmin
    .from('bank_transactions')
    .delete()
    .in('id', txIds);

  if (txDeleteError) {
    console.error("Failed to delete transactions:", txDeleteError);
    return;
  }
  console.log("Deleted bank transactions successfully.");

  // 4. Vymažeme prázdne importné dávky (batches)
  if (batchIds.length > 0) {
    const { error: batchDeleteError } = await supabaseAdmin
      .from('bank_import_batches')
      .delete()
      .in('id', batchIds);

    if (batchDeleteError) {
      console.warn("Could not delete some import batches (they might still contain other transactions):", batchDeleteError.message);
    } else {
      console.log("Deleted empty import batches successfully.");
    }
  }

  console.log("\n✅ May 2026 data successfully removed from your database! You are ready to re-test the live API sync.");
}

clearMayTransactions();
