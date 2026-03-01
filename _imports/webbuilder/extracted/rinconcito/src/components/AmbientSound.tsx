import React, { useState, useRef, useCallback } from 'react';
import { Music, VolumeX } from 'lucide-react';

// Bb major pentatonic (Shire-like warmth)
const MELODY_NOTES = [233.08, 261.63, 293.66, 349.23, 392.00, 466.16, 523.25, 392.00, 349.23, 293.66, 261.63, 233.08];
const MELODY_DUR   = [1.2, 0.6, 0.8, 1.4, 0.6, 1.0, 1.6, 0.8, 1.0, 0.7, 1.2, 1.5];
const PAD_FREQS    = [116.54, 146.83, 174.61, 233.08];

interface ShireAudio { masterGain: GainNode; stopAll: () => void; }

function buildShireAmbience(ctx: AudioContext): ShireAudio {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  // Pink noise river/wind
  const bufSize = ctx.sampleRate * 8;
  const noiseBuf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = noiseBuf.getChannelData(c);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+w*0.5362)*0.10;
    }
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf; noiseSource.loop = true;
  const noiseLP = ctx.createBiquadFilter();
  noiseLP.type = 'lowpass'; noiseLP.frequency.value = 600;
  const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.20;
  noiseSource.connect(noiseLP); noiseLP.connect(noiseGain); noiseGain.connect(masterGain);
  noiseSource.start();

  // String pad with tremolo
  const padOscillators: OscillatorNode[] = [];
  const tremolo = ctx.createOscillator();
  tremolo.type = 'sine'; tremolo.frequency.value = 4.5;
  const tremoloDepth = ctx.createGain(); tremoloDepth.gain.value = 0.015;
  tremolo.connect(tremoloDepth); tremolo.start();
  PAD_FREQS.forEach((freq, idx) => {
    [1, 2].forEach(h => {
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.value = freq * h * (1 + (idx % 2 === 0 ? 0.002 : -0.002));
      const g = ctx.createGain(); g.gain.value = (h===1?0.05:0.02)/PAD_FREQS.length;
      tremoloDepth.connect(g.gain);
      osc.connect(g); g.connect(masterGain); osc.start(); padOscillators.push(osc);
    });
  });

  // Flute melody
  const melodyMaster = ctx.createGain(); melodyMaster.gain.value = 0.28;
  const melodyLP = ctx.createBiquadFilter(); melodyLP.type = 'lowpass'; melodyLP.frequency.value = 3200;
  melodyMaster.connect(melodyLP); melodyLP.connect(masterGain);
  let melodyTimeout: ReturnType<typeof setTimeout> | null = null;
  let noteIdx = 0;

  function playNextNote() {
    const freq = MELODY_NOTES[noteIdx % MELODY_NOTES.length];
    const dur  = MELODY_DUR[noteIdx % MELODY_DUR.length];
    noteIdx++;
    if (Math.random() < 0.30) {
      melodyTimeout = setTimeout(playNextNote, dur * 1000 * 1.3);
      return;
    }
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.14);
    env.gain.setValueAtTime(0.85, ctx.currentTime + dur * 0.72);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.connect(env); env.connect(melodyMaster);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur + 0.1);
    const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = freq * 2;
    const env2 = ctx.createGain(); env2.gain.value = 0.15;
    const envCopy = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    osc2.connect(env2); env2.connect(melodyMaster);
    osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + dur + 0.1);
    if (Math.random() < 0.12) {
      const bird = ctx.createOscillator(); bird.type = 'sine';
      bird.frequency.setValueAtTime(freq*4, ctx.currentTime);
      bird.frequency.linearRampToValueAtTime(freq*5.5, ctx.currentTime+0.07);
      bird.frequency.linearRampToValueAtTime(freq*4.2, ctx.currentTime+0.14);
      const bEnv = ctx.createGain();
      bEnv.gain.setValueAtTime(0, ctx.currentTime);
      bEnv.gain.linearRampToValueAtTime(0.05, ctx.currentTime+0.03);
      bEnv.gain.linearRampToValueAtTime(0, ctx.currentTime+0.18);
      bird.connect(bEnv); bEnv.connect(masterGain);
      bird.start(ctx.currentTime); bird.stop(ctx.currentTime+0.22);
    }
    melodyTimeout = setTimeout(playNextNote, dur * 1000 * (0.82 + Math.random() * 0.45));
  }
  melodyTimeout = setTimeout(playNextNote, 1800);

  const stopAll = () => {
    try { noiseSource.stop(); } catch {}
    padOscillators.forEach(o => { try { o.stop(); } catch {} });
    try { tremolo.stop(); } catch {}
    if (melodyTimeout) clearTimeout(melodyTimeout);
  };
  return { masterGain, stopAll };
}

export const AmbientSound: React.FC<{ light?: boolean }> = ({ light }) => {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const shireRef = useRef<ShireAudio | null>(null);

  const toggle = useCallback(() => {
    if (playing) {
      if (shireRef.current && ctxRef.current) {
        shireRef.current.masterGain.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.5);
        const ref = shireRef.current; shireRef.current = null;
        setTimeout(() => ref.stopAll(), 2200);
      }
      setPlaying(false);
    } else {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const shire = buildShireAmbience(ctx);
      shire.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      shire.masterGain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 3.5);
      shireRef.current = shire;
      setPlaying(true);
    }
  }, [playing]);

  const color = light ? 'rgba(244,240,232,0.5)' : 'var(--ink-muted)';
  const hover = light ? 'rgba(244,240,232,0.9)' : 'var(--rust)';

  return (
    <button onClick={toggle}
      title={playing ? 'Silenciar La Comarca' : 'Escuchar La Comarca (El Señor de los Anillos)'}
      className="flex items-center gap-1.5 transition-all duration-300"
      style={{ color }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = hover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = color; }}
    >
      {playing ? <Music size={15} /> : <VolumeX size={15} />}
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] hidden md:block">
        {playing ? 'La Comarca' : 'Escuchar'}
      </span>
      {playing && (
        <span className="flex gap-0.5 items-end">
          {[2,4,6,3,5,4,2].map((h,i) => (
            <span key={i} className="block w-0.5 rounded-full" style={{
              height: h*2, background: 'currentColor',
              animation: `shireBar ${0.55+i*0.14}s ease-in-out ${i*0.09}s infinite alternate`, opacity: 0.75,
            }} />
          ))}
        </span>
      )}
      <style>{`@keyframes shireBar{from{transform:scaleY(0.2);opacity:0.4}to{transform:scaleY(1);opacity:0.9}}`}</style>
    </button>
  );
};
