import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { summarizeAudio } from '../lib/gemini';
import { Mic, MicOff, Play, Save, Trash2, Globe, Sparkles, Send, Zap, ShieldCheck, MessageSquare, AlertTriangle, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SUMMARY_OPTIONS = [
  { code: 'Ejecutivo', name: 'Ejecutivo' },
  { code: 'Viñetas', name: 'Viñetas' },
  { code: 'Detallado', name: 'Detallado' }
];

export default function LiveSession({ user }: { user: User }) {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [refined, setRefined] = useState('');
  const [summary, setSummary] = useState('');
  const [title, setTitle] = useState('');
  const [targetType, setTargetType] = useState('Ejecutivo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const nextResultIndexRef = useRef(0);
  const transcriptEndRef = useRef<HTMLSpanElement>(null);
  const scrollTimeoutRef = useRef<any>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (!isRecording) {
      nextResultIndexRef.current = 0;
    }
  }, [isRecording]);

  useEffect(() => {
    // Scroll casi instantáneo para seguir el flujo de voz
    if (transcriptEndRef.current) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
    }
  }, [transcript, interimTranscript]);

  const initRecognition = () => {
    if (recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        let interim = '';
        
        // Final results: start from where we last left off
        for (let i = nextResultIndexRef.current; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const res = event.results[i][0].transcript;
            setTranscript(prev => prev + ' ' + res.trim());
            nextResultIndexRef.current = i + 1;
          }
        }

        // Interim results: gather all non-final bits from the current list
        for (let i = nextResultIndexRef.current; i < event.results.length; i++) {
          interim += event.results[i][0].transcript;
        }
        setInterimTranscript(interim);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }
      };

      recognition.onerror = (event: any) => {
        // En algunos navegadores 'aborted' es normal al detener o por periodos largos
        if (event.error === 'not-allowed') {
          setErrorMsg('Permiso de micrófono denegado. Por favor, actívalo en la configuración de tu navegador.');
          setIsRecording(false);
          isRecordingRef.current = false;
        } else if (event.error === 'aborted') {
          console.log('Interrupción de conexión (aborted) - Intentando reconectar...');
          return;
        } else if (event.error === 'no-speech' || event.error === 'audio-capture') {
          return;
        } else {
          console.error('Speech recognition error', event.error);
          setErrorMsg(`Error de sistema: ${event.error}`);
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      recognitionRef.current = recognition;
    }
  };

  useEffect(() => {
    initRecognition();
    return () => {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
    } else {
      setErrorMsg(null);
      if (!recognitionRef.current) initRecognition();
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Start error:", e);
        // If it was already started, we just sync the state
        if (e.message?.includes('already started')) {
          setIsRecording(true);
        }
      }
    }
  };

  const handleRefine = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    const result = await summarizeAudio(transcript, SUMMARY_OPTIONS.find(l => l.code === targetType)?.name || 'Ejecutivo');
    setRefined(result.refined);
    setSummary(result.summary);
    setIsProcessing(false);
  };

  const handleSave = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    try {
      const finalTitle = title.trim() || `Sesión - ${new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`;
      await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        title: finalTitle,
        createdAt: serverTimestamp(),
        transcript,
        refinedTranscript: refined,
        summary,
        summaryType: targetType,
        notes: ''
      });
      alert('¡Sesión archivada correctamente!');
      setTranscript('');
      setRefined('');
      setSummary('');
      setTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-slate-50"
    >
      <header className="h-auto md:h-16 py-3 md:py-0 border-b border-slate-200 bg-white px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-3 md:gap-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-widest whitespace-nowrap">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            En Vivo
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <input 
            type="text" 
            placeholder="Título de Sesión..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none focus:ring-0 outline-none font-bold text-sm text-slate-800 placeholder-slate-300 w-full min-w-[150px] md:w-64"
          />
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 md:gap-2 bg-slate-100 px-2 md:px-3 py-1.5 rounded-lg shrink-0 mr-1 md:mr-2">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <select 
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="bg-transparent outline-none font-bold text-[10px] uppercase tracking-tighter cursor-pointer text-slate-600"
            >
              {SUMMARY_OPTIONS.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <button 
            id="toggle-recording"
            onClick={toggleRecording}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all shrink-0 ${
              isRecording 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Mic className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />}
            {isRecording ? 'Detener' : 'Grabar'}
          </button>
          <button 
            onClick={handleRefine}
            disabled={isProcessing || !transcript.trim()}
            className="flex items-center gap-1.5 md:gap-2 bg-emerald-600 text-white px-3 md:px-5 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-sm disabled:opacity-30 transition-all font-sans shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Resumir IA
          </button>
          <button 
            onClick={handleSave}
            disabled={isProcessing || !transcript.trim()}
            className="flex items-center gap-1.5 md:gap-2 bg-slate-800 text-white px-3 md:px-5 py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-900 shadow-sm disabled:opacity-30 transition-all font-sans shrink-0"
          >
            <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Guardar
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 lg:gap-8 overflow-hidden bg-slate-50">
        <div className="flex-1 lg:flex-[1.5] w-full flex flex-col gap-4 md:gap-6 overflow-hidden relative">
          {/* Main Transcript Card */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between z-20">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Interlocutor</span>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <UserIcon className="w-3 h-3 text-indigo-500" />
                    {user.displayName?.split(' ')[0] || 'Usuario'}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Captura</span>
                  {isRecording ? (
                    <div className="flex items-center gap-2">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
                      />
                      <span className="text-xs font-bold text-red-600">Activo</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Pausado</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide py-10 px-8 relative z-0">
              <div className="min-h-full flex flex-col justify-end">
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600 shadow-sm"
                  >
                    <AlertTriangle className="w-6 h-6 shrink-0 opacity-80" />
                    <p className="text-xs font-bold uppercase tracking-tight leading-snug">{errorMsg}</p>
                  </motion.div>
                )}
                
                <div className="text-3xl md:text-5xl font-semibold leading-[1.5] text-slate-900 tracking-tight font-sans">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    {transcript.split(' ').filter(w => w.trim() !== '').map((word, i, arr) => {
                       const totalWords = arr.length;
                       const distance = totalWords - 1 - i;
                       const opacity = Math.max(0.1, 1 - (distance * 0.05));
                       const scale = Math.max(0.95, 1 - (distance * 0.005));
                       const blur = distance > 20 ? Math.min(1.5, (distance - 20) * 0.1) : 0;
                       
                       return (
                         <motion.span
                           key={`${i}-${word}`}
                           initial={i > totalWords - 5 ? { opacity: 0, y: 10, scale: 0.9 } : false}
                           animate={{ opacity, scale, y: 0, filter: `blur(${blur}px)` }}
                           transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                           className="inline-block origin-left select-none text-balance"
                         >
                           {word}
                         </motion.span>
                       );
                    })}
                    
                    <AnimatePresence mode="popLayout">
                      {interimTranscript && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.8, x: -10 }}
                          animate={{ opacity: 0.4, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          className="text-indigo-600 font-bold italic"
                        >
                          {interimTranscript}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {!transcript && !interimTranscript && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center space-y-8 py-32 opacity-10 select-none"
                    >
                      <div className="relative">
                        <Mic className="w-20 h-20 stroke-[1]" />
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.05, 0.2] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="absolute inset-0 bg-indigo-400 rounded-full blur-[40px]"
                        />
                      </div>
                      <span className="italic font-normal text-2xl text-center max-w-sm leading-relaxed tracking-tight">
                        Listo para escuchar sus notas.
                      </span>
                    </motion.div>
                  )}
                  <span ref={transcriptEndRef} className="inline-block w-1 h-32" />
                </div>
              </div>
            </div>
            
            {/* Fading Gradients inside card */}
            <div className="absolute top-16 left-0 right-0 h-16 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
          </div>
        </div>

        {/* AI Output Sidebar */}
        <aside className="w-full lg:w-96 lg:min-w-[384px] shrink-0 lg:h-full h-80 flex flex-col">
          <AnimatePresence mode="wait">
            {summary || refined || isProcessing ? (
              <motion.div 
                key="has-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-900 rounded-3xl p-1 shadow-2xl h-full overflow-hidden ring-1 ring-white/10 flex flex-col"
              >
                <div className="h-full bg-slate-900 p-6 flex flex-col gap-6 overflow-hidden rounded-[1.35rem]">
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-indigo-400/60 uppercase tracking-[0.2em]">IA Engine</span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-[0.1em]">
                          {isProcessing ? 'Sintetizando...' : 'Resultados'}
                        </h4>
                      </div>
                    </div>
                    {!isProcessing && (
                      <button 
                        onClick={() => { setSummary(''); setRefined(''); }} 
                        className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-6">
                    {isProcessing ? (
                      <div className="h-full flex items-center justify-center min-h-[200px]">
                        <span className="text-white/40 animate-pulse text-[10px] font-bold uppercase tracking-widest text-center px-8 leading-relaxed">
                          Procesando el contexto de la sesión...
                        </span>
                      </div>
                    ) : (
                      <>
                        {refined && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400/50" />
                              Texto Corregido
                            </div>
                            <div className="text-sm font-medium leading-relaxed text-slate-300 italic bg-white/[0.03] p-5 rounded-2xl border border-white/5 shadow-inner">
                              {refined}
                            </div>
                          </div>
                        )}
                        {summary && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                              <Zap className="w-3.5 h-3.5 text-emerald-400/50" />
                              Puntos Clave ({targetType})
                            </div>
                            <div className="text-sm font-semibold leading-relaxed text-slate-100 whitespace-pre-wrap bg-white/[0.03] p-5 rounded-2xl border border-white/5 shadow-inner">
                              {summary}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">Panel de Inteligencia</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[250px]">
                  Pulse "Resumir IA" cuando haya terminado de hablar para procesar la información.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </motion.div>
  );
}
