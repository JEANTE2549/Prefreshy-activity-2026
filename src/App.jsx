import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PlayerView from './views/PlayerView.jsx';
import OrganizerView from './views/OrganizerView.jsx';
import ProjectorView from './views/ProjectorView.jsx';
import AuctionPlaceholderView from './views/AuctionPlaceholderView.jsx';
import { LogOut, Lock, Play, Settings, Layers, UserPlus, Info } from 'lucide-react';

const socket = io(window.location.origin);

function App() {
  const [currentView, setCurrentView] = useState('landing'); // landing | player-name | admin-login | admin-register | admin-hub | player | projector | organizer | auction
  
  // Player Auth State
  const [pinCode, setPinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  
  // Admin Auth State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [regKey, setRegKey] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [gameState, setGameState] = useState({
    gameState: 'LOBBY',
    currentQuestionId: null,
    activeQuestion: null,
    submissionsCount: 0,
    questions: [],
    config: {
      startingTokens: 100,
      participationReward: 2,
      correctPredictionReward: 10,
      goldenGoalReward: 20,
      timerDuration: 0,
      revealStyle: 'VAR'
    },
    timerSecondsRemaining: 0,
    questionStats: []
  });
  
  const [standings, setStandings] = useState([]);
  const [playerId, setPlayerId] = useState('');

  // Fetch unique player UUID from local storage
  useEffect(() => {
    let id = localStorage.getItem('python_wc_player_id');
    if (!id) {
      id = 'p-' + Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('python_wc_player_id', id);
    }
    setPlayerId(id);
    
    // Auto-reclaim player room and name if stored
    const savedRoomId = localStorage.getItem('python_wc_room_id');
    const savedRoomName = localStorage.getItem('python_wc_room_name');
    const savedName = localStorage.getItem('python_wc_player_name');
    if (savedRoomId && savedRoomName && savedName) {
      setRoomId(savedRoomId);
      setRoomName(savedRoomName);
      setNickname(savedName);
      setCurrentView('player');
    }
  }, []);

  // Sync state & handle socket events for active room
  useEffect(() => {
    if (!roomId) return;

    // Connect to room channel
    socket.emit('enter-room', { roomId, role: currentView, playerId }, (res) => {
      if (res.success) {
        setGameState(prev => ({
          ...prev,
          gameState: res.gameState,
          currentQuestionId: res.currentQuestionId,
          activeQuestion: res.activeQuestion,
          submissionsCount: res.submissionsCount,
          config: res.config,
          timerSecondsRemaining: res.timerSecondsRemaining,
          submittedPlayerIds: res.submittedPlayerIds,
          questions: res.questions
        }));
        setStandings(res.standings);
      } else {
        console.error('Failed to enter room:', res.error);
      }
    });

    // Fetch initial standings via HTTP API
    fetch(`/api/standings/${roomId}`)
      .then(res => res.json())
      .then(data => setStandings(data))
      .catch(err => console.error('Error fetching standings:', err));

  }, [roomId, currentView, playerId]);

  // Socket broadcast listeners
  useEffect(() => {
    socket.on('state-sync', (state) => {
      setGameState(prev => ({ ...prev, ...state }));
    });

    socket.on('timer-tick', (seconds) => {
      setGameState(prev => ({ ...prev, timerSecondsRemaining: seconds }));
    });

    socket.on('standings-update', (data) => {
      setStandings(data);
    });

    socket.on('submission-count-update', ({ count, total, submittedPlayerIds }) => {
      setGameState(prev => ({ 
        ...prev, 
        submissionsCount: count,
        totalPlayers: total,
        submittedPlayerIds: submittedPlayerIds
      }));
    });

    socket.on('questions-update', (questions) => {
      setGameState(prev => ({ ...prev, questions }));
    });

    socket.on('reveal-suspense-start', ({ style, ms }) => {
      setGameState(prev => ({ 
        ...prev, 
        gameState: 'REVEAL_SUSPENSE',
        revealStyle: style,
        revealMs: ms
      }));
    });

    socket.on('results-revealed', (results) => {
      setGameState(prev => ({
        ...prev,
        gameState: 'REVEALED',
        lastResults: results
      }));
      if (results.players) {
        setStandings(results.players);
      }
      if (results.questionStats) {
        setGameState(prev => ({ ...prev, questionStats: results.questionStats }));
      }
    });

    return () => {
      socket.off('state-sync');
      socket.off('timer-tick');
      socket.off('standings-update');
      socket.off('submission-count-update');
      socket.off('questions-update');
      socket.off('reveal-suspense-start');
      socket.off('results-revealed');
    };
  }, []);

  // Player Handlers
  const handleVerifyPin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!pinCode.trim()) return;

    fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinCode.trim() })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setRoomId(data.roomId);
          setRoomName(data.roomName);
          setCurrentView('player-name');
        } else {
          setAuthError(data.error || 'Invalid Game PIN');
        }
      })
      .catch(() => setAuthError('Server connection error. Please try again.'));
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    setAuthError('');
    const name = nickname.trim();
    if (!name) {
      setAuthError('โปรดระบุชื่อเล่นจริงของคุณก่อนเข้าห้อง!');
      return;
    }

    socket.emit('join-game', { roomId, id: playerId, name }, (res) => {
      if (res.success) {
        localStorage.setItem('python_wc_player_name', name);
        localStorage.setItem('python_wc_room_id', roomId);
        localStorage.setItem('python_wc_room_name', roomName);
        setCurrentView('player');
      } else {
        setAuthError(res.error || 'Failed to join.');
      }
    });
  };

  // Admin Handlers
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAuthError('Please fill in both fields.');
      return;
    }

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: adminUsername.trim(), 
        password: adminPassword.trim() 
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setAdminMode(true);
          setCurrentView('admin-hub');
        } else {
          setAuthError(data.error || 'Incorrect username or password PIN');
        }
      })
      .catch(() => setAuthError('Connection error.'));
  };

  const handleAdminRegister = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!adminUsername.trim() || !adminPassword.trim() || !regKey.trim()) {
      setAuthError('All fields are required.');
      return;
    }

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: adminUsername.trim(),
        password: adminPassword.trim(),
        regKey: regKey.trim()
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setAdminPassword('');
          setRegKey('');
          setAuthError('Registration successful! Please login.');
          setCurrentView('admin-login');
        } else {
          setAuthError(data.error || 'Registration failed.');
        }
      })
      .catch(() => setAuthError('Connection error.'));
  };

  const handleLogout = () => {
    localStorage.removeItem('python_wc_room_id');
    localStorage.removeItem('python_wc_room_name');
    localStorage.removeItem('python_wc_player_name');
    setRoomId('');
    setRoomName('');
    setNickname('');
    setAdminMode(false);
    setPinCode('');
    setAdminUsername('');
    setAdminPassword('');
    setRegKey('');
    setAuthError('');
    setCurrentView('landing');
  };

  // Render Functions
  if (currentView === 'landing') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)',
        padding: '20px',
        color: '#fff'
      }}>
        <div className="glass-panel" style={{
          padding: '40px 30px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          borderRadius: '24px'
        }}>
          <div style={{ fontSize: '70px', marginBottom: '15px', animation: 'bounce-ball 2s infinite ease-in-out' }}>⚽</div>
          <h1 style={{ fontSize: '32px', fontWeight: '950', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Python World Cup
          </h1>
          <p style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase', marginBottom: '30px', letterSpacing: '2px' }}>
            PREDICTION CHALLENGE
          </p>

          <form onSubmit={handleVerifyPin}>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              placeholder="Game PIN"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '22px',
                fontWeight: '800',
                textAlign: 'center',
                borderRadius: '14px',
                border: '2px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                outline: 'none',
                marginBottom: '15px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#c084fc'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />

            {authError && (
              <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', padding: '10px', borderRadius: '10px', marginBottom: '15px', fontSize: '14px', fontWeight: '600' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: '18px', background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)' }}>
              Enter ⚽
            </button>
          </form>
        </div>

        <div style={{ marginTop: '40px' }}>
          <button 
            onClick={() => { setAuthError(''); setCurrentView('admin-login'); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.target.style.color = '#c084fc'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.3)'}
          >
            <Lock size={14} /> Organizer Sign In
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'player-name') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0e1e38 0%, #050a14 100%)',
        padding: '20px',
        color: '#fff'
      }}>
        <div className="glass-panel" style={{
          padding: '40px 30px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>🏟️ ENTER PLAYING FIELD</h2>
          <span style={{ fontSize: '12px', background: 'rgba(0, 230, 118, 0.1)', color: 'var(--pitch-accent)', padding: '2px 10px', borderRadius: '15px', display: 'inline-block', marginBottom: '25px', fontWeight: 'bold' }}>
            Room: {roomName}
          </span>

          <form onSubmit={handleJoinGame}>
            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                NICKNAME
              </label>
              <input
                type="text"
                placeholder="ชื่อเล่นจริงของคุณ (e.g. Somchai)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={15}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--pitch-accent)', display: 'block', marginTop: '6px' }}>
                * โปรดระบุชื่อเล่นจริงของคุณสำหรับการเก็บสถิติรางวัล (Please use your real nickname)
              </span>
            </div>

            {authError && (
              <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
                {authError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button type="button" className="btn-secondary" onClick={() => setCurrentView('landing')} style={{ flex: 1 }}>
                Back
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Enter Stadium 🏟️
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'admin-login') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0d16',
        padding: '20px',
        color: '#fff'
      }}>
        <div className="glass-panel" style={{
          padding: '40px 30px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Lock size={22} style={{ color: '#00e676' }} /> REFEREE SIGN IN
          </h2>

          <form onSubmit={handleAdminLogin}>
            <input
              type="text"
              placeholder="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                outline: 'none',
                marginBottom: '15px'
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                outline: 'none',
                marginBottom: '15px'
              }}
            />

            {authError && (
              <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '15px', background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)', color: '#07170f' }}>
              Sign In
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '10px' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setCurrentView('landing')}>
                Back to Play
              </button>
              <button type="button" style={{ background: 'none', border: 'none', color: '#00e676', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setAuthError(''); setCurrentView('admin-register'); }}>
                Register Account
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'admin-register') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0d16',
        padding: '20px',
        color: '#fff'
      }}>
        <div className="glass-panel" style={{
          padding: '40px 30px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <UserPlus size={22} style={{ color: '#a855f7' }} /> ORGANIZER SIGN UP
          </h2>

          <form onSubmit={handleAdminRegister}>
            <input
              type="text"
              placeholder="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                outline: 'none',
                marginBottom: '15px'
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                outline: 'none',
                marginBottom: '15px'
              }}
            />

            <input
              type="text"
              placeholder="Event Registration Key"
              value={regKey}
              onChange={(e) => setRegKey(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                outline: 'none',
                marginBottom: '15px'
              }}
            />

            {authError && (
              <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '15px', background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}>
              Sign Up
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', fontSize: '13px', marginTop: '10px' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => { setAuthError(''); setCurrentView('admin-login'); }}>
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'admin-hub') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#070a13',
        color: '#fff',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '13px', textTransform: 'uppercase', color: '#00e676', fontWeight: '800', letterSpacing: '1px' }}>Overview</span>
              <h1 style={{ fontSize: '28px', fontWeight: '900', marginTop: '4px' }}>Organizer Hub</h1>
            </div>
            <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </header>

          <p style={{ color: '#a0aec0', marginBottom: '30px', fontSize: '15px' }}>
            Select a game to open its presenter view or control board.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px' }}>
            
            {/* Prediction Challenge Workspace Card */}
            <div 
              className="glass-panel" 
              style={{
                padding: '30px',
                background: 'rgba(25, 30, 48, 0.55)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 230, 118, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '850', color: '#fff' }}>1. Prediction Challenge</h3>
                <span style={{ fontSize: '12px', color: '#00e676', background: 'rgba(0, 230, 118, 0.1)', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '6px', fontWeight: 'bold' }}>
                  Game PIN: 2026
                </span>
                <p style={{ marginTop: '10px', fontSize: '13px', color: '#a0aec0', lineHeight: '1.4' }}>
                  Players predict collective behavior to win Fan Tokens. High-suspense screen outputs and Ref settings panel.
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)', color: '#07170f' }}
                  onClick={() => {
                    setRoomId('prediction');
                    setRoomName('Prediction Challenge');
                    setAdminMode(true);
                    setCurrentView('projector');
                  }}
                >
                  <Play size={14} /> Open Projector (Admin)
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => {
                    setRoomId('prediction');
                    setRoomName('Prediction Challenge');
                    setAdminMode(true);
                    setCurrentView('organizer');
                  }}
                >
                  <Settings size={14} /> Organizer Panel
                </button>
              </div>
            </div>

            {/* Python Auction Workspace Card */}
            <div 
              className="glass-panel" 
              style={{
                padding: '30px',
                background: 'rgba(25, 30, 48, 0.55)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '850', color: '#fff' }}>2. Python Auction</h3>
                <span style={{ fontSize: '12px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '6px', fontWeight: 'bold' }}>
                  Game PIN: 1127
                </span>
                <p style={{ marginTop: '10px', fontSize: '13px', color: '#a0aec0', lineHeight: '1.4' }}>
                  Final-day python auction bidding arena. Converts player tokens from predictions into bidding power.
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                  onClick={() => {
                    setRoomId('auction');
                    setRoomName('Python Auction');
                    setAdminMode(true);
                    setCurrentView('auction');
                  }}
                >
                  <Layers size={14} /> Open Auction Room
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'player':
        return (
          <PlayerView 
            socket={socket} 
            playerId={playerId} 
            gameState={gameState} 
            standings={standings}
            roomId={roomId}
            roomName={roomName}
            onLeaveRoom={handleLogout}
          />
        );
      case 'projector':
        return (
          <ProjectorView 
            socket={socket} 
            gameState={gameState} 
            standings={standings} 
            roomId={roomId}
            roomName={roomName}
            adminMode={adminMode}
            onBackToHub={() => setCurrentView('admin-hub')}
          />
        );
      case 'organizer':
        return (
          <OrganizerView 
            socket={socket} 
            gameState={gameState} 
            standings={standings} 
            roomId={roomId}
            roomName={roomName}
            onBackToHub={() => setCurrentView('admin-hub')}
          />
        );
      case 'auction':
        return (
          <AuctionPlaceholderView
            roomId={roomId}
            roomName={roomName}
            onBackToHub={() => setCurrentView('admin-hub')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="stadium-overlay"></div>
      {renderActiveView()}
    </>
  );
}

export default App;
