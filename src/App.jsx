import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PlayerView from './views/PlayerView.jsx';
import OrganizerView from './views/OrganizerView.jsx';
import ProjectorView from './views/ProjectorView.jsx';
import AuctionPlaceholderView from './views/AuctionPlaceholderView.jsx';
import { LogOut, Lock, Play, Settings, Layers, UserPlus, Info } from 'lucide-react';

const socket = io(window.location.origin);

const RUDE_WORDS = [
  'ควย', 'เย็ด', 'หี', 'แตด', 'หำ', 'มึง', 'เหี้ย', 'สัส', 'สัด', 'ระยำ', 'ชาติหมา', 'ดอกทอง', 'แรด',
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'dick', 'asshole', 'พ่อง', 'ตาย', 'แม่ง', 'ลูกกระหรี่', 'อีดอก'
];

function isRudeName(name) {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[\s\.\-\_\@]/g, '');
  return RUDE_WORDS.some(word => normalized.includes(word));
}

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
    pin: '',
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
  const [adminToken, setAdminToken] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [playerPinInput, setPlayerPinInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Auto-reset secret click count if idle for 1s
  useEffect(() => {
    if (clickCount > 0) {
      const t = setTimeout(() => setClickCount(0), 1000);
      return () => clearTimeout(t);
    }
  }, [clickCount]);

  // Fetch unique player UUID from local storage
  useEffect(() => {
    let id = localStorage.getItem('python_wc_player_id');
    if (!id) {
      id = 'p-' + Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('python_wc_player_id', id);
    }

    // Auto-reclaim state on refresh (Admin vs Player)
    const savedRoomId = localStorage.getItem('python_wc_room_id');
    const savedRoomName = localStorage.getItem('python_wc_room_name');
    const isAdmin = localStorage.getItem('python_wc_admin_mode') === 'true';
    const savedView = localStorage.getItem('python_wc_current_view');
    const savedAdminToken = localStorage.getItem('python_wc_admin_token');

    if (isAdmin && savedView) {
      setRoomId(savedRoomId || '');
      setRoomName(savedRoomName || '');
      setAdminMode(true);
      setAdminToken(savedAdminToken || '');
      setCurrentView(savedView);
    } else {
      const savedUsername = localStorage.getItem('python_wc_player_username');
      const savedPin = localStorage.getItem('python_wc_player_pin');
      if (savedUsername && savedPin) {
        setNickname(savedUsername);
        setPlayerId(savedUsername);
        setPlayerPinInput(savedPin);

        if (savedRoomId && savedRoomName) {
          setRoomId(savedRoomId);
          setRoomName(savedRoomName);
          setCurrentView('player');
        } else {
          setCurrentView('enter-room');
        }
      }
    }
  }, []);

  // Save admin and navigation states to local storage on transitions
  useEffect(() => {
    if (adminMode) {
      localStorage.setItem('python_wc_admin_mode', 'true');
      if (roomId) localStorage.setItem('python_wc_room_id', roomId);
      if (roomName) localStorage.setItem('python_wc_room_name', roomName);
      localStorage.setItem('python_wc_current_view', currentView);
      if (adminToken) localStorage.setItem('python_wc_admin_token', adminToken);
    } else if (currentView === 'player') {
      localStorage.removeItem('python_wc_admin_mode');
      localStorage.removeItem('python_wc_current_view');
      localStorage.removeItem('python_wc_admin_token');
    }
  }, [adminMode, currentView, roomId, roomName, adminToken]);

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
          questions: res.questions,
          pin: res.pin || ''
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

  // Handle automatic socket reconnection and room re-entry
  useEffect(() => {
    const handleReconnect = () => {
      if (roomId) {
        console.log('Socket connected/reconnected. Re-entering room:', roomId);
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
              questions: res.questions,
              pin: res.pin || ''
            }));
            setStandings(res.standings);
          }
        });

        if (currentView === 'player' && nickname) {
          socket.emit('join-game', { roomId, id: playerId, name: nickname });
        }
      }
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [roomId, currentView, playerId, nickname]);

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

    socket.on('auction-price-update', ({ currentBid }) => {
      setGameState(prev => ({ ...prev, currentBid }));
    });

    return () => {
      socket.off('state-sync');
      socket.off('timer-tick');
      socket.off('standings-update');
      socket.off('submission-count-update');
      socket.off('questions-update');
      socket.off('reveal-suspense-start');
      socket.off('results-revealed');
      socket.off('auction-price-update');
    };
  }, []);

  // Player Handlers
  const handlePlayerLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    const user = nickname.trim();
    const pin = playerPinInput.trim();

    if (!user || !pin) {
      setAuthError('Please enter your username and a 4-digit PIN!');
      return;
    }

    fetch('/api/player/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, pin })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('python_wc_player_username', data.username);
          localStorage.setItem('python_wc_player_pin', pin);
          setNickname(data.username);
          setPlayerId(data.username);
          setAuthError('');
          setCurrentView('enter-room');
        } else {
          setAuthError(data.error || 'Server connection error. Please try again.');
        }
      })
      .catch(() => setAuthError('Server connection error. Please try again.'));
  };

  const handlePlayerRegister = (e) => {
    e.preventDefault();
    setAuthError('');
    const user = nickname.trim();
    const pin = playerPinInput.trim();

    if (!user || !pin) {
      setAuthError('Please enter your username and a 4-digit PIN!');
      return;
    }
    if (user.length < 3 || user.length > 15) {
      setAuthError('Please enter a username between 3 and 15 characters!');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setAuthError('PIN must be 4 digits!');
      return;
    }
    if (isRudeName(user)) {
      setAuthError('Please use a polite and appropriate nickname!');
      return;
    }

    fetch('/api/player/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, pin })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('python_wc_player_username', data.username);
          localStorage.setItem('python_wc_player_pin', pin);
          setNickname(data.username);
          setPlayerId(data.username);
          setAuthError('');
          setCurrentView('enter-room');
        } else {
          setAuthError(data.error || 'Server connection error. Please try again.');
        }
      })
      .catch(() => setAuthError('Server connection error. Please try again.'));
  };

  const handleEnterRoom = (e) => {
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
          const rId = data.roomId;
          const rName = data.roomName;

          socket.emit('join-game', { roomId: rId, id: playerId, name: nickname }, (joinRes) => {
            if (joinRes.success) {
              setRoomId(rId);
              setRoomName(rName);
              localStorage.setItem('python_wc_room_id', rId);
              localStorage.setItem('python_wc_room_name', rName);
              setAuthError('');
              setCurrentView('player');
            } else {
              setAuthError(joinRes.error || 'Failed to join playing field.');
            }
          });
        } else {
          setAuthError(data.error || 'Invalid Game PIN');
        }
      })
      .catch(() => setAuthError('Server connection error. Please try again.'));
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('python_wc_room_id');
    localStorage.removeItem('python_wc_room_name');
    setRoomId('');
    setRoomName('');
    setPinCode('');
    setAuthError('');
    setCurrentView('enter-room');
  };

  const handleSecretClick = () => {
    setClickCount(prev => {
      const next = prev + 1;
      if (next >= 7) {
        setAuthError('');
        setCurrentView('admin-login');
        return 0;
      }
      return next;
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
          setAdminToken(data.token);
          localStorage.setItem('python_wc_admin_token', data.token);
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
    localStorage.removeItem('python_wc_player_username');
    localStorage.removeItem('python_wc_player_pin');
    localStorage.removeItem('python_wc_admin_mode');
    localStorage.removeItem('python_wc_current_view');
    localStorage.removeItem('python_wc_admin_token');
    setRoomId('');
    setRoomName('');
    setNickname('');
    setPlayerId('');
    setPlayerPinInput('');
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
          <div onClick={handleSecretClick} style={{ fontSize: '70px', marginBottom: '15px', animation: 'bounce-ball 2s infinite ease-in-out', cursor: 'default', userSelect: 'none' }}>⚽</div>
          <h1 onClick={handleSecretClick} style={{ fontSize: '32px', fontWeight: '950', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'default', userSelect: 'none' }}>
            Python World Cup
          </h1>
          <p style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase', marginBottom: '30px', letterSpacing: '2px' }}>
            PREDICTION CHALLENGE
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', color: '#a7f3d0' }}>
            {isRegisterMode ? '🆕 Create Player Account' : '🔑 Player Sign In'}
          </h2>

          <form onSubmit={isRegisterMode ? handlePlayerRegister : handlePlayerLogin}>
            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                NICKNAME / USERNAME
              </label>
              <input
                type="text"
                placeholder="Nickname or Username"
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
            </div>

            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                4-DIGIT PIN
              </label>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-digit PIN (e.g. 1234)"
                value={playerPinInput}
                onChange={(e) => setPlayerPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  outline: 'none',
                  letterSpacing: '5px',
                  textAlign: 'center'
                }}
              />
            </div>

            {authError && (
              <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)' }}>
              {isRegisterMode ? 'Register & Enter ⚽' : 'Sign In ⚽'}
            </button>
          </form>

          <div style={{ marginTop: '25px', fontSize: '13px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              {isRegisterMode ? 'Already have an account? ' : 'First time playing? '}
            </span>
            <button
              onClick={() => {
                setAuthError('');
                setIsRegisterMode(!isRegisterMode);
              }}
              style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', padding: 0 }}
            >
              {isRegisterMode ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'enter-room') {
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
          <p style={{ color: '#c084fc', fontSize: '14px', marginBottom: '25px', fontWeight: 'bold' }}>
            Welcome, {nickname}! 🏆
          </p>

          <form onSubmit={handleEnterRoom}>
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                GAME PIN CODE
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                placeholder="Game PIN (e.g. 123456)"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>

            {authError && (
              <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                {authError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLogout}
                style={{ flex: 1, padding: '14px' }}
              >
                Sign Out
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, var(--pitch-accent) 0%, #00b0ff 100%)' }}
              >
                Enter Room ⚽
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
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #f59e0b 0%, #ff5252 100%)', color: '#170c00' }}
                  onClick={() => {
                    setRoomId('auction');
                    setRoomName('Python Auction');
                    setAdminMode(true);
                    setCurrentView('projector');
                  }}
                >
                  <Play size={14} /> Open Projector (Admin)
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                  onClick={() => {
                    setRoomId('auction');
                    setRoomName('Python Auction');
                    setAdminMode(true);
                    setCurrentView('organizer');
                  }}
                >
                  <Settings size={14} /> Organizer Panel
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
            onLeaveRoom={handleLeaveRoom}
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
            adminToken={adminToken}
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
            adminToken={adminToken}
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
