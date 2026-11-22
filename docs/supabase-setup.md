# Setting up accounts (Supabase)

Accounts are optional. Until the steps below are done, the site has no login button and everybody plays as a guest — nothing else changes.

What lives where:

- **Supabase Auth** — e-mail + password and Google sign-in. E-mail addresses never leave it.
- **`profiles` table** — one public row per account: username and avatar URL.
- **`avatars` bucket** — the avatar PNGs, public to read.
- **`drawings` table and `gallery` bucket** — the public gallery: one row and one PNG per saved drawing. Only the game server writes them; an author or whoever saved a drawing can remove it.
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
   - Paste the client id and secret into Supabase — or, with the CLI linked (section 3), export them and push: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=… SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=… supabase config push` (`supabase/config.toml` reads both from the environment; never write them into the file).
   - The site asks the project whether Google is on (`/auth/v1/settings`) and only shows "Entrar com Google" when it is, so until this step is done the login page simply offers e-mail.
3. **URL Configuration**: **Site URL** `https://whaletalent.github.io/scrawl/`; **Redirect URLs** `https://whaletalent.github.io/scrawl/**` and `http://localhost:3000/**`.

## 3. Database and storage

Open **SQL Editor**, paste the whole of [`supabase/migrations/0001_accounts.sql`](../supabase/migrations/0001_accounts.sql) and run it, then do the same with [`0002_gallery.sql`](../supabase/migrations/0002_gallery.sql). The first creates the `profiles` table, its access rules and the `avatars` bucket; the second the `drawings` table and the `gallery` bucket. Both are safe to run again.

With the Supabase CLI logged in (`supabase login`, then `supabase link --project-ref <ref>`) the same can be done from the repository: `supabase db query --linked -f supabase/migrations/0001_accounts.sql` (and `0002_gallery.sql`), and `supabase config push` applies the auth settings of step 2.1 and 2.3 from [`supabase/config.toml`](../supabase/config.toml). The CLI prints the secret key masked — copy that one from the dashboard (**Secret keys**, starts with `sb_secret_`; the one starting with `sb_publishable_` is the public key).

The migrations spell out every table privilege themselves: a new project gives the API roles nothing on a table created by SQL, so without those `grant` lines every read answers "permission denied".

## 4. Tell the site and the game server

| Where                                                                         | Name                       | Value                               |
| ----------------------------------------------------------------------------- | -------------------------- | ----------------------------------- |
| GitHub → repository → Settings → Secrets and variables → Actions → Variables | `SUPABASE_URL`             | Project URL                         |
| same                                                                          | `SUPABASE_PUBLISHABLE_KEY` | publishable key                     |
| Render → the `scrawl-ws` service → Environment                                | `SUPABASE_URL`             | Project URL                         |
| same                                                                          | `SUPABASE_SECRET_KEY`      | **secret** key                      |

The publishable key is meant to be public (it ships in the site's JavaScript; the database rules are what protect the data). **The secret key goes only into Render.** Never put it in the repository, in a GitHub _variable_, or in `apps/web/.env.local`.

Then re-run the **Deploy to GitHub Pages** workflow (the two values are baked in at build time) and let Render redeploy. The game server logs `Accounts on (...)` when it found its two variables. If players with accounts still show up as guests, its log says why (`[accounts] player treated as a guest: …`): a signature or issuer error means `SUPABASE_URL` isn't exactly the Project URL or the project doesn't use asymmetric JWT signing keys; `HTTP 401` reading profiles means the secret key is wrong.

For local development put the same two public values in `apps/web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and start the game server with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in its environment. A git-ignored `apps/ws-server/.env.local` holding those two lines works: `set -a; . apps/ws-server/.env.local; set +a` before `npm run dev`.

## 5. First-run check

Do this once against the real project; the automated tests only ever talk to a fake one.

1. Create an account with an e-mail and password. No confirmation e-mail should be asked for.
2. Pick a username, draw an avatar, save. In the dashboard, `profiles` has the row (and no e-mail column) and **Storage → avatars** has `<user id>/<number>.png`.
3. Sign out and back in. Sign in with Google, on localhost and on the Pages URL.
4. Open a room in a second browser as a guest and check the avatar shows next to the username.
5. In the browser console of a signed-in tab, try to change your own username and to create a profile for another user id — both must be refused.
6. Play a two-player game to the end with two accounts, press "Salvar na galeria", and check the drawing shows on the home and on the gallery page. From the other account's profile, remove it, then look in the dashboard, not only at the page: the row must be gone from `drawings` **and the file from Storage → gallery**. (If the page says "Não deu para remover", the storage delete policy isn't letting the author delete the file.) From a third account, confirm there is nothing to remove.
7. Sign in with Google using an address that already has an e-mail + password account, and write down below what Supabase does.

### Same address, e-mail and Google

_Not verified yet — fill in after step 7._ Because e-mail addresses are not confirmed, anyone can register an address they don't own. If Supabase links a later Google sign-in with that address to the existing account, the person who registered first still knows its password. In Scrawl the damage is someone else being able to use that profile. The cure is turning on confirmation (next section).

## Everyday chores

- **A player forgot their password**: Authentication → Users → the user → "Reset password" won't reach them (no mailer). Use the user's menu to set a new password by hand and send it to them yourself. Google accounts don't have this problem.
- **Remove an account**: Authentication → Users → delete the user. Their profile row goes with it; delete their folder in Storage → avatars too.
- **Remove a drawing from the gallery**: delete its row in `drawings` and the file named in its `image_path` in Storage → gallery.
- **The gallery is filling up** (1 GB on the free plan): saves start failing with a plain message; delete old rows and their files. Nothing is pruned automatically.
- **Remove an offensive avatar or username**: delete the profile row (the player will be asked to pick again on their next visit) and the file.
- **The project got paused**: the `Supabase keep-alive` workflow reads one row a day so this shouldn't happen. If it does, "Restore project" in the dashboard brings it back; accounts are off while it's paused and the game keeps working for guests.

## Turning on e-mail later

With a domain and an SMTP provider (Authentication → Emails → SMTP settings) you can turn **Confirm email** on and add a "forgot my password" flow. Neither exists in the app today: the sign-up form tells players there is no recovery.
