
import React, { useState, useEffect, useRef } from 'react';
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
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-5xl mx-auto">
      {/* Terminal Header */}
      <header className="mb-6 cyber-panel p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-green-900/30 border border-green-500 rounded animate-pulse">
            <ExclamationTriangleIcon className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">LEKHA-TERMINAL <span className="text-white">v2.0</span></h1>
            <p className="text-[10px] text-green-500/60 font-bold uppercase tracking-widest">System status: ROASTING_MODE_ENABLED</p>
          </div>
        </div>
        <div className="text-xs bg-red-900/20 text-red-500 border border-red-500/50 px-4 py-1 rounded-full font-bold">
          ВНИМАНИЕ: ОПАСНОСТЬ ПОДЪЁБОВ 99%
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-56 flex md:flex-col gap-2">
          {[
            { id: LekhaFeature.CHAT, icon: ChatBubbleBottomCenterTextIcon, label: 'Побазарим?' },
            { id: LekhaFeature.VISION, icon: UserCircleIcon, label: 'Скан Чёткости' },
            { id: LekhaFeature.GALLERY, icon: PhotoIcon, label: 'Лёха-Верс' },
            { id: LekhaFeature.WISDOM, icon: FireIcon, label: 'Счётчик ЧСВ' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className={`flex items-center gap-3 p-4 border transition-all uppercase font-bold text-xs ${
                activeFeature === f.id ? 'bg-green-600 border-green-500 text-black shadow-[0_0_15px_#00ff41]' : 'border-green-900/50 text-green-900 hover:border-green-500 hover:text-green-500'
              }`}
            >
              <f.icon className="w-5 h-5" />
              {f.label}
            </button>
          ))}
        </nav>

        {/* Action Center */}
        <div className="flex-1 cyber-panel flex flex-col relative min-h-[500px]">
          
          {/* Chat */}
          {activeFeature === LekhaFeature.CHAT && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-bold text-sm">
                <div className="text-green-900/50 text-[10px] uppercase mb-4">--- Начало лога ---</div>
                {messages.length === 0 && (
                  <div className="text-green-500/40 italic">Лёха, ну чё ты молчишь как на допросе? Спроси чё-нить.</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 border ${m.role === 'user' ? 'border-green-500 text-green-500' : 'border-white text-white bg-green-900/10'}`}>
                      <span className="text-[10px] block opacity-50 mb-1">{m.role === 'user' ? 'ЛЕХА' : 'ТЕРМИНАЛ'}</span>
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && <div className="text-white animate-pulse">ТЕРМИНАЛ ГЕНЕРИРУЕТ ОТВЕТКУ...</div>}
                <div ref={scrollRef} />
              </div>
              <form onSubmit={sendChat} className="p-4 border-t border-green-900/50 flex gap-2">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Введи оправдание..."
                  className="flex-1 bg-black border border-green-900/50 p-3 text-green-500 focus:outline-none focus:border-green-500"
                />
                <button className="bg-green-600 text-black p-3 hover:bg-green-400">
                  <PaperAirplaneIcon className="w-6 h-6" />
                </button>
              </form>
            </div>
          )}

          {/* Vision Roast */}
          {activeFeature === LekhaFeature.VISION && (
            <div className="p-6 flex flex-col items-center gap-6 h-full overflow-y-auto">
              <h2 className="text-xl font-black uppercase text-center neon-text">Рентген «Чёткий Паца»</h2>
              <div className="w-full max-w-sm aspect-square border-2 border-dashed border-green-500 flex items-center justify-center relative overflow-hidden group">
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
                <button onClick={startScan} disabled={loading} className="w-full max-w-sm bg-green-600 text-black p-4 font-black uppercase hover:bg-green-400 disabled:opacity-50">
                  {loading ? 'ИЩЕМ ПРЫЩИ...' : 'ЗАПУСТИТЬ РОАСТ-СКАНЕР'}
                </button>
              )}
              {analysis && (
                <div className="w-full p-4 border border-green-500 bg-green-900/10 animate-in fade-in zoom-in">
                  <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
                  <button onClick={() => setPreviewImage(null)} className="mt-4 text-[10px] underline">СБРОСИТЬ УЛИКИ</button>
                </div>
              )}
            </div>
          )}

          {/* Gallery Prank */}
          {activeFeature === LekhaFeature.GALLERY && (
            <div className="p-6 flex flex-col gap-6 h-full overflow-y-auto">
              <h2 className="text-xl font-black uppercase text-center neon-text">Лёха в параллельных мирах</h2>
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="w-full max-w-sm aspect-square border border-green-500 bg-black flex items-center justify-center">
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
                    className="w-full bg-black border border-green-500 p-2 text-sm text-green-500"
                  />
                  <button onClick={generateLekha} disabled={loading} className="w-full bg-green-600 text-black p-3 font-bold uppercase hover:bg-green-400 disabled:opacity-50">
                    ГЕНЕРИРОВАТЬ ПРИКОЛ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wisdom/Roast Quotes */}
          {activeFeature === LekhaFeature.WISDOM && (
            <div className="p-6 flex flex-col items-center justify-center h-full gap-8">
              <div className="relative p-8 border-2 border-green-500 bg-green-900/5 max-w-md w-full">
                <div className="absolute -top-3 left-4 bg-black px-2 text-[10px] font-bold">ИСТИНА_О_ЛЕХЕ.TXT</div>
                <p className="text-lg italic text-center font-bold leading-relaxed">
                  "{wisdom}"
                </p>
              </div>
              <button 
                onClick={fetchWisdom} 
                disabled={loading}
                className="group relative px-8 py-4 bg-red-600 text-white font-black uppercase hover:bg-red-500 transition-all disabled:opacity-50"
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

      <footer className="mt-6 text-center text-[10px] text-green-900 font-bold uppercase tracking-widest">
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
