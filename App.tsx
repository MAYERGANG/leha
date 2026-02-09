
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { LekhaFeature, Message } from './types';
import { geminiService } from './services/geminiService';
import { 
  ChatBubbleBottomCenterTextIcon, 
  UserCircleIcon, 
  PhotoIcon, 
  FireIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const STORAGE_KEY = 'lekha_terminal_messages_v1';
  const SETTINGS_KEY = 'lekha_terminal_settings_v1';

  const [activeFeature, setActiveFeature] = useState<LekhaFeature>(LekhaFeature.CHAT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [genImg, setGenImg] = useState<string | null>(null);
  const [genPrompt, setGenPrompt] = useState('Лёха в балетной пачке');
  const [wisdom, setWisdom] = useState<string>("Нажми кнопку и узнай правду о себе, Лёх.");
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return true;
      const parsed = JSON.parse(raw);
      return parsed?.soundOn ?? true;
    } catch {
      return true;
    }
  });
  const [soundProOn, setSoundProOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed?.soundProOn ?? false;
    } catch {
      return false;
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const lastClickRef = useRef(0);

  const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  };

  const playBeep = (freq = 740, duration = 0.06, gain = 0.04) => {
    if (!soundOn || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'square';
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + duration);
  };

  const playClick = () => {
    if (!soundOn || !soundProOn) return;
    const now = Date.now();
    if (now - lastClickRef.current < 45) return;
    lastClickRef.current = now;
    playBeep(1200, 0.02, 0.015);
  };

  const clearHistory = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const safe = parsed
          .filter(m => m && typeof m.text === 'string' && typeof m.role === 'string')
          .map(m => ({
            id: String(m.id || makeId()),
            role: m.role === 'user' ? 'user' : 'model',
            text: m.text,
            ts: typeof m.ts === 'number' ? m.ts : Date.now(),
            status: m.status
          }));
        setMessages(safe.slice(-100));
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundOn, soundProOn }));
    } catch {
      // ignore quota errors
    }
  }, [soundOn, soundProOn]);

  useEffect(() => {
    if (!soundOn || !soundProOn) {
      if (ambientRef.current) {
        ambientRef.current.osc.stop();
        ambientRef.current.osc.disconnect();
        ambientRef.current.gain.disconnect();
        ambientRef.current = null;
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 58;
    gain.gain.value = 0.015;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    ambientRef.current = { osc, gain };

    return () => {
      if (ambientRef.current) {
        ambientRef.current.osc.stop();
        ambientRef.current.osc.disconnect();
        ambientRef.current.gain.disconnect();
        ambientRef.current = null;
      }
    };
  }, [soundOn, soundProOn]);

  useEffect(() => {
    const update = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      cur.x += (tgt.x - cur.x) * 0.06;
      cur.y += (tgt.y - cur.y) * 0.06;
      document.documentElement.style.setProperty('--orb-x', `${cur.x}px`);
      document.documentElement.style.setProperty('--orb-y', `${cur.y}px`);
      rafRef.current = requestAnimationFrame(update);
    };

    const onMove = (x: number, y: number) => {
      targetRef.current = { x, y };
    };

    const handleMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouch = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    rafRef.current = requestAnimationFrame(update);
    window.addEventListener('mousemove', handleMouse, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, []);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (cooldownUntil && Date.now() < cooldownUntil) {
      setMessages(prev => [...prev, { id: makeId(), role: 'model', text: "Тише, Лёха. Не спамь — дай 2 сек перед новым запросом.", ts: Date.now(), status: 'sent' }]);
      return;
    }

    const userId = makeId();
    const userMsg: Message = { id: userId, role: 'user', text: input, ts: Date.now(), status: 'sending' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setRetrying(false);
    setRetryCount(0);
    setCooldownUntil(Date.now() + 2000);
    playBeep(820, 0.05, 0.03);

    try {
      const res = await geminiService.chat(input, {
        onRetry: (attempt) => {
          setRetrying(true);
          setRetryCount(attempt);
        }
      });
      updateMessage(userId, { status: 'sent' });
      setMessages(prev => [...prev, { id: makeId(), role: 'model', text: res, ts: Date.now(), status: 'sent' }]);
      playBeep(520, 0.07, 0.035);
    } catch {
      updateMessage(userId, { status: 'failed' });
      setMessages(prev => [...prev, { id: makeId(), role: 'model', text: "Лёха, сегодня я молчу. Но ты всё равно не прав.", ts: Date.now(), status: 'failed' }]);
      playBeep(180, 0.1, 0.05);
    } finally {
      setRetrying(false);
      setLoading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = () => { setPreviewImage(r.result as string); setAnalysis(null); };
      r.readAsDataURL(file);
    }
  };

  const startScan = async () => {
    if (!previewImage || loading) return;
    setLoading(true);
    try {
      const res = await geminiService.analyzeStyle(previewImage.split(',')[1]);
      setAnalysis(res);
    } finally {
      setLoading(false);
    }
  };

  const generateLekha = async () => {
    setLoading(true);
    try {
      const res = await geminiService.generateCrazyLekha(genPrompt);
      setGenImg(res);
    } finally {
      setLoading(false);
    }
  };

  const fetchWisdom = async () => {
    setLoading(true);
    try {
      const res = await geminiService.getLekhaQuote();
      setWisdom(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex flex-col px-4 pt-6 pb-10 md:px-8 md:pt-10 max-w-6xl mx-auto">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />
      <div className="bg-orb bg-orb-c" />
      <div className="bg-noise" />
      <div className="bg-grid" />
      <div className="scanlines" />
      {/* Terminal Header */}
      <header className="mb-6 cyber-panel rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-4 backdrop-blur bloom-panel">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-green-900/30 border border-green-500 rounded-lg animate-pulse">
            <ExclamationTriangleIcon className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight neon-text uppercase glow-text">
              <span className="glitch" data-text="LEKHA-TERMINAL">LEKHA-TERMINAL</span> <span className="text-white">v2.0</span>
            </h1>
            <p className="text-[10px] text-green-500/60 font-bold uppercase tracking-[0.25em]">System status: ROASTING_MODE_ENABLED</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-red-900/20 text-red-500 border border-red-500/50">ОПАСНОСТЬ ПОДЪЁБОВ 99%</span>
          <span className="chip bg-green-900/20 text-green-400 border border-green-500/30">ПИНГ 4MS</span>
          <span className="chip bg-white/5 text-white border border-white/20">РЕЖИМ: ROAST</span>
          <button
            onClick={() => setSoundOn(v => !v)}
            className="chip bg-black/60 text-green-400 border border-green-500/30 hover:border-green-400"
          >
            {soundOn ? 'SOUND: ON' : 'SOUND: OFF'}
          </button>
          <button
            onClick={() => setSoundProOn(v => !v)}
            className="chip bg-black/60 text-green-400 border border-green-500/30 hover:border-green-400"
          >
            {soundProOn ? 'SOUND PRO: ON' : 'SOUND PRO: OFF'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <nav className="w-full lg:w-56 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory">
          {[
            { id: LekhaFeature.CHAT, icon: ChatBubbleBottomCenterTextIcon, label: 'Побазарим?' },
            { id: LekhaFeature.VISION, icon: UserCircleIcon, label: 'Скан Чёткости' },
            { id: LekhaFeature.GALLERY, icon: PhotoIcon, label: 'Лёха-Верс' },
            { id: LekhaFeature.WISDOM, icon: FireIcon, label: 'Счётчик ЧСВ' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className={`tab min-w-[170px] lg:min-w-0 snap-start flex items-center gap-3 p-4 border transition-all uppercase font-bold text-[11px] tracking-widest ${
                activeFeature === f.id ? 'tab-active bg-green-600 border-green-500 text-black shadow-[0_0_18px_#00ff41]' : 'border-green-900/50 text-green-900 hover:border-green-500 hover:text-green-500'
              }`}
            >
              <f.icon className="w-5 h-5" />
              {f.label}
            </button>
          ))}
        </nav>

        {/* Action Center */}
        <div className="flex-1 cyber-panel rounded-2xl flex flex-col relative min-h-[60vh] lg:min-h-[520px] overflow-hidden bloom-panel">
          
          {/* Chat */}
          {activeFeature === LekhaFeature.CHAT && (
            <div className="panel-enter flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 font-bold text-[13px] sm:text-sm">
                <div className="flex items-center justify-between text-green-900/50 text-[10px] uppercase mb-4 tracking-[0.35em]">
                  <span>--- Начало лога ---</span>
                  {messages.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="ghost-btn"
                      title="Очистить лог"
                      aria-label="Очистить лог"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      СБРОС
                    </button>
                  )}
                </div>
                {retrying && (
                  <div className="text-[10px] uppercase tracking-[0.35em] text-green-400/80">
                    ПОВТОР ЗАПРОСА... ПОПЫТКА {retryCount}
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="text-green-500/40 italic">Лёха, ну чё ты молчишь как на допросе? Спроси чё-нить.</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 md:p-4 border rounded-lg ${m.role === 'user' ? 'border-green-500 text-green-500 bg-black/50' : 'border-white/60 text-white bg-green-900/10'}`}>
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-60 mb-1">
                        <span className="uppercase">{m.role === 'user' ? 'ЛЕХА' : 'ТЕРМИНАЛ'}</span>
                        <span>{formatTime(m.ts)}</span>
                      </div>
                      <div>{m.text}</div>
                      {m.role === 'user' && (
                        <div className="mt-2 text-[10px] uppercase tracking-[0.25em] opacity-50">
                          {m.status === 'sending' && 'ОТПРАВКА'}
                          {m.status === 'sent' && 'ДОСТАВЛЕНО'}
                          {m.status === 'failed' && 'СБОЙ'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div className="text-white animate-pulse">ТЕРМИНАЛ ГЕНЕРИРУЕТ ОТВЕТКУ...</div>}
                <div ref={scrollRef} />
              </div>
              <form onSubmit={sendChat} className="safe-bottom p-4 md:p-5 border-t border-green-900/50 flex gap-2 bg-black/60 backdrop-blur sticky bottom-0">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={playClick}
                  placeholder="Введи оправдание..."
                  className="flex-1 bg-black/80 border border-green-900/50 px-4 py-3 text-green-500 focus:outline-none focus:border-green-500 rounded-md min-h-[48px]"
                />
                <button className="bg-green-600 text-black px-4 py-3 hover:bg-green-400 rounded-md min-h-[48px]" aria-label="Отправить">
                  <PaperAirplaneIcon className="w-6 h-6" />
                </button>
              </form>
            </div>
          )}

          {/* Vision Roast */}
          {activeFeature === LekhaFeature.VISION && (
            <div className="panel-enter p-6 md:p-8 flex flex-col items-center gap-6 h-full overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black uppercase text-center neon-text tracking-widest">Рентген «Чёткий Паца»</h2>
              <div className="w-full max-w-sm aspect-square border-2 border-dashed border-green-500/70 flex items-center justify-center relative overflow-hidden group rounded-xl bg-black/60">
                {previewImage ? (
                  <img src={previewImage} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center opacity-30 group-hover:opacity-100 transition-opacity">
                    <UserCircleIcon className="w-20 h-20 mx-auto" />
                    <p className="text-xs">ЗАГРУЗИ СВОЁ ЛИЦО (ЕСЛИ НЕ СТЫДНО)</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              {previewImage && !analysis && (
                <button onClick={startScan} disabled={loading} className="w-full max-w-sm bg-green-600 text-black p-4 font-black uppercase hover:bg-green-400 disabled:opacity-50 rounded-md min-h-[52px]">
                  {loading ? 'ИЩЕМ ПРЫЩИ...' : 'ЗАПУСТИТЬ РОАСТ-СКАНЕР'}
                </button>
              )}
              {analysis && (
                <div className="w-full p-4 border border-green-500 bg-green-900/10 reveal rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
                  <button onClick={() => setPreviewImage(null)} className="mt-4 text-[10px] underline">СБРОСИТЬ УЛИКИ</button>
                </div>
              )}
            </div>
          )}

          {/* Gallery Prank */}
          {activeFeature === LekhaFeature.GALLERY && (
            <div className="panel-enter p-6 md:p-8 flex flex-col gap-6 h-full overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black uppercase text-center neon-text tracking-widest">Лёха в параллельных мирах</h2>
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="w-full max-w-sm aspect-square border border-green-500/70 bg-black/70 flex items-center justify-center rounded-xl">
                  {genImg ? (
                    <img src={genImg} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center opacity-20">
                      <PhotoIcon className="w-20 h-20 mx-auto" />
                      <p className="text-xs">ТУТ БУДЕТ КРИНЖ</p>
                    </div>
                  )}
                </div>
                <div className="w-full max-w-sm space-y-2">
                  <input 
                    value={genPrompt}
                    onChange={e => setGenPrompt(e.target.value)}
                    className="w-full bg-black/80 border border-green-500 p-3 text-sm text-green-500 rounded-md min-h-[48px]"
                  />
                  <button onClick={generateLekha} disabled={loading} className="w-full bg-green-600 text-black p-3 font-bold uppercase hover:bg-green-400 disabled:opacity-50 rounded-md min-h-[52px]">
                    ГЕНЕРИРОВАТЬ ПРИКОЛ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wisdom/Roast Quotes */}
          {activeFeature === LekhaFeature.WISDOM && (
            <div className="panel-enter p-6 md:p-8 flex flex-col items-center justify-center h-full gap-8">
              <div className="relative p-6 md:p-8 border-2 border-green-500 bg-green-900/5 max-w-md w-full rounded-xl">
                <div className="absolute -top-3 left-4 bg-black px-2 text-[10px] font-bold">ИСТИНА_О_ЛЕХЕ.TXT</div>
                <p className="text-lg md:text-xl italic text-center font-bold leading-relaxed">
                  "{wisdom}"
                </p>
              </div>
              <button 
                onClick={fetchWisdom} 
                disabled={loading}
                className="group relative px-8 py-4 bg-red-600 text-white font-black uppercase hover:bg-red-500 transition-all disabled:opacity-50 rounded-md min-h-[52px]"
              >
                <div className="absolute inset-0 border border-white translate-x-1 translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"></div>
                КНОПКА СУДЬБЫ ДЛЯ ЛЁХИ
              </button>
            </div>
          )}

          {/* Loading Bar */}
          {loading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-900 overflow-hidden">
              <div className="h-full bg-green-500 animate-[loading_2s_infinite]"></div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-6 text-center text-[10px] text-green-900 font-bold uppercase tracking-[0.35em]">
        LEKHA_TERMINAL // PRANK_MODE: ON // [C] 2025 ANTI-LEKHA CORP
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
