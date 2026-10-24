import { useEffect, useRef, useState } from 'react'
import './App.css'

const moods = [
  { label: 'Peaceful', note: 'Already soft', glyph: '✦' },
  { label: 'Worn out', note: 'Ready to let go', glyph: '◒' },
  { label: 'Restless', note: 'Needs a little space', glyph: '∿' },
  { label: 'Hopeful', note: 'Carrying something good', glyph: '✧' },
]

const places = ['Moonlit forest', 'Rainy cabin', 'Quiet ocean', 'Cloud garden']
const lengths = ['2 min', '5 min', '10 min']
const soundPresets = [
  { id: 'rain', label: 'Rain hush', note: 'soft texture', glyph: '∿', frequency: 146, filter: 1200, noise: 0.11 },
  { id: 'night', label: 'Night air', note: 'low and open', glyph: '◌', frequency: 174, filter: 700, noise: 0.07 },
  { id: 'room', label: 'Warm room', note: 'deep and steady', glyph: '◒', frequency: 110, filter: 420, noise: 0.05 },
]

const demoStory = (name, mood, place, length) => {
  const listener = name?.trim() || 'you'
  const endings = {
    Peaceful: 'The quiet was not asking anything from you. It was simply there, warm and steady, making room for sleep.',
    'Worn out': 'You did not need to carry the day any further. The path could wait until morning, and so could everything else.',
    Restless: 'One thought drifted by, then another. None of them needed an answer tonight. They could float on without you.',
    Hopeful: 'Somewhere beyond the dark, morning was already becoming. For now, it was enough to rest inside this gentle pause.',
  }

  return `Tonight, ${listener} found a small path leading toward a ${place.toLowerCase()}. Nothing on the path needed to be rushed. The air was cool and kind, and every quiet sound seemed to say: there is time.

With each unhurried step, the day became lighter. A little ${mood.toLowerCase()} feeling settled beside the path, no longer something to solve, just something to hold gently for a while.

${endings[mood]} This is your ${length.toLowerCase()} to arrive, soften, and rest.`
}

