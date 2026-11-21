# Setting up accounts (Supabase)

Accounts are optional. Until the steps below are done, the site has no login button and everybody plays as a guest — nothing else changes.

What lives where:

- **Supabase Auth** — e-mail + password and Google sign-in. E-mail addresses never leave it.
- **`profiles` table** — one public row per account: username and avatar URL.
- **`avatars` bucket** — the avatar PNGs, public to read.
- **Game server** — checks a player's access token when they enter a room and reads their profile. It holds the secret key.

## 1. Create the project

1. Create a project at <https://supabase.com> (free plan, any region near your players).
2. From **Project Settings → API keys** note the **Project URL**, the **publishable** key and the **secret** key.

## 2. Auth settings

Under **Authentication**:

1. **Sign In / Providers → Email**: enabled; **Confirm email: off**; minimum password length **8**; "Secure password change" off.
   Confirmation has to be off because the free plan's built-in mailer only delivers to members of your own Supabase organization. See "Turning on e-mail later" below.
2. **Sign In / Providers → Google**: enabled, with a client id and secret from Google Cloud:
   - In <https://console.cloud.google.com> create (or pick) a project, configure the OAuth consent screen (external, app name "Scrawl"), then **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins**: `https://whaletalent.github.io` and `http://localhost:3000`.
   - **Authorized redirect URIs**: the callback URL Supabase shows on the Google provider page (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - Paste the client id and secret into Supabase.
3. **URL Configuration**: **Site URL** `https://whaletalent.github.io/scrawl/`; **Redirect URLs** `https://whaletalent.github.io/scrawl/**` and `http://localhost:3000/**`.

## 3. Database and storage

Open **SQL Editor**, paste the whole of [`supabase/migrations/0001_accounts.sql`](../supabase/migrations/0001_accounts.sql) and run it. It creates the `profiles` table, its access rules and the `avatars` bucket, and is safe to run again.

## 4. Tell the site and the game server

| Where                                                                         | Name                       | Value                               |
| ----------------------------------------------------------------------------- | -------------------------- | ----------------------------------- |
| GitHub → repository → Settings → Secrets and variables → Actions → Variables | `SUPABASE_URL`             | Project URL                         |
| same                                                                          | `SUPABASE_PUBLISHABLE_KEY` | publishable key                     |
| Render → the `scrawl-ws` service → Environment                                | `SUPABASE_URL`             | Project URL                         |
| same                                                                          | `SUPABASE_SECRET_KEY`      | **secret** key                      |

The publishable key is meant to be public (it ships in the site's JavaScript; the database rules are what protect the data). **The secret key goes only into Render.** Never put it in the repository, in a GitHub _variable_, or in `apps/web/.env.local`.

Then re-run the **Deploy to GitHub Pages** workflow (the two values are baked in at build time) and let Render redeploy. The game server logs `Accounts on (...)` when it found its two variables.

For local development put the same two public values in `apps/web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and start the game server with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in its environment.

## 5. First-run check

Do this once against the real project; the automated tests only ever talk to a fake one.

1. Create an account with an e-mail and password. No confirmation e-mail should be asked for.
2. Pick a username, draw an avatar, save. In the dashboard, `profiles` has the row (and no e-mail column) and **Storage → avatars** has `<user id>/<number>.png`.
3. Sign out and back in. Sign in with Google, on localhost and on the Pages URL.
4. Open a room in a second browser as a guest and check the avatar shows next to the username.
5. In the browser console of a signed-in tab, try to change your own username and to create a profile for another user id — both must be refused.
6. Sign in with Google using an address that already has an e-mail + password account, and write down below what Supabase does.

### Same address, e-mail and Google

_Not verified yet — fill in after step 6._ Because e-mail addresses are not confirmed, anyone can register an address they don't own. If Supabase links a later Google sign-in with that address to the existing account, the person who registered first still knows its password. In Scrawl the damage is someone else being able to use that profile. The cure is turning on confirmation (next section).

## Everyday chores

- **A player forgot their password**: Authentication → Users → the user → "Reset password" won't reach them (no mailer). Use the user's menu to set a new password by hand and send it to them yourself. Google accounts don't have this problem.
- **Remove an account**: Authentication → Users → delete the user. Their profile row goes with it; delete their folder in Storage → avatars too.
- **Remove an offensive avatar or username**: delete the profile row (the player will be asked to pick again on their next visit) and the file.
- **The project got paused**: the `Supabase keep-alive` workflow reads one row a day so this shouldn't happen. If it does, "Restore project" in the dashboard brings it back; accounts are off while it's paused and the game keeps working for guests.

## Turning on e-mail later

With a domain and an SMTP provider (Authentication → Emails → SMTP settings) you can turn **Confirm email** on and add a "forgot my password" flow. Neither exists in the app today: the sign-up form tells players there is no recovery.
