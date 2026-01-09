
import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none bg-slate-50">
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 20s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
      
      {/* Blob 1: Deep Emerald - Top Left */}
      <div className="absolute top-0 -left-40 w-[30rem] h-[30rem] bg-emerald-900/10 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
      
      {/* Blob 2: Deep Indigo - Top Right */}
      <div className="absolute top-0 -right-40 w-[30rem] h-[30rem] bg-indigo-900/10 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
      
      {/* Blob 3: Accent Blue - Bottom Left */}
      <div className="absolute -bottom-40 -left-20 w-[30rem] h-[30rem] bg-blue-900/10 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>
      
      {/* Blob 4: Soft Grey - Bottom Right */}
      <div className="absolute -bottom-40 -right-20 w-[30rem] h-[30rem] bg-slate-400/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
    </div>
  );
};

export default AnimatedBackground;
