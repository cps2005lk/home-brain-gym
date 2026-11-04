# Google sign-in setup (Milestone 5b)

Only the **parent** signs in. Kids never log in - they are rows under your
family. You do this once, in two browser tabs: Google Cloud and Supabase.
About 10 minutes. Everything here is free.

## Part 1 - Supabase: copy the callback URL

1. Supabase dashboard → **Authentication** → **Sign In / Providers** → **Google**.
2. Turn it on. Near the bottom you will see a **Callback URL (for OAuth)**:

   ```
   https://dcrijjdfkecvtvwxvfkg.supabase.co/auth/v1/callback
   ```

3. Copy it. Leave this tab open - you come back in Part 3.

## Part 2 - Google Cloud: make the OAuth client

1. Go to <https://console.cloud.google.com> and sign in with the Google account
   you want to use as the parent account.
2. Top left, next to the Google Cloud logo, open the project picker →
   **New project**. Name it `home-brain-gym`. Create, then make sure it is the
   selected project.
3. Left menu → **APIs & Services** → **OAuth consent screen**. Google renamed
   this area to **Google Auth Platform** in 2025, so you now see either a
   **Get started** button or four pages: _Branding_, _Audience_, _Data access_,
   _Clients_.

   **If you see "Get started"**, the wizard has four steps:
   1. _App Information_: app name `Home Brain Gym`, your support email
   2. _Audience_: choose **External** (with a normal Gmail account this is the
      only choice; **Internal** is only for Google Workspace companies)
   3. _Contact Information_: your email
   4. _Finish_ → Create

   **If the wizard is already done**, the same settings live in the left menu:

   | Page            | What to set                           |
   | --------------- | ------------------------------------- |
   | **Branding**    | app name, support email               |
   | **Audience**    | External, and the **Test users** list |
   | **Data access** | the scopes below                      |
   | **Clients**     | the OAuth client below                |

4. **Data access** → **Add or remove scopes** → tick these three, then Update
   and Save:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. **Audience** → **Test users** → **Add users** → add your own Google address.
   While the app is unpublished, only the addresses listed here can sign in.
   That is exactly what we want: one family. You never need Google's
   verification review.
6. **Clients** → **Create client** → type **Web application**. Name it
   `home-brain-gym web`.
   - **Authorised JavaScript origins** → Add URI:
     ```
     http://localhost:5173
     ```
   - **Authorised redirect URIs** → Add URI: the Supabase callback URL from
     Part 1:
     ```
     https://dcrijjdfkecvtvwxvfkg.supabase.co/auth/v1/callback
     ```
   - **Create**. Google shows a **Client ID** and a **Client secret**. Keep the
     window open.

> The redirect URI goes to **Supabase**, not to our app. Google sends the user
> back to Supabase, Supabase checks everything and then sends them on to us.
> That is why the client secret can live in Supabase and never in our code.

## Part 3 - Back in Supabase: paste the two values

1. In the Google provider page: paste **Client ID** and **Client Secret** → **Save**.
2. Go to **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs** → Add URL: `http://localhost:5173/**`

   (When we deploy to Vercel in Milestone 10 we add the real address here and
   in Google's "Authorised JavaScript origins". Nothing else changes.)

## When you are finished

Tell me, and I will add the sign-in screen. You should end up with:

- Google provider: **enabled**, with client id and secret saved
- Your own Google address listed as a test user
- Site URL and redirect URL pointing at `http://localhost:5173`

## If something goes wrong later

| Message                                    | What it usually means                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch`                    | The URI in Google's **Authorised redirect URIs** is not character-for-character the Supabase callback URL |
| `Access blocked: app not verified`         | The signing-in address is not in the test users list                                                      |
| Sign-in works but the app stays logged out | The address is missing from Supabase → **URL Configuration → Redirect URLs**                              |
