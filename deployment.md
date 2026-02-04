# Deployment Guide: SocialSync to Vercel

SocialSync is production-ready. Follow these steps to deploy it live on the internet.

## 1. Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name it `social-sync`.
3. Keep it **Public** (or private if you prefer, but Public is easier for sharing).
4. Click **Create repository**.

## 2. Push Local Code to GitHub
Open your terminal in the `social-sync` folder and run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/social-sync.git
git branch -M main
git push -u origin main
```
*(Replace `YOUR_USERNAME` with your actual GitHub username)*

## 3. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** -> **Project**.
3. Import your `social-sync` repository.
4. **Environment Variables**: Expand the "Environment Variables" section and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: (Copy from your local `.env.local`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Copy from your local `.env.local`)
5. Click **Deploy**.

## 4. Final Step: Supabase Redirects
Once deployed, Vercel will give you a URL (e.g., `https://social-sync.vercel.app`).
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** -> **URL Configuration**.
3. Update **Site URL** to your Vercel URL.
4. Add your Vercel URL to **Redirect URIs** (e.g., `https://social-sync.vercel.app/**`).

> [!TIP]
> After deployment, you can invite people by sharing your Vercel URL. They can sign up and you can invite them to your circle using their email!
