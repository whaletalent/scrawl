import { createScrawlServer } from "./app.js";
import { setAccounts } from "./accounts.js";
import { createSupabaseAccounts } from "./supabase-accounts.js";

const PORT = Number(process.env.PORT) || 8080;

// Accounts need a Supabase project; without one everybody plays as a guest.
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
  setAccounts(
    createSupabaseAccounts({
      url: SUPABASE_URL,
      secretKey: SUPABASE_SECRET_KEY,
    }),
  );
  console.log(`Accounts on (${SUPABASE_URL})`);
} else {
  console.log("Accounts off (SUPABASE_URL / SUPABASE_SECRET_KEY not set)");
}

createScrawlServer().server.listen(PORT, () => {
  console.log(`Scrawl WebSocket server running on port ${PORT}`);
});
