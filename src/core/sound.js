// Hiệu ứng âm thanh tổng hợp bằng Web Audio — không cần file âm thanh.
// AudioContext chỉ được tạo khi phát lần đầu (sau thao tác của người dùng).

let ctx = null;

function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function envGain(ac, t0, peak, attack, decay) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  g.connect(ac.destination);
  return g;
}

function tone(ac, { freq, to = freq, type = 'sine', start = 0, peak = 0.2, attack = 0.005, decay = 0.2 }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + attack + decay);
  osc.connect(envGain(ac, t0, peak, attack, decay));
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.05);
}

function noise(ac, { start = 0, dur = 0.3, peak = 0.25, filter = 'bandpass', freq = 3000, to = freq, q = 1 }) {
  const t0 = ac.currentTime + start;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (to !== freq) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  src.connect(f);
  f.connect(envGain(ac, t0, peak, 0.02, dur));
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  /** vút — lúc ném */
  whoosh: (ac) => noise(ac, { dur: 0.35, peak: 0.12, freq: 600, to: 2400, q: 0.8 }),
  /** soạt — bóng lọt lưới */
  swish: (ac) => noise(ac, { dur: 0.4, peak: 0.3, filter: 'highpass', freq: 2500, to: 5000, q: 0.5 }),
  /** keng — chạm vành */
  rim: (ac) => {
    tone(ac, { freq: 820, type: 'triangle', peak: 0.15, decay: 0.35 });
    tone(ac, { freq: 1640, type: 'sine', peak: 0.06, decay: 0.25 });
  },
  /** bịch — bóng nảy sàn */
  bounce: (ac) => tone(ac, { freq: 140, to: 60, type: 'sine', peak: 0.35, decay: 0.18 }),
  /** ting ting — ghi điểm */
  score: (ac) => {
    tone(ac, { freq: 880, type: 'square', peak: 0.05, decay: 0.12 });
    tone(ac, { freq: 1320, type: 'square', peak: 0.05, decay: 0.2, start: 0.1 });
  },
  /** kẽo kẹt — kéo dây ná */
  stretch: (ac) => tone(ac, { freq: 180, to: 420, type: 'triangle', peak: 0.05, attack: 0.02, decay: 0.25 }),
  /** pưng — buông dây ná */
  twang: (ac) => {
    tone(ac, { freq: 520, to: 140, type: 'sawtooth', peak: 0.09, decay: 0.22 });
    noise(ac, { dur: 0.18, peak: 0.08, freq: 1800, to: 600, q: 2 });
  },
  /** cộp — đạn trúng ô */
  thunk: (ac) => {
    tone(ac, { freq: 300, to: 120, type: 'sine', peak: 0.3, decay: 0.12 });
    noise(ac, { dur: 0.06, peak: 0.12, filter: 'lowpass', freq: 1200 });
  },
  /** hú — sói tru lúc chuyển sang đêm */
  howl: (ac) => {
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const vib = ac.createOscillator();
    const vibGain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t0);
    osc.frequency.linearRampToValueAtTime(620, t0 + 0.5);
    osc.frequency.linearRampToValueAtTime(560, t0 + 1.2);
    osc.frequency.linearRampToValueAtTime(380, t0 + 1.7);
    vib.frequency.value = 6;
    vibGain.gain.value = 9;
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);
    const g = envGain(ac, t0, 0.12, 0.25, 1.5);
    osc.connect(g);
    osc.start(t0);
    vib.start(t0);
    osc.stop(t0 + 1.9);
    vib.stop(t0 + 1.9);
  },
  /** tách — bật/tắt đèn pin */
  click: (ac) => {
    tone(ac, { freq: 2200, to: 1400, type: 'square', peak: 0.04, decay: 0.03 });
    noise(ac, { dur: 0.03, peak: 0.08, filter: 'highpass', freq: 3000 });
  },
  /** bíp — lỗi / bị loại */
  buzz: (ac) => tone(ac, { freq: 180, type: 'sawtooth', peak: 0.08, decay: 0.3 }),
};

/** Phát âm thanh theo tên. Im lặng nếu trình duyệt không hỗ trợ. */
export function playSound(name) {
  const ac = audio();
  if (!ac || !SOUNDS[name]) return;
  try {
    SOUNDS[name](ac);
  } catch {
    /* bỏ qua */
  }
}
