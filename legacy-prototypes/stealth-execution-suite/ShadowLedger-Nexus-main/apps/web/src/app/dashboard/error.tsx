// Built by vsrupeshkumar
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <div className="w-10 h-10 border-2 border-red-500 rounded-full flex items-center justify-center font-bold text-red-500">!</div>
      </div>
      <h2 className="text-3xl font-bold mb-2 tracking-tight text-glow-red">Nexus System Failure</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        An unhandled exception has occurred in the Stealth Executive Suite core. The automated recovery system is attempting to stabilize the environment.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all border border-white/10"
        >
          Attempt Stabilization
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-8 py-3 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-xl font-bold transition-all border border-red-500/30"
        >
          Abort to Dashboard
        </button>
      </div>
      <div className="mt-12 text-[10px] font-mono text-muted-foreground opacity-30">
        ERROR_DIGEST: {error.digest || 'UNKNOWN_MALFUNCTION'}
      </div>
    </div>
  );
}
