/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Mic, History, Settings, LogOut, MessageSquare, ShieldCheck, Zap, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import LiveSession from './components/LiveSession';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';

function AuthGuard({ children, user }: { children: React.ReactNode; user: User | null | undefined }) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (user === undefined) return <div className="h-screen flex items-center justify-center font-mono animate-pulse text-slate-400">Iniciando Sistema...</div>;
  if (!user) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
    <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-2xl shadow-xl border border-slate-200">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Zap className="w-8 h-8 text-white fill-current" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">AudioSumm <span className="text-indigo-600">AI</span></h1>
        <p className="text-slate-500 font-sans text-sm">Herramienta Automática para Transcripción y Resumen de Notas de Voz.</p>
      </div>
      <button 
        id="login-button"
        disabled={isLoggingIn}
        onClick={async () => {
          setIsLoggingIn(true);
          try {
            await signInWithPopup(auth, new GoogleAuthProvider());
          } catch (error: any) {
            if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
              console.log('User cancelled login or popup was closed.');
            } else {
              console.error('Login error:', error);
            }
          } finally {
            setIsLoggingIn(false);
          }
        }}
        className="w-full bg-slate-900 text-white py-3.5 px-8 rounded-xl font-sans font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
      >
        {isLoggingIn ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <UserIcon className="w-5 h-5" />
        )}
        {isLoggingIn ? 'Conectando...' : 'Acceso al Sistema'}
      </button>
    </div>
  </div>;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  return (
    <BrowserRouter>
      <AuthGuard user={user}>
        <div className="flex flex-col md:flex-row h-[100dvh] bg-slate-50 overflow-hidden font-sans text-slate-900">
          {/* Mobile Header */}
          <header className="md:hidden h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded-full"></div>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">AudioSumm <span className="text-indigo-600 font-medium">AI</span></h1>
            </Link>
            <div className="flex items-center gap-3">
              <img src={user?.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
            </div>
          </header>

          {/* Desktop Sidebar */}
          <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col shrink-0">
            <div className="h-16 px-6 flex items-center border-b border-slate-100">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white rounded-full"></div>
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-800">AudioSumm <span className="text-indigo-600 font-medium">AI</span></h1>
              </Link>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full w-fit mb-6">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                SISTEMA LISTO
              </div>

              <nav className="space-y-1">
                <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-indigo-600 bg-indigo-50 font-bold text-sm transition-colors group">
                  <Mic className="w-4 h-4" />
                  <span>Área de Trabajo</span>
                </Link>
                <Link to="/history" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold text-sm transition-colors group">
                  <History className="w-4 h-4" />
                  <span>Archivo de Sesiones</span>
                </Link>
              </nav>
            </div>

            <div className="mt-auto p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-2 py-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                <img src={user?.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.displayName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Usuario Grabador</p>
                </div>
              </div>
              <button 
                id="logout-button"
                onClick={() => signOut(auth)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-50">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<LiveSession user={user!} />} />
                <Route path="/history" element={<SessionList user={user!} />} />
                <Route path="/session/:id" element={<SessionDetail user={user!} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden h-16 border-t border-slate-200 bg-white flex items-center justify-around shrink-0 pb-safe">
            <Link to="/" className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 flex-1 py-2">
              <Mic className="w-5 h-5" />
              <span className="text-[10px] font-bold">Grabar</span>
            </Link>
            <Link to="/history" className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 flex-1 py-2">
              <History className="w-5 h-5" />
              <span className="text-[10px] font-bold">Arcón</span>
            </Link>
            <button onClick={() => signOut(auth)} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-500 flex-1 py-2">
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-bold">Salir</span>
            </button>
          </nav>
        </div>
      </AuthGuard>
    </BrowserRouter>
  );
}

