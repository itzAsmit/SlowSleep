# SlowSleep design system

## Direction

**A quiet room at the edge of sleep.** SlowSleep uses a dark botanical night panel against a warm mineral paper surface. The visual language is editorial and tactile, with generous breathing room, thin rules, soft green, and one warm coral signal for energy. OpenRouter is presented as a quiet optional provider, never as an alarming setup task.

## Tokens

- Ink: `#152522`
- Night: `#183431`
- Deep night: `#112624`
- Paper: `#F3F4EE`
- Paper bright: `#FBFCF7`
- Mint: `#D9E7D6`
- Coral: `#E19B78`
- Muted ink: `#53655D`
- Hairline: `#DCE2D9`

## Typography

- Interface: system sans stack for reliable offline rendering.
- Display and story copy: Georgia / Times fallback for a literary, unhurried voice.
- Eyebrows: compact uppercase sans with generous tracking.

## Layout

- Desktop uses a two-column ritual surface: expressive welcome panel on the left, task panel on the right.
- Controls are grouped into one clear ritual card with a story/soundscape switch.
- Outputs sit below the ritual and inherit the dark night or mint surfaces.
- Mobile collapses into a single column while preserving the same order: welcome, ritual, output, promise.

## Interaction rules

- Use full-width primary actions with one clear verb.
- Selected states use mint fill and a visible border, not color alone.
- Keep status copy short and reassuring.
- Treat provider state as a small trust detail: server-side key, no browser secret, graceful local fallback.
- Motion personality: an exhale — slightly slower than typical UI, never bouncy. Press feedback stays fast (160ms, scale 0.97–0.98); state changes use 220–340ms with soft custom easings (`cubic-bezier(0.23,1,0.32,1)` out, `cubic-bezier(0.32,0.72,0,1)` for the mode-switch thumb).
- Entrances are staggered fade-and-rise (40–60ms steps, under 300ms total delay); the story surface enters with a gentle blur-to-clear.
- Hover transforms only apply under `@media (hover: hover) and (pointer: fine)`; every pressable control has an `:active` scale.
- `prefers-reduced-motion` swaps movement for opacity-only fades; the breathing bars keep an opacity pulse.
