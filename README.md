# Movie Match 🍿

A Tinder-style swipe app for couples to find movies to watch together on Netflix.

## Quick Start

```bash
cd movie-match
npm install
npm start
```

Open **http://localhost:3000** on two devices (or two browser tabs).

## How It Works

1. **Create a room** — one person creates a room and gets a 4-digit code
2. **Share the code** — the other person joins with that code
3. **Swipe** — both swipe through Netflix movies (right = want to watch, left = skip)
4. **Match!** — when both swipe right on the same movie, you get a match notification 🎉
5. **Review** — check the Matches tab for all your shared picks

## TMDB API Key (Optional)

The app works out of the box with curated sample movies. For the full Netflix catalog:

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [API Settings](https://www.themoviedb.org/settings/api) and request an API key
3. Enter your key in the app's Settings tab

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS, mobile-first, touch gestures
- **Backend**: Node.js + Express + Socket.io
- **Data**: TMDB API (Netflix provider filter) with mock fallback