function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <path d="M5 12h13m-6-6 6 6-6 6" />,
    moon: <path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5 8.5 8.5 0 1 0 20.5 14.7Z" />,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    sparkle: <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6.5 12.5.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />,
    shield: <><path d="M12 21s7-3.5 7-9.5V5l-7-3-7 3v6.5C5 17.5 12 21 12 21Z" /><path d="m9 12 2 2 4-4" /></>,
    volume: <><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" /></>,
    leaf: <path d="M20 4C10 4 4 8.5 4 15a5 5 0 0 0 5 5c6.5 0 11-6 11-16ZM4 20c2.5-4.5 6-7.5 11-10" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }

  return (
    <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function App() {
  const [mode, setMode] = useState('story')
  const [mood, setMood] = useState('Peaceful')
  const [place, setPlace] = useState('Moonlit forest')
  const [length, setLength] = useState('5 min')
  const [name, setName] = useState('')
  const [story, setStory] = useState('')
  const [storySource, setStorySource] = useState('fallback')
  const [loading, setLoading] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [soundPreset, setSoundPreset] = useState('rain')
  const [soundVolume, setSoundVolume] = useState(0.48)
  const [note, setNote] = useState('Ready when you are.')
  const [soundMessage, setSoundMessage] = useState('A low, local soundscape for the last few minutes of your day.')
  const audioRef = useRef(null)

  const scrollToRitual = () => document.querySelector('#ritual')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const stopSoundscape = () => {
    const current = audioRef.current
    if (!current) return

    current.nodes.forEach((node) => {
      try {
        node.stop?.()
        node.disconnect?.()
      } catch {
        // Nodes may already be stopped by the browser.
      }
    })
    current.context.close().catch(() => {})
    audioRef.current = null
    setSoundOn(false)
  }

  useEffect(() => () => {
    const current = audioRef.current
    if (!current) return
    current.nodes.forEach((node) => {
      try { node.stop?.() } catch { /* already stopped */ }
    })
    current.context.close().catch(() => {})
  }, [])

  const toggleSoundscape = async () => {
    if (soundOn) {
      stopSoundscape()
      setSoundMessage('The room is quiet again. Nothing else is required tonight.')
      return
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      setSoundMessage('Soundscapes are not supported in this browser, but the rest of SlowSleep still works offline.')
      return
    }

    const context = new AudioContextClass()
    const preset = soundPresets.find((item) => item.id === soundPreset) || soundPresets[0]

    try {
      await context.resume()
      const master = context.createGain()
      const now = context.currentTime
      master.gain.setValueAtTime(0, now)
      master.gain.linearRampToValueAtTime(0.2 * soundVolume, now + 1.5)
      master.connect(context.destination)

      const tone = context.createOscillator()
      const toneGain = context.createGain()
      tone.type = 'sine'
      tone.frequency.value = preset.frequency
      toneGain.gain.value = 0.42
      tone.connect(toneGain).connect(master)

      const drift = context.createOscillator()
      const driftGain = context.createGain()
      drift.type = 'sine'
      drift.frequency.value = 0.08
      driftGain.gain.value = 4
      drift.connect(driftGain).connect(tone.frequency)

      const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
      const noiseData = noiseBuffer.getChannelData(0)
      let noiseSeed = 0x12345678
      for (let index = 0; index < noiseData.length; index += 1) {
        noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0
        noiseData[index] = ((noiseSeed / 4294967295) * 2 - 1) * 0.5
      }
      const noise = context.createBufferSource()
      const filter = context.createBiquadFilter()
      const noiseGain = context.createGain()
      noise.buffer = noiseBuffer
      noise.loop = true
      filter.type = 'lowpass'
      filter.frequency.value = preset.filter
      noiseGain.gain.value = preset.noise
      noise.connect(filter).connect(noiseGain).connect(master)

      tone.start()
      drift.start()
      noise.start()
      audioRef.current = { context, master, nodes: [tone, drift, noise] }
      setSoundOn(true)
      setSoundMessage(`${preset.label} is playing softly in this tab. If you still hear nothing, check your device volume.`)
    } catch {
      context.close().catch(() => {})
      setSoundMessage('Audio could not start in this browser. Try pressing Play once more or check that this tab is not muted.')
    }
  }

  const handleSoundVolumeChange = (event) => {
    const nextVolume = Number(event.target.value)
    setSoundVolume(nextVolume)
    const master = audioRef.current?.master
    if (master) {
      master.gain.cancelScheduledValues(audioRef.current.context.currentTime)
      master.gain.setTargetAtTime(0.2 * nextVolume, audioRef.current.context.currentTime, 0.08)
    }
  }

  const handleSoundPresetChange = (nextPreset) => {
    if (soundOn) stopSoundscape()
    setSoundPreset(nextPreset)
    const preset = soundPresets.find((item) => item.id === nextPreset)
    setSoundMessage(`${preset?.label || 'Soundscape'} is ready when you are.`)
  }

  const handleModeChange = (nextMode) => {
    if (soundOn) stopSoundscape()
    setMode(nextMode)
    setNote(nextMode === 'story' ? 'Ready when you are.' : 'A soundscape can stay with you while you settle in.')
  }

  async function generateStory(event) {
    event.preventDefault()
    setLoading(true)
    setNote('Writing with OpenRouter…')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    const showFallback = (message) => {
      setStory(demoStory(name, mood, place, length))
      setStorySource('fallback')
      setNote(message)
    }

    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, place, length, name }),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'cloud')
      const text = data?.story?.trim()
      if (!text) throw new Error('empty')
      setStory(text)
      setStorySource('openrouter')
      setNote(`Written through OpenRouter${data.model ? ` · ${data.model}` : ''}.`)
    } catch (error) {
      const cloudNotes = {
        openrouter_not_configured: 'OpenRouter is not configured on the server. Showing the built-in demo.',
        invalid_request: 'That ritual needs a quick reset. Showing the built-in demo for now.',
        rate_limited: 'OpenRouter is taking a breath. Showing the built-in demo — try again in a moment.',
        upstream_unauthorized: 'OpenRouter rejected the server key. Showing the built-in demo.',
        upstream_credits: 'The OpenRouter account needs credits for this model. Showing the built-in demo.',
        upstream_unavailable: 'OpenRouter is unavailable right now. Showing the built-in demo.',
        empty: 'That model returned nothing. Showing the built-in demo.',
      }
      showFallback(error.name === 'AbortError' ? 'OpenRouter took too long. Showing the built-in demo.' : cloudNotes[error.message] || 'OpenRouter was unreachable. Showing the built-in demo.')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="wordmark" href="#top" aria-label="SlowSleep home">
          <span className="wordmark-mark"><Icon name="moon" size={17} /></span>
          <span>slowsleep</span>
        </a>
        <div className="header-actions">
          <span className="local-status"><span className="status-dot" /> OpenRouter optional</span>
          <button className="header-link" type="button" onClick={scrollToRitual}>Your ritual <Icon name="arrow" size={15} /></button>
        </div>
      </header>

      <div className="page-grid" id="top">
        <section className="welcome-panel" aria-labelledby="welcome-title">
          <div className="welcome-orbit" aria-hidden="true">
            <span className="orbit-line orbit-line-one" />
            <span className="orbit-line orbit-line-two" />
            <span className="orbit-star star-one">✦</span>
            <span className="orbit-star star-two">·</span>
            <div className="moon-disc"><Icon name="moon" size={40} /></div>
          </div>
          <div className="welcome-content">
            <p className="eyebrow eyebrow-light">An offline bedtime companion</p>
            <h1 id="welcome-title">Make room<br /><em>for rest.</em></h1>
            <p className="welcome-copy">A small ritual for the space between today and tomorrow. Soundscapes stay local; stories can borrow a little help from OpenRouter.</p>
            <button className="button button-light" type="button" onClick={scrollToRitual}>Begin winding down <Icon name="arrow" size={17} /></button>
            <div className="trust-line"><Icon name="shield" size={17} /><span>No account · No tracking · No pressure</span></div>
          </div>
          <div className="welcome-footer-note"><span>01</span><span>slow is a setting</span></div>
        </section>

        <section className="ritual-panel" id="ritual" aria-labelledby="ritual-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Settle in</p>
              <h2 id="ritual-title">Tonight's ritual</h2>
            </div>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Choose your ritual" data-mode={mode}>
            <span className="mode-thumb" aria-hidden="true" />
            <button className={mode === 'story' ? 'mode-tab active' : 'mode-tab'} type="button" role="tab" aria-selected={mode === 'story'} onClick={() => handleModeChange('story')}>
              <span className="mode-icon"><Icon name="sparkle" size={17} /></span>
              <span><strong>Gentle story</strong><small>OpenRouter, when ready</small></span>
            </button>
            <button className={mode === 'soundscape' ? 'mode-tab active' : 'mode-tab'} type="button" role="tab" aria-selected={mode === 'soundscape'} onClick={() => handleModeChange('soundscape')}>
              <span className="mode-icon"><Icon name="volume" size={17} /></span>
              <span><strong>Soundscape</strong><small>Always local to this tab</small></span>
            </button>
          </div>

          <form className="ritual-form" onSubmit={generateStory}>
            <fieldset className="field-block">
              <legend>How are you arriving?</legend>
              <div className="mood-grid">
                {moods.map((item) => (
                  <button className={mood === item.label ? 'mood-option selected' : 'mood-option'} type="button" key={item.label} onClick={() => setMood(item.label)} aria-pressed={mood === item.label}>
                    <span className="mood-glyph">{item.glyph}</span>
                    <span className="mood-label">{item.label}</span>
                    <span className="mood-note">{item.note}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="select-row">
              <label className="field-block">
                <span className="field-label">Place</span>
                <span className="select-wrap"><select value={place} onChange={(event) => setPlace(event.target.value)}>{places.map((item) => <option key={item}>{item}</option>)}</select><span className="select-chevron">⌄</span></span>
              </label>
              <label className="field-block">
                <span className="field-label">A little time</span>
                <span className="select-wrap"><select value={length} onChange={(event) => setLength(event.target.value)}>{lengths.map((item) => <option key={item}>{item}</option>)}</select><span className="select-chevron">⌄</span></span>
              </label>
            </div>

            {mode === 'soundscape' && (
              <fieldset className="field-block sound-field">
                <legend>Choose a room tone</legend>
                <div className="sound-presets">
                  {soundPresets.map((preset) => (
                    <button className={soundPreset === preset.id ? 'sound-preset selected' : 'sound-preset'} type="button" key={preset.id} onClick={() => handleSoundPresetChange(preset.id)} aria-pressed={soundPreset === preset.id}>
                      <span className="sound-preset-glyph">{preset.glyph}</span>
                      <span><strong>{preset.label}</strong><small>{preset.note}</small></span>
                    </button>
                  ))}
                </div>
                <label className="volume-control"><span><span className="field-label">Volume</span><small>{Math.round(soundVolume * 100)}%</small></span><input type="range" min="0" max="1" step="0.01" value={soundVolume} onChange={handleSoundVolumeChange} aria-label="Soundscape volume" /></label>
              </fieldset>
            )}

            {mode === 'story' && <label className="field-block name-field"><span className="field-label">A name for the story <small>optional</small></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Anya" /></label>}

            {mode === 'story' && (
              <div className="provider-card">
                <div className="provider-mark"><Icon name="sparkle" size={15} /></div>
                <div className="provider-copy"><strong>OpenRouter story engine</strong><span>Server-side key · no browser secret · built-in fallback</span></div>
                <span className="provider-badge">optional</span>
              </div>
            )}

            {mode === 'story' ? (
              <button className="button button-dark action-button" type="submit" disabled={loading}>{loading ? 'Gathering a little calm…' : 'Write my gentle story'}<Icon name="sparkle" size={17} /></button>
            ) : (
              <button className={soundOn ? 'button button-dark action-button playing' : 'button button-dark action-button'} type="button" onClick={toggleSoundscape}>{soundOn ? 'Pause soundscape' : 'Play soundscape'}<Icon name={soundOn ? 'pause' : 'play'} size={17} /></button>
            )}
            <p className="form-note"><span className="note-check"><Icon name="check" size={13} /></span>{mode === 'story' ? 'Your key stays on the server. Falls back to a built-in story.' : 'Generated with the Web Audio API. Nothing leaves this tab.'}</p>
          </form>
        </section>
      </div>

      {mode === 'story' && story && <section className="story-output" aria-live="polite" aria-labelledby="story-title">
        <div className="output-header">
          <div><p className="eyebrow">A little place to land</p><h2 id="story-title">{place} <span>·</span> {length}</h2></div>
          <div className="output-actions"><span className="output-status"><span className="status-dot" /> {storySource === 'openrouter' ? 'OpenRouter · server-side' : 'Built-in fallback · local'}</span><button className={soundOn ? 'text-button active' : 'text-button'} type="button" onClick={toggleSoundscape}><Icon name={soundOn ? 'pause' : 'volume'} size={15} /> {soundOn ? 'Pause ambience' : 'Add ambience'}</button></div>
        </div>
        <div className="story-body"><p>{story}</p></div>
        <div className="story-footer"><span>{note}</span><span>Read slowly. There is nowhere else to be.</span></div>
      </section>}

      {mode === 'soundscape' && <section className={soundOn ? 'sound-output playing' : 'sound-output'} aria-live="polite">
        <div className="sound-visual" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="sound-copy"><p className="eyebrow">{soundPresets.find((preset) => preset.id === soundPreset)?.label || 'Room tone'}</p><h2>{soundOn ? 'The room is getting quieter.' : 'A quieter room, on demand.'}</h2><p>{soundMessage}</p></div>
        <div className="sound-meta"><span><Icon name="clock" size={15} /> {length}</span><span><Icon name="leaf" size={15} /> {place}</span></div>
      </section>}

      <section className="principles" id="how-it-works" aria-label="Why SlowSleep">
        <div className="principles-intro"><p className="eyebrow">The slower promise</p><h2>Less input.<br /><em>More exhale.</em></h2></div>
        <div className="principle-list">
          <article><span>01</span><div><h3>Clear about privacy</h3><p>Soundscapes stay in the browser. Stories use the server-side provider only when you choose to write one.</p></div></article>
          <article><span>02</span><div><h3>Small enough to use</h3><p>Choose a feeling, choose a place, and let the rest of the evening be simple.</p></div></article>
          <article><span>03</span><div><h3>Nothing to finish</h3><p>There is no streak to protect and no next step to optimize. Just a softer ending.</p></div></article>
        </div>
      </section>

      <footer className="app-footer"><span className="footer-brand"><span className="wordmark-mark"><Icon name="moon" size={14} /></span>slowsleep</span><span>Local sound · OpenRouter stories · Made for slower evenings</span><a href="#top">Back to top <Icon name="arrow" size={14} /></a></footer>
    </main>
  )
}

export default App
