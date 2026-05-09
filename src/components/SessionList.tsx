import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, writeBatch, getDocs, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Session } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, FileText, Search, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export default function SessionList({ user }: { user: User }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFormatConfirm, setShowFormatConfirm] = useState(false);

  const handleFormatAllConfirmed = async () => {
    setIsDeleting(true);
    setShowFormatConfirm(false);
    try {
      const batch = writeBatch(db);
      sessions.forEach(session => {
        if (session.id) {
          batch.delete(doc(db, 'sessions', session.id));
        }
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'sessions/bulk');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormatAll = () => setShowFormatConfirm(true);

  useEffect(() => {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    return unsubscribe;
  }, [user.uid]);

  const filteredSessions = sessions.filter(s => 
    (s.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-slate-50"
    >
      <header className="h-auto md:h-16 py-4 md:py-0 border-b border-slate-200 bg-white px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 md:gap-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Biblioteca base de <span className="text-slate-400 font-medium">Archivos</span></h2>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full md:w-auto">
          <button
            onClick={handleFormatAll}
            disabled={isDeleting || sessions.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-red-100 w-full md:w-auto shrink-0"
          >
            {isDeleting ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Formatear
          </button>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar registros de audio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-lg pl-10 pr-4 py-2 text-xs font-bold uppercase tracking-tighter focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link 
                  to={`/session/${session.id}`}
                  className="block p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group relative"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resumen: <span className="text-indigo-500">{session.summaryType || 'General'}</span></span>
                    <div className="p-1 px-2 bg-slate-50 rounded font-mono text-[9px] text-slate-400 group-hover:text-indigo-600 transition-colors">
                      {session.createdAt && format(session.createdAt.toDate(), 'HH:mm')}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{session.title || 'Sin Título'}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 min-h-[2.5rem] opacity-70 mb-4">{session.transcript}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      <Calendar className="w-3 h-3" />
                      {session.createdAt && format(session.createdAt.toDate(), 'MMM dd, yyyy')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center flex-col text-center space-y-6 opacity-30">
             <div className="w-20 h-20 border-2 border-dashed border-slate-400 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8" />
             </div>
             <p className="font-bold text-sm tracking-widest uppercase">No Se Detectaron Archivos</p>
          </div>
        )}
      </div>

      <footer className="h-16 bg-white border-t border-slate-200 px-8 flex items-center shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Total de Registros de Audio Guardados: <span className="text-indigo-600">{sessions.length} Sesiones</span>
          </p>
      </footer>

      {showFormatConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4">¿Formatear Historial?</h3>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">
              Esta acción borrará permanentemente TODOS tus archivos grabados hasta ahora. No se puede deshacer.
            </p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setShowFormatConfirm(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleFormatAllConfirmed}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors"
              >
                Formatear
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
