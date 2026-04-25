/* Tweaks Panel for Landing Preview — expressive controls */
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "dark",
  "accent": "gold",
  "atmos": "default"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const body = document.body;
  body.setAttribute('data-mood', t.mood);
  body.setAttribute('data-accent', t.accent);
  body.setAttribute('data-atmos', t.atmos);
}

const MOOD_OPTIONS = [
  { value: 'dark',      label: 'כהה ריבוני',    sub: 'Cinematic charcoal'  },
  { value: 'editorial', label: 'עריכה שקטה',  sub: 'Cream & ink'           },
  { value: 'sand',      label: 'חם חולי',      sub: 'Desert warmth'         },
];

const ACCENT_OPTIONS = [
  { value: 'gold',   color: '#B89B5E', label: 'זהב'    },
  { value: 'copper', color: '#C97B4B', label: 'נחושת'  },
  { value: 'olive',  color: '#8A8A4E', label: 'זית'    },
  { value: 'ink',    color: '#2D4A5E', label: 'דיו'    },
  { value: 'rose',   color: '#B25A6A', label: 'ורד'    },
];

const ATMOS_OPTIONS = [
  { value: 'minimal',   label: 'נקי',       sub: 'No noise, no vignette' },
  { value: 'default',   label: 'רגיל',      sub: 'Original feel'         },
  { value: 'cinematic', label: 'קולנועי',  sub: 'Heavy grain + vignette'},
];

function LandingTweaks() {
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  const set = (key) => (value) => setTweaks({ [key]: value });

  return (
    <TweaksPanel title="Tweaks" width={320}>
      <TweakSection title="מצב רוח" subtitle="הטון הכולל של האתר">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => set('mood')(opt.value)}
              style={{
                textAlign: 'right',
                padding: '10px 12px',
                background: tweaks.mood === opt.value ? '#B89B5E' : 'rgba(255,255,255,0.04)',
                color: tweaks.mood === opt.value ? '#0a0a0a' : '#FDFBF7',
                border: `1px solid ${tweaks.mood === opt.value ? '#B89B5E' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all .25s',
                fontFamily: 'Assistant, sans-serif',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </TweakSection>

      <TweakSection title="צבע מבטא" subtitle="הגוון שמניע את הברנד">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {ACCENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => set('accent')(opt.value)}
              title={opt.label}
              style={{
                aspectRatio: '1',
                background: opt.color,
                border: `2px solid ${tweaks.accent === opt.value ? '#FDFBF7' : 'transparent'}`,
                outline: tweaks.accent === opt.value ? `1px solid ${opt.color}` : 'none',
                outlineOffset: 2,
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'transform .2s',
                transform: tweaks.accent === opt.value ? 'scale(1.06)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'rgba(253,251,247,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Assistant, sans-serif' }}>
          {ACCENT_OPTIONS.map(opt => (
            <span key={opt.value} style={{
              color: tweaks.accent === opt.value ? opt.color : 'rgba(253,251,247,0.4)',
              fontWeight: tweaks.accent === opt.value ? 700 : 400,
              fontSize: 9,
            }}>{opt.label}</span>
          ))}
        </div>
      </TweakSection>

      <TweakSection title="אטמוספרה" subtitle="רעש, וינייטה ועכבר">
        <div style={{ display: 'flex', gap: 4 }}>
          {ATMOS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => set('atmos')(opt.value)}
              style={{
                flex: 1,
                padding: '10px 6px',
                background: tweaks.atmos === opt.value ? '#B89B5E' : 'rgba(255,255,255,0.04)',
                color: tweaks.atmos === opt.value ? '#0a0a0a' : '#FDFBF7',
                border: `1px solid ${tweaks.atmos === opt.value ? '#B89B5E' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Assistant, sans-serif',
                transition: 'all .25s',
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(253,251,247,0.5)', marginTop: 8, textAlign: 'right', fontFamily: 'Assistant, sans-serif', letterSpacing: '0.05em' }}>
          {ATMOS_OPTIONS.find(o => o.value === tweaks.atmos)?.sub}
        </div>
      </TweakSection>
    </TweaksPanel>
  );
}

// Apply defaults immediately so URL-shared state is live before mount
applyTweaks(TWEAK_DEFAULTS);

const tweaksRoot = document.getElementById('tweaks-root');
if (tweaksRoot) {
  ReactDOM.createRoot(tweaksRoot).render(<LandingTweaks />);
}
