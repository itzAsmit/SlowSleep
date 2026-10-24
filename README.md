# SlowSleep

SlowSleep is a privacy-conscious bedtime companion. Pick a mood, a setting, and a few quiet minutes; choose between a calm story written through OpenRouter or a browser-native ambient soundscape. Stories fall back to a built-in demo, and soundscapes always stay in the browser.

## Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Without an OpenRouter key, the app shows a built-in demo story so the interface can still be explored. Soundscapes are generated locally in the browser with the Web Audio API.

## Enable OpenRouter stories

1. Copy `.env.example` to `.env`.
2. Add your server-only key:

   ```dotenv
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```

3. Restart `npm run dev`, then use **Write my gentle story** in SlowSleep.

The browser calls the local `/api/story` endpoint. The server calls OpenRouter with `OPENROUTER_API_KEY`; the key is never sent to the browser or bundled into `dist`. If OpenRouter is unavailable or unconfigured, the UI falls back to a built-in story.

## Challenge angle

SlowSleep is built for the Hacktoberfest Open-Source AI Challenge theme, “Slow and Steady.” It keeps the ritual calm and local by default while making cloud model access explicit, optional, and server-side.
