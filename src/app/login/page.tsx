'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.refresh();
        router.push(callbackUrl);
      } else {
        const data = await res.json();
        setError(data.error || '密碼錯誤');
      }
    } catch (err) {
      setError('發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="input-group-premium">
        <input
          type="password"
          id="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Passcode"
          className="premium-input"
        />
        <div className="input-glow"></div>
      </div>
      
      <button type="submit" className="premium-btn" disabled={isLoading}>
        <div className="btn-shine"></div>
        <span>{isLoading ? "Authenticating..." : "進入系統"}</span>
      </button>

      {error && (
        <div className="premium-error">
           <span className="err-icon">(!)</span> {error}
        </div>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="elite-login-page">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;800&family=JetBrains+Mono:wght@500&display=swap');

        :root {
          --brand-primary: #8b5cf6;
          --brand-secondary: #3b82f6;
          --bg-black: #050508;
          --glass-surface: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.08);
        }

        .elite-login-page {
          min-height: 100vh;
          width: 100vw;
          background: var(--bg-black);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          color: #fff;
          position: relative;
          overflow: hidden;
        }

        /* --- Elite Background Visuals --- */
        .ambient-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .ambient-sphere {
          position: absolute;
          border-radius: 50%;
          filter: blur(150px);
          opacity: 0.4;
          animation: sphereRotate 30s infinite linear;
        }

        .sphere-p {
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
          top: -300px;
          left: -200px;
        }

        .sphere-b {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          bottom: -200px;
          right: -100px;
          animation-direction: reverse;
        }

        @keyframes sphereRotate {
          from { transform: rotate(0deg) translate(0, 0); }
          to { transform: rotate(360deg) translate(50px, 50px); }
        }

        .noise-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          z-index: 2;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        /* --- The Main Card --- */
        .premium-card {
          width: 100%;
          max-width: 460px;
          margin: 24px;
          padding: 80px 60px;
          background: var(--glass-surface);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 56px;
          z-index: 10;
          position: relative;
          box-shadow: 
            0 80px 150px -30px rgba(0, 0, 0, 0.8),
            inset 0 0 0 1px rgba(255, 255, 255, 0.02);
          animation: cardSlideIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(100px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .premium-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 56px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent, rgba(139, 92, 246, 0.2));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* --- Branding --- */
        .brand-section {
          text-align: center;
          margin-bottom: 60px;
        }

        .brand-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
          border-radius: 20px;
          margin: 0 auto 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 15px 30px rgba(139, 92, 246, 0.4);
          animation: floatLogo 4s infinite ease-in-out;
        }

        @keyframes floatLogo {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }

        .main-title {
          font-size: 42px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.06em;
          background: linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.5));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }

        .sub-title {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.3);
          margin-top: 12px;
          text-transform: uppercase;
          letter-spacing: 0.4em;
          font-weight: 600;
        }

        /* --- Form Elements --- */
        .login-form {
          width: 100%;
        }

        .input-group-premium {
          position: relative;
          margin-bottom: 40px;
        }

        .premium-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 28px;
          color: #fff;
          font-size: 24px;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          outline: none;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.1em;
        }

        .premium-input:focus {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--brand-primary);
          box-shadow: 0 0 50px rgba(139, 92, 246, 0.15);
        }

        .input-glow {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--brand-primary), transparent);
          transition: width 0.6s ease;
        }

        .premium-input:focus ~ .input-glow {
          width: 80%;
        }

        /* --- Premium Button --- */
        .premium-btn {
          width: 100%;
          padding: 24px;
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
          border: none;
          border-radius: 24px;
          color: #fff;
          font-size: 19px;
          font-weight: 800;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 20px 40px -10px rgba(139, 92, 246, 0.5);
        }

        .premium-btn:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 30px 60px -10px rgba(139, 92, 246, 0.6);
          filter: brightness(1.1);
        }

        .btn-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: skewX(-20deg);
          animation: shineMove 4s infinite linear;
        }

        @keyframes shineMove {
          0% { left: -100%; }
          30%, 100% { left: 200%; }
        }

        .premium-error {
          margin-top: 24px;
          color: #fb7185;
          font-size: 14px;
          text-align: center;
          font-weight: 500;
        }

        /* --- Footer --- */
        .elite-footer {
          position: absolute;
          bottom: 50px;
          color: rgba(255, 255, 255, 0.15);
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.3em;
          text-transform: uppercase;
        }
      `}</style>

      {/* Background elements */}
      <div className="ambient-bg">
        <div className="ambient-sphere sphere-p" />
        <div className="ambient-sphere sphere-b" />
      </div>
      <div className="noise-overlay" />

      <div className="premium-card">
        <header className="brand-section">
          <div className="brand-icon">🔭</div>
          <h1 className="main-title">AI 自家新聞台</h1>
          <div className="sub-title">Intelligence Hub</div>
        </header>

        <Suspense fallback={<div>Loading Interface...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      <footer className="elite-footer">
        Created by 周身刀研究所
      </footer>
    </div>
  );
}
