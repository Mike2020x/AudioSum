import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { generateSessionNotes } from '../lib/gemini';
import { Session } from '../types';
import { ArrowLeft, Trash2, Save, Sparkles, LayoutGrid, Type, Languages, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export default function SessionDetail({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      if (!id) return;
      try {
        const docRef = doc(db, 'sessions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Session;
          setSession(data);
          setNotes(data.notes || '');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `sessions/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  const handleUpdateNotes = async () => {
    if (!id) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'sessions', id), { notes });
      alert('¡Notas actualizadas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAIAnalysis = async () => {
    if (!session?.transcript) return;
    setIsProcessing(true);
    const aiNotes = await generateSessionNotes(session.transcript);
    setNotes(prev => prev + '\n\n' + aiNotes);
    setIsProcessing(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      navigate('/history');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  if (loading) return <div className="p-8 font-mono animate-pulse">Cargando detalles de sesión...</div>;
  if (!session) return <div className="p-8 text-red-500 font-bold">Sesión no encontrada.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-slate-50 overflow-hidden"
    >
      <header className="h-auto md:h-16 py-4 md:py-0 border-b border-slate-200 bg-white px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <button 
            onClick={() => navigate('/history')}
            className="p-2.5 rounded-lg hover:bg-slate-100 border border-slate-100 transition-colors text-slate-500 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="min-w-0 pr-2">
            <h2 className="text-sm md:text-lg font-bold tracking-tight text-slate-800 truncate">{session.title}</h2>
            <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              <span>{format(session.createdAt.toDate(), 'PPP')}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
              <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none shrink-0">{session.summaryType || 'General'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto justify-end">
          <button 
            onClick={handleDelete}
            className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleUpdateNotes}
            disabled={isProcessing}
            className="bg-slate-800 text-white px-4 md:px-6 py-2.5 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 shadow-sm transition-all flex-1 md:flex-none"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Transcripts */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Type className="w-4 h-4 text-indigo-500" />
                  Registro de Transcripción Principal
                </h3>
              </div>
              <p className="text-lg font-medium leading-relaxed text-slate-700 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                {session.transcript}
              </p>
            </div>

            <div className="bg-slate-900 text-white p-7 rounded-2xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-8 relative z-10">
                <Languages className="w-4 h-4 text-emerald-400" />
                Resultados de Síntesis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-4 bg-indigo-500 rounded-full" />
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contenido Pulido</h4>
                  </div>
                  <div className="bg-white/5 p-5 rounded-xl border border-white/5 backdrop-blur-sm min-h-[12rem]">
                    <p className="text-sm font-medium italic leading-relaxed text-slate-300">
                      {session.refinedTranscript || <span className="opacity-30">No hay datos de refinamiento disponibles.</span>}
                    </p>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen IA</h4>
                  </div>
                  <div className="bg-emerald-500/5 p-5 rounded-xl border border-emerald-500/10 backdrop-blur-sm min-h-[12rem] whitespace-pre-wrap">
                    <p className="text-sm font-medium leading-relaxed text-emerald-50/90">
                      {session.summary || <span className="opacity-30">No hay resumen disponible para esta sesión.</span>}
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Right Column: Training Insights */}
          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-emerald-600" />
                  Revisión de Notas
                </h3>
              </div>
              
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Registra observaciones sobre la reunión o notas clave..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-5 text-sm font-medium text-slate-600 outline-none focus:bg-white focus:ring-2 ring-indigo-500/10 transition-all resize-none placeholder:text-slate-300"
              />

              <div className="mt-6 pt-6 border-t border-slate-50">
                <button 
                  onClick={handleGenerateAIAnalysis}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-100 hover:text-indigo-800 shadow-sm border border-indigo-100 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 shadow-sm" />
                  Generar Acciones (To-dos)
                </button>
                <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-3 opacity-60">
                  Impulsado por análisis de IA
                </p>
              </div>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-2xl text-white shadow-xl flex flex-col gap-4">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Métricas de Sesión</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter italic">Garantía de Calidad</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3 h-1 border-t border-white/5 pt-4 opacity-50 text-[10px] font-mono">
                  <div className="flex justify-between"><span>VOCAB</span><span className="text-emerald-400">92%</span></div>
                  <div className="flex justify-between"><span>FLOW</span><span className="text-emerald-400">88%</span></div>
               </div>
            </div>
          </aside>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4">¿Eliminar esta sesión?</h3>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">
              Esta acción no se puede deshacer. La transcripción y las notas asociadas se perderán permanentemente.
            </p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteConfirmed}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
