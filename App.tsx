
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
  const [activeFeature, setActiveFeature] = useState<LekhaFeature>(LekhaFeature.CHAT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [genImg, setGenImg] = useState<string | null>(null);
  const [genPrompt, setGenPrompt] = useState('Лёха в балетной пачке');
  const [wisdom, setWisdom] = useState<string>("Нажми кнопку и узнай правду о себе, Лёх.");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await geminiService.chat(input);
      setMessages(prev => [...prev, { role: 'model', text: res }]);
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: "Чё-то сеть залагала, как твои обещания вернуть сотку." }]);
    } finally {
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
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <div className="scanlines" />
      {/* Terminal Header */}
      <header className="mb-6 cyber-panel rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-green-900/30 border border-green-500 rounded-lg animate-pulse">
            <ExclamationTriangleIcon className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight neon-text uppercase">LEKHA-TERMINAL <span className="text-white">v2.0</span></h1>
            <p className="text-[10px] text-green-500/60 font-bold uppercase tracking-[0.25em]">System status: ROASTING_MODE_ENABLED</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-red-900/20 text-red-500 border border-red-500/50">ОПАСНОСТЬ ПОДЪЁБОВ 99%</span>
          <span className="chip bg-green-900/20 text-green-400 border border-green-500/30">ПИНГ 4MS</span>
          <span className="chip bg-white/5 text-white border border-white/20">РЕЖИМ: ROAST</span>
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
        <div className="flex-1 cyber-panel rounded-2xl flex flex-col relative min-h-[60vh] lg:min-h-[520px] overflow-hidden">
          
          {/* Chat */}
          {activeFeature === LekhaFeature.CHAT && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 font-bold text-[13px] sm:text-sm">
                <div className="text-green-900/50 text-[10px] uppercase mb-4 tracking-[0.35em]">--- Начало лога ---</div>
                {messages.length === 0 && (
                  <div className="text-green-500/40 italic">Лёха, ну чё ты молчишь как на допросе? Спроси чё-нить.</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 md:p-4 border rounded-lg ${m.role === 'user' ? 'border-green-500 text-green-500 bg-black/50' : 'border-white/60 text-white bg-green-900/10'}`}>
                      <span className="text-[10px] block opacity-50 mb-1">{m.role === 'user' ? 'ЛЕХА' : 'ТЕРМИНАЛ'}</span>
                      {m.text}
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
            <div className="p-6 md:p-8 flex flex-col items-center gap-6 h-full overflow-y-auto">
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
            <div className="p-6 md:p-8 flex flex-col gap-6 h-full overflow-y-auto">
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
            <div className="p-6 md:p-8 flex flex-col items-center justify-center h-full gap-8">
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
