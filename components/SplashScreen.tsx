
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#0B132B] flex flex-col items-center justify-center z-[200] overflow-hidden">
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.6; }
          100% { transform: translateY(0px) scale(1); opacity: 0.3; }
        }
        @keyframes shutter-spin {
          0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
          30% { transform: rotate(90deg) scale(1.1); opacity: 1; }
          60% { transform: rotate(90deg) scale(1); }
          70% { transform: rotate(90deg) scale(0.95); } /* Snap photo */
          100% { transform: rotate(90deg) scale(1); }
        }
        @keyframes lens-flare {
            0% { opacity: 0; transform: translate(-100%, -100%) rotate(45deg); }
            65% { opacity: 0; }
            70% { opacity: 0.8; transform: translate(0, 0) rotate(45deg); } /* Flash */
            100% { opacity: 0; transform: translate(100%, 100%) rotate(45deg); }
        }
        @keyframes text-focus {
          0% { filter: blur(10px); opacity: 0; letter-spacing: 10px; }
          100% { filter: blur(0); opacity: 1; letter-spacing: normal; }
        }
        @keyframes progress-load {
            0% { width: 0%; }
            100% { width: 100%; }
        }
        .bokeh {
            position: absolute;
            border-radius: 50%;
            filter: blur(20px);
            z-index: -1;
            animation: float 6s infinite ease-in-out;
        }
      `}</style>

      {/* Dynamic Background Bokeh */}
      <div className="bokeh bg-[#F7C873] w-64 h-64 top-[-50px] left-[-50px] opacity-20" style={{ animationDelay: '0s' }}></div>
      <div className="bokeh bg-blue-600 w-96 h-96 bottom-[-100px] right-[-100px] opacity-10" style={{ animationDelay: '2s' }}></div>
      <div className="bokeh bg-purple-500 w-48 h-48 top-[20%] right-[10%] opacity-15" style={{ animationDelay: '4s' }}></div>

      {/* Main Logo Container */}
      <div className="relative mb-8">
        {/* Lens Shutter SVG */}
        <div style={{ animation: 'shutter-spin 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer Ring */}
                <circle cx="50" cy="50" r="45" stroke="#F7C873" strokeWidth="2" strokeDasharray="10 5" opacity="0.8" />
                <circle cx="50" cy="50" r="38" stroke="#F7C873" strokeWidth="1" />
                
                {/* Shutter Blades */}
                <g className="origin-center">
                    <path d="M50 50 L50 10 A40 40 0 0 1 85 25 Z" fill="#F7C873" fillOpacity="0.8" stroke="#0B132B" strokeWidth="1" />
                    <path d="M50 50 L85 25 A40 40 0 0 1 90 65 Z" fill="#F7C873" fillOpacity="0.6" stroke="#0B132B" strokeWidth="1" />
                    <path d="M50 50 L90 65 A40 40 0 0 1 50 90 Z" fill="#F7C873" fillOpacity="0.8" stroke="#0B132B" strokeWidth="1" />
                    <path d="M50 50 L50 90 A40 40 0 0 1 15 75 Z" fill="#F7C873" fillOpacity="0.6" stroke="#0B132B" strokeWidth="1" />
                    <path d="M50 50 L15 75 A40 40 0 0 1 10 35 Z" fill="#F7C873" fillOpacity="0.8" stroke="#0B132B" strokeWidth="1" />
                    <path d="M50 50 L10 35 A40 40 0 0 1 50 10 Z" fill="#F7C873" fillOpacity="0.6" stroke="#0B132B" strokeWidth="1" />
                </g>
                
                {/* Center Lens Reflection */}
                <circle cx="50" cy="50" r="12" fill="#0B132B" />
                <circle cx="48" cy="48" r="4" fill="white" opacity="0.5" />
            </svg>
        </div>
        
        {/* Flash Effect Overlay */}
        <div className="absolute inset-0 bg-white rounded-full mix-blend-overlay pointer-events-none" style={{ animation: 'lens-flare 2.5s ease-out infinite' }}></div>
      </div>

      {/* Text Reveal */}
      <div className="text-center z-10">
        <h1 
            className="text-5xl font-bold text-white mb-2 font-['Poppins'] tracking-tight"
            style={{ animation: 'text-focus 1.2s ease-out forwards', animationDelay: '0.5s', opacity: 0 }}
        >
            Studio<span className="text-[#F7C873]">Pay</span>
        </h1>
        <p 
            className="text-gray-400 text-sm tracking-[0.3em] uppercase"
            style={{ animation: 'text-focus 1s ease-out forwards', animationDelay: '0.8s', opacity: 0 }}
        >
            Studio Manager
        </p>
      </div>

      {/* Loading Progress Bar */}
      <div className="w-48 h-1 bg-gray-800 rounded-full mt-12 overflow-hidden relative">
          <div 
            className="h-full bg-[#F7C873] shadow-[0_0_10px_#F7C873]"
            style={{ animation: 'progress-load 4.8s ease-in-out forwards' }}
          ></div>
      </div>
    </div>
  );
};

export default SplashScreen;
