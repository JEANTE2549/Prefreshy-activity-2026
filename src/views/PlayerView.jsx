import React, { useState, useEffect } from 'react';
import { Award, Coins, Flame, Check, X, ShieldAlert, Sparkles, History, User, LogOut } from 'lucide-react';

const RUDE_WORDS = [
  'ควย', 'เย็ด', 'หี', 'แตด', 'หำ', 'มึง', 'กู', 'เหี้ย', 'สัส', 'สัด', 'ระยำ', 'ชาติหมา', 'ดอกทอง', 'แรด',
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'dick', 'asshole', 'พ่อง', 'ตาย', 'แม่ง', 'ลูกกระหรี่', 'อีดอก'
];

function isRudeName(name) {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[\s\.\-\_\@]/g, '');
  return RUDE_WORDS.some(word => normalized.includes(word));
}

function renderQuestionCard(q) {
  if (!q) return null;

  const imgEl = q.imageUrl ? (
    <div style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
      <img
        src={q.imageUrl}
        alt="Question media"
        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '2px solid var(--glass-border)', objectFit: 'contain' }}
      />
    </div>
  ) : null;

  const textEl = (
    <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', lineHeight: '1.4', margin: '0 0 15px 0' }}>{q.text}</h3>
    </div>
  );

  let flexDirection = 'column';
  if (q.imageUrl) {
    if (q.imageAlign === 'BOTTOM') flexDirection = 'column';
    else if (q.imageAlign === 'LEFT') flexDirection = 'row-reverse';
    else if (q.imageAlign === 'RIGHT') flexDirection = 'row';
    else flexDirection = 'column-reverse'; // TOP
  }

  return (
    <div style={{ display: 'flex', flexDirection: flexDirection, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
      {imgEl}
      {textEl}
    </div>
  );
}

function PlayerView({ socket, playerId, nickname, setNickname, gameState, standings, roomId, roomName, onLeaveRoom }) {
  const [joined, setJoined] = useState(() => {
    return !!localStorage.getItem('python_wc_player_nickname');
  });
  const [nicknameInput, setNicknameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [playerInfo, setPlayerInfo] = useState(null);

  // Selection States
  const [answer, setAnswer] = useState(null); // 'YES' | 'NO'
  const [prediction, setPrediction] = useState(null); // 'HI' | 'LOW'
  const [useGoldenGoal, setUseGoldenGoal] = useState(false);
  const [useSilverGoal, setUseSilverGoal] = useState(false);
  const [betLocked, setBetLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGGConfirm, setShowGGConfirm] = useState(false);
  const [showSGConfirm, setShowSGConfirm] = useState(false);

  // Auction specific states
  const [auctionAnswer, setAuctionAnswer] = useState('');
  const [openAnswer, setOpenAnswer] = useState(null);
  const [auctionError, setAuctionError] = useState('');
  const [auctionSuccess, setAuctionSuccess] = useState('');

  // Clear states when a new round starts in auction
  useEffect(() => {
    if (roomId === 'auction') {
      setAuctionAnswer('');
      setOpenAnswer(null);
      setAuctionError('');
      setAuctionSuccess('');
    }
  }, [gameState.currentQuestionId, gameState.gameState]);

  // Find player profile in standings
  const activeProfile = Array.isArray(standings) ? standings.find(p => p.id === playerId) : null;

  // Calculate statistics (declared at top of component to avoid TDZ issues)
  const matches = activeProfile?.matchesPlayed || 0;
  const goals = activeProfile?.goals || 0;
  const misses = activeProfile?.misses || 0;
  const accuracy = matches > 0 ? Math.round((goals / matches) * 100) : 0;
  const streak = activeProfile?.currentStreak || 0;
  const bestStreak = activeProfile?.bestStreak || 0;
  const tokens = activeProfile?.fanTokens || 100;
  const rank = activeProfile?.currentRank || '-';



  // Auto-join if nickname is already cached in localStorage
  useEffect(() => {
    const savedNickname = localStorage.getItem('python_wc_player_nickname');
    if (savedNickname && playerId) {
      handleJoin(savedNickname);
    }
  }, [playerId]);

  // Handle game state resets on client
  useEffect(() => {
    if (gameState.gameState === 'ACTIVE_QUESTION') {
      // Clear selections for new round
      setAnswer(null);
      setPrediction(null);
      setUseGoldenGoal(false);
      setUseSilverGoal(false);
      setBetLocked(false);
      setErrorMessage('');
    }
  }, [gameState.currentQuestionId]);

  function handleJoin(nameToJoin) {
    if (!nameToJoin.trim()) return;
    
    // Client-side Rude Word Validation (Guardian System)
    if (isRudeName(nameToJoin)) {
      setErrorMessage('Please use a polite and appropriate username!');
      return;
    }

    setSubmitting(true);
    const savedPin = localStorage.getItem('python_wc_player_pin') || '';
    socket.emit('join-game', { roomId, id: playerId, name: nameToJoin, pin: savedPin }, (res) => {
      setSubmitting(false);
      if (res.success) {
        setJoined(true);
        setPlayerInfo(res.player);
        setNickname(nameToJoin);
        localStorage.setItem('python_wc_player_nickname', nameToJoin);
        // If a submission exists for current question
        if (res.submissions) {
          setAnswer(res.submissions.answer);
          setPrediction(res.submissions.prediction);
          setUseGoldenGoal(res.submissions.useGoldenGoal);
          setUseSilverGoal(res.submissions.useSilverGoal || false);
          setBetLocked(true);
        }
      } else {
        setErrorMessage(res.error || 'Failed to join.');
      }
    });
  };

  function submitBet(e) {
    e.preventDefault();
    if (!answer || !prediction) {
      setErrorMessage('Please select both your answer and prediction.');
      return;
    }

    setSubmitting(true);
    socket.emit('submit-prediction', {
      roomId,
      playerId,
      answer,
      prediction,
      useGoldenGoal,
      useSilverGoal
    }, (res) => {
      setSubmitting(false);
      if (res.success) {
        setBetLocked(true);
        setErrorMessage('');
      } else {
        setErrorMessage(res.error || 'Failed to lock prediction.');
      }
    });
  };

  // UI rendering before joining
  if (!joined) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', minHeight: '90vh' }}>
        <div className="glass-panel" style={{ padding: '30px', maxWidth: '450px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '10px' }}>🏆</div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Python World Cup
          </h1>
          <p style={{ color: 'var(--pitch-accent)', fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', marginBottom: '25px', letterSpacing: '2px' }}>
            {roomId === 'auction' ? '🔨 PYTHON DUTCH AUCTION 🔨' : '⚽ PREDICTION CHALLENGE ⚽'}
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleJoin(nicknameInput); }}>
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                ENTER NICKNAME
              </label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g. PenaltyKing"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={15}
                required
              />
            </div>

            {errorMessage && (
              <div style={{ color: 'var(--red-card)', display: 'flex', gap: '8px', alignItems: 'center', margin: '15px 0', fontSize: '14px', background: 'rgba(255,23,68,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--red-glow)' }}>
                <ShieldAlert size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Stepping onto pitch...' : 'ENTER STADIUM 🏟️'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  function handleOpenSubmit(choice) {
    setOpenAnswer(choice);
    socket.emit('submit-open-answer', { roomId, playerId, answer: choice }, (res) => {
      if (!res.success) {
        setAuctionError(res.error || 'Failed to submit MCQ answer.');
      }
    });
  }

  function renderAuctionMode() {
    // Current user statistics
    const tokens = activeProfile?.fanTokens || 100;
    const rank = activeProfile?.currentRank || '-';
    const currentPrice = gameState.currentBid || 10;
    const isWinner = gameState.auctionWinner === playerId;
    
    // Check if player already submitted for open question
    const hasSubmittedOpen = gameState.submittedPlayerIds && gameState.submittedPlayerIds.includes(playerId);

    const handleBuyClick = () => {
      setAuctionError('');
      socket.emit('buy-auction', { roomId, playerId }, (res) => {
        if (!res.success) {
          setAuctionError(res.error || 'Failed to snatch question.');
        }
      });
    };

    const handleAuctionSubmit = (e) => {
      e.preventDefault();
      if (!auctionAnswer.trim()) return;
      socket.emit('submit-auction-answer', { roomId, playerId, answer: auctionAnswer }, (res) => {
        if (res.success) {
          setAuctionSuccess('Answer submitted successfully!');
        } else {
          setAuctionError(res.error || 'Failed to submit answer.');
        }
      });
    };



    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
        {/* Header HUD */}
        <header className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%' }}>
              <User size={20} className="gold-token" />
            </div>
            <div>
              <h4 style={{ fontWeight: '800', fontSize: '16px' }}>{activeProfile?.name || nickname}</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div className="rank-indicator" style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <Award size={12} /> Rank #{rank}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>{roomName}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>FAN TOKENS</div>
              <div className="gold-token" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Coins size={18} /> {tokens}
              </div>
            </div>
            <button
              onClick={onLeaveRoom}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', marginLeft: '5px' }}
              title="Leave Room"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Game Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
          
          {/* LOBBY */}
          {gameState.gameState === 'LOBBY' && (
            <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', alignItems: 'center', minHeight: '250px' }}>
              <div style={{ fontSize: '50px', animation: 'bounce-ball 1.5s infinite ease-in-out' }}>🔨</div>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>AUCTION LOBBY</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
                Waiting for the Organizer to start the next auction drop. Prepare your tokens!
              </p>
              <div style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', animation: 'pulse-glow 2s infinite', width: 'fit-content', margin: '10px auto 0 auto' }}>
                Auction Room Connected
              </div>
            </div>
          )}

          {/* AUCTION DROPPING */}
          {gameState.gameState === 'AUCTION_DROPPING' && (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <span style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px', color: '#f59e0b', width: 'fit-content', margin: '0 auto', fontWeight: 'bold' }}>
                LIVE DUTCH AUCTION MATCH
              </span>

              <div style={{ margin: '10px 0' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '5px' }}>QUESTION DIFFICULTY</div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: gameState.activeQuestion?.difficulty === 'EASY' ? '#00e676' :
                         gameState.activeQuestion?.difficulty === 'MEDIUM' ? '#ffb300' : '#ff1744'
                }}>
                  ⚽ {gameState.activeQuestion?.difficulty} MATCH
                </div>
              </div>

              {/* Pulse Dropping Price Panel */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '25px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                maxWidth: '300px',
                width: '100%',
                margin: '0 auto',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Snatch Price</div>
                <div style={{ fontSize: '56px', fontWeight: '950', color: '#f59e0b', margin: '5px 0', fontFamily: 'monospace' }}>
                  {currentPrice} 🪙
                </div>
              </div>

              {auctionError && (
                <div style={{ color: 'var(--red-card)', background: 'rgba(255,23,68,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--red-glow)', fontSize: '14px', maxWidth: '350px', margin: '0 auto' }}>
                  {auctionError}
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleBuyClick}
                disabled={tokens < currentPrice}
                style={{
                  fontSize: '20px',
                  padding: '16px 32px',
                  background: tokens >= currentPrice ? 'linear-gradient(135deg, #f59e0b 0%, #ff5252 100%)' : 'rgba(255,255,255,0.05)',
                  color: tokens >= currentPrice ? '#170c00' : 'rgba(255,255,255,0.3)',
                  boxShadow: tokens >= currentPrice ? '0 0 20px rgba(245, 158, 11, 0.4)' : 'none',
                  cursor: tokens >= currentPrice ? 'pointer' : 'not-allowed',
                  animation: tokens >= currentPrice ? 'pulse-glow 1.5s infinite' : 'none'
                }}
              >
                {tokens >= currentPrice ? `SNATCH AT ${currentPrice} 🪙` : 'INSUFFICIENT TOKENS ❌'}
              </button>
            </div>
          )}

          {/* AUCTION ANSWERING / ANSWERED */}
          {(gameState.gameState === 'AUCTION_ANSWERING' || gameState.gameState === 'AUCTION_ANSWERED') && (
            <div className="glass-panel" style={{ padding: '25px' }}>
              {isWinner ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '13px', background: 'rgba(0, 230, 118, 0.15)', color: 'var(--pitch-accent)', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
                      🔥 YOU WON THE AUCTION ({currentPrice} 🪙)
                    </span>
                  </div>

                  {renderQuestionCard(gameState.activeQuestion)}

                  {gameState.gameState === 'AUCTION_ANSWERING' ? (
                    <form onSubmit={handleAuctionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                        TYPE YOUR ANSWER
                      </label>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="Type answer here..."
                        value={auctionAnswer}
                        onChange={(e) => setAuctionAnswer(e.target.value)}
                        required
                        autoFocus
                      />
                      {auctionError && <div style={{ color: 'var(--red-card)', fontSize: '14px' }}>{auctionError}</div>}
                      <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                        SUBMIT RESPONSE ⚽
                      </button>
                    </form>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      {auctionError && (
                        <div style={{ color: 'var(--red-card)', background: 'rgba(255,23,68,0.1)', padding: '15px', borderRadius: '10px', border: '2px solid var(--red-glow)', marginBottom: '15px', width: '100%' }}>
                          <strong style={{ display: 'block', fontSize: '18px', marginBottom: '5px' }}>Too slow!</strong>
                          <span style={{ fontSize: '14px' }}>{auctionError}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '40px' }}>🔒</div>
                      <h3 style={{ color: 'var(--pitch-accent)', fontWeight: 'bold' }}>RESPONSE LOCKED IN</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Waiting for the referee to check VAR and reveal the result.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '50px', animation: 'pulse-glow 2s infinite' }}>⏳</div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800' }}>
                    {(Array.isArray(standings) && standings.find(p => p.id === gameState.auctionWinner)?.name) || 'Another Team'} is Answering
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
                    They bought the {gameState.activeQuestion?.difficulty} Match question for **{currentPrice} tokens**. Let's see if they get it right!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AUCTION REVEAL */}
          {gameState.gameState === 'AUCTION_REVEAL' && (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>VAR REPLAY OUTCOME</h2>
              
              {isWinner ? (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>YOUR RESULTS</div>
                  {gameState.lastResults?.isCorrect ? (
                    <div>
                      <div style={{ fontSize: '44px', color: 'var(--pitch-accent)', fontWeight: '950' }}>⚽ GOAL! (CORRECT)</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}>
                        Refunded: +{currentPrice} 🪙 <br />
                        Difficulty Bonus: +{gameState.lastResults?.bonus} 🪙
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '44px', color: 'var(--red-card)', fontWeight: '950' }}>❌ MISS! (INCORRECT)</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}>
                        Tokens lost: -{currentPrice} 🪙
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <strong style={{ color: 'var(--pitch-accent)', fontSize: '16px' }}>
                    {(Array.isArray(standings) && standings.find(p => p.id === gameState.lastResults?.winnerId)?.name) || 'The bidding team'}
                  </strong>
                  {gameState.lastResults?.isCorrect ? (
                    <div style={{ fontSize: '20px', color: 'var(--pitch-accent)', fontWeight: 'bold', marginTop: '5px' }}>
                      Scored a GOAL! 👍 (+{gameState.lastResults?.bonus} Tokens)
                    </div>
                  ) : (
                <div style={{ fontSize: '20px', color: 'var(--red-card)', fontWeight: 'bold', marginTop: '5px' }}>
                      MISSED the penalty! 👎 (-{gameState.lastResults?.price} Tokens)
                    </div>
                  )}
                </div>
              )}

              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Waiting for the organizer to load the next challenge...
              </p>
            </div>
          )}

          {/* OPEN QUESTION ACTIVE & CLOSED */}
          {(gameState.gameState === 'OPEN_QUESTION_ACTIVE' || gameState.gameState === 'OPEN_QUESTION_CLOSED') && (
            <div className="glass-panel" style={{ padding: '25px', position: 'relative' }}>
              {gameState.timerSecondsRemaining > 0 && (
                <div style={{ position: 'absolute', top: '15px', right: '20px', background: 'rgba(255, 23, 68, 0.15)', border: '1px solid var(--red-glow)', color: 'var(--red-card)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                  ⏱️ {gameState.timerSecondsRemaining}s
                </div>
              )}
              <span style={{ fontSize: '12px', background: 'rgba(0, 176, 255, 0.1)', padding: '4px 12px', borderRadius: '20px', color: '#00b0ff', width: 'fit-content', margin: '0 auto 15px auto', fontWeight: 'bold', display: 'block' }}>
                📢 OPEN QUESTION ROUND (ALL TEAMS PLAY)
              </span>

              {renderQuestionCard(gameState.activeQuestion)}

              {gameState.gameState === 'OPEN_QUESTION_CLOSED' ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px', color: 'var(--pitch-accent)' }}>Submissions Closed</strong>
                  <p style={{ fontSize: '12px' }}>Time is up! Waiting for the referee to reveal the result.</p>
                </div>
              ) : !hasSubmittedOpen ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    SELECT YOUR OPTION
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {(gameState.activeQuestion?.options || []).map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx); // A, B, C, D
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleOpenSubmit(letter)}
                          style={{
                            padding: '14px 20px',
                            borderRadius: '10px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--input-bg)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ color: '#00b0ff', marginRight: '10px' }}>{letter}</span> {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div style={{ fontSize: '40px' }}>🔒</div>
                  <h3 style={{ color: '#00b0ff', fontWeight: 'bold', marginTop: '10px' }}>SELECTION LOCKED IN</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '5px' }}>
                    You chose option: **{openAnswer || 'Submitted'}** <br />
                    Waiting for all teams to answer and referee to reveal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* OPEN QUESTION REVEAL */}
          {gameState.gameState === 'OPEN_QUESTION_REVEAL' && (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#00b0ff' }}>OPEN ROUND RESULTS</h2>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>CORRECT MCQ ANSWER</div>
                <div style={{ fontSize: '32px', fontWeight: '950', color: 'var(--pitch-accent)', margin: '5px 0' }}>
                  Option {gameState.lastResults?.correctAnswer}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>ROUND PAYOUTS</div>
                {Object.keys(gameState.lastResults?.submissions || {}).map(pId => {
                  const pSub = gameState.lastResults?.submissions[pId];
                  const pObj = Array.isArray(standings) ? standings.find(p => p.id === pId) : null;
                  const isPcorrect = pSub?.answer === gameState.lastResults?.correctAnswer;
                  
                  return (
                    <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <span><strong>{pObj?.name || 'Team'}</strong> (Chose {pSub?.answer || 'None'})</span>
                      <span style={{ color: isPcorrect ? 'var(--pitch-accent)' : '#ffb300', fontWeight: 'bold' }}>
                        {isPcorrect ? '+50 🪙' : '+10 🪙'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Waiting for the next round to begin...
              </p>
            </div>
          )}

        </main>
      </div>
    );
  };

  if (roomId === 'auction') {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
        {/* Header HUD */}
        <header className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%' }}>
              <User size={20} className="gold-token" />
            </div>
            <div>
              <h4 style={{ fontWeight: '800', fontSize: '16px' }}>{activeProfile?.name || nickname}</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div className="rank-indicator" style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <Award size={12} /> Rank #{activeProfile?.currentRank || '-'}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>{roomName}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>FAN TOKENS</div>
              <div className="gold-token" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Coins size={18} /> {activeProfile?.fanTokens || 100}
              </div>
            </div>
            <button
              onClick={onLeaveRoom}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', marginLeft: '5px' }}
              title="Leave Room"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Game Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
          {renderAuctionPlayerView()}
        </main>
      </div>
    );
  }



  function renderAuctionPlayerView() {
    const myGroup = Object.values(gameState.groups || {}).find(g => g.playerIds.includes(playerId));
    const myGroupId = myGroup ? myGroup.id : null;
    const myGroupName = myGroup ? myGroup.name : 'No Team Assigned (Spectator)';
    const myGroupTokens = myGroup ? myGroup.tokens : '-';

    const currentPrice = gameState.currentBid || 10;
    const activeQuestion = gameState.activeQuestion;
    const isWinner = gameState.auctionWinner === myGroupId;
    const isLeading = gameState.highestBidder === myGroupId;
    const highestBidderName = gameState.highestBidder ? (gameState.groups && gameState.groups[gameState.highestBidder]?.name) : 'No bids';
    const hasSubmittedOpen = gameState.submittedPlayerIds && gameState.submittedPlayerIds.includes(playerId);

    const handlePlaceBid = () => {
      if (!myGroupId) return alert("You are not assigned to a team yet. Ask the Organizer!");
      socket.emit('submit-bid', { roomId, teamId: myGroupId, playerId, expectedBid: currentPrice }, (res) => {
        if (!res.success) {
          alert(res.error);
        }
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Team Banner HUD */}
        <div className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 230, 118, 0.05)', border: '1px solid var(--pitch-accent-glow)' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>YOUR TEAM</span>
            <strong style={{ display: 'block', fontSize: '18px', color: 'var(--pitch-accent)' }}>{myGroupName}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TEAM BALANCE</span>
            <strong style={{ display: 'block', fontSize: '18px', color: '#fff' }}>{myGroupTokens} 🪙</strong>
          </div>
        </div>

        {/* LOBBY STATE */}
        {gameState.gameState === 'LOBBY' && (
          <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ fontSize: '40px', animation: 'bounce-ball 1.5s infinite ease-in-out' }}>🏟️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>AUCTION LOBBY</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
              Waiting for the Organizer to launch the next Container. Discuss strategies with your teammates!
            </p>
            {myGroup && myGroup.itemsWon && myGroup.itemsWon.length > 0 && (
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--gold-trophy)', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🎁 YOUR TEAM INVENTORY</span>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {myGroup.itemsWon.map((itm, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,215,0,0.1)', color: 'var(--gold-trophy)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                      🎁 {itm.startsWith('OPENED:') ? itm.split(':')[1] : 'Mystery Item'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AUCTION_BIDDING STATE */}
        {gameState.gameState === 'AUCTION_BIDDING' && (
          <div className="glass-panel" style={{ padding: '25px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '11px', background: 'rgba(255,215,0,0.1)', border: '1px solid var(--gold-trophy)', color: 'var(--gold-trophy)', padding: '4px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
              📦 CONTAINER BIDDING ACTIVE
            </span>

            <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>CONTAINER</span>
                <strong style={{ fontSize: '20px', color: 'var(--gold-trophy)' }}>
                  {gameState.questions ? `Container ${gameState.questions.findIndex(q => q.id === activeQuestion?.id) + 1}` : 'Container'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>HIDDEN ITEMS</span>
                <strong style={{ fontSize: '20px', color: 'var(--gold-trophy)' }}>
                  {activeQuestion?.items ? activeQuestion.items.length : 0} Boxes
                </strong>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', width: '100%', padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>CURRENT HIGH BID</span>
              <strong style={{ fontSize: '36px', color: '#ffb300', fontFamily: 'monospace' }}>{currentPrice} 🪙</strong>
              <div style={{ fontSize: '12.5px', color: '#fff', marginTop: '6px' }}>
                Leader: <span style={{ color: isLeading ? 'var(--pitch-accent)' : 'white', fontWeight: 'bold' }}>{isLeading ? 'Your Team (Leading! ⭐)' : highestBidderName}</span>
              </div>
            </div>

            {!myGroupId ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                <strong style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>Spectator Mode</strong>
                <p style={{ fontSize: '12px' }}>You are observing the auction. Waiting for team assignment.</p>
              </div>
            ) : (() => {
              const isBidder = myGroup && myGroup.bidderId === playerId;
              const bidderName = myGroup && myGroup.bidderId && Array.isArray(standings) ? (standings.find(p => p.id === myGroup.bidderId)?.name || 'Captain') : 'Captain';
              
              if (!isBidder && myGroup && myGroup.bidderId) {
                return (
                  <div style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(255, 179, 0, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
                    border: '1px solid rgba(255, 179, 0, 0.25)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '28px' }}>👑</span>
                    <strong style={{ fontSize: '14px', color: '#ffb300' }}>
                      Consult with your Team Bidder
                    </strong>
                    <span style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>
                      {bidderName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Only the designated Team Bidder can place bids. Discuss strategy with your captain!
                    </span>
                  </div>
                );
              }
              
              return (
                <button
                  onClick={handlePlaceBid}
                  disabled={isLeading || myGroupTokens < (currentPrice + 5)}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: isLeading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #00b0ff 0%, #00e676 100%)',
                    color: isLeading ? 'var(--text-muted)' : 'black',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    border: 'none',
                    boxShadow: isLeading ? 'none' : '0 4px 15px rgba(0, 230, 118, 0.2)'
                  }}
                >
                  {isLeading ? 'YOU HOLD HIGH BID' : `BID +5 TOKENS (Cost: ${currentPrice + 5} 🪙)`}
                </button>
              );
            })()}
          </div>
        )}

        {/* AUCTION_ANSWERING STATE */}
        {(gameState.gameState === 'AUCTION_ANSWERING' || gameState.gameState === 'AUCTION_ANSWERED') && (
          <div className="glass-panel" style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>VERBAL ANSWER STAGE</span>
              <span style={{ fontSize: '11px', background: isWinner ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.05)', color: isWinner ? 'var(--pitch-accent)' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                {isWinner ? 'YOUR TEAM WON' : 'OTHER TEAM WON'}
              </span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>QUESTION</div>
              <strong style={{ display: 'block', fontSize: '15px', marginTop: '4px', color: '#fff' }}>{activeQuestion?.text}</strong>
            </div>

            {isWinner ? (
              <div style={{ background: 'rgba(0, 230, 118, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--pitch-accent-glow)', textAlign: 'center' }}>
                <strong style={{ color: 'var(--pitch-accent)', fontSize: '15px', display: 'block' }}>⚽ ANSWER NOW!</strong>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Please deliver your team's verbal answer directly to the referee/organizer.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '10px 0' }}>
                {auctionError && (
                  <div style={{ color: 'var(--red-card)', background: 'rgba(255,23,68,0.1)', padding: '15px', borderRadius: '10px', border: '2px solid var(--red-glow)', marginBottom: '20px' }}>
                    <strong style={{ display: 'block', fontSize: '16px', marginBottom: '5px' }}>Too slow!</strong>
                    <span style={{ fontSize: '14px' }}>{auctionError}</span>
                  </div>
                )}
                Wait for the winning team to deliver their verbal answer.
              </div>
            )}
          </div>
        )}

        {/* AUCTION_END STATE */}
        {gameState.gameState === 'AUCTION_END' && (
          <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ fontSize: '40px' }}>🏆</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold-trophy)' }}>GAME COMPLETED</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
              The Auction is completed! Check the projector screen to see the final team standings and the grand reveal of the winner!
            </p>
          </div>
        )}

        {/* OPEN QUESTION ACTIVE & CLOSED */}
        {(gameState.gameState === 'OPEN_QUESTION_ACTIVE' || gameState.gameState === 'OPEN_QUESTION_CLOSED') && (
          <div className="glass-panel" style={{ padding: '25px', position: 'relative' }}>
            {gameState.timerSecondsRemaining > 0 && (
              <div style={{ position: 'absolute', top: '15px', right: '20px', background: 'rgba(255, 23, 68, 0.15)', border: '1px solid var(--red-glow)', color: 'var(--red-card)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                ⏱️ {gameState.timerSecondsRemaining}s
              </div>
            )}
            <span style={{ fontSize: '12px', background: 'rgba(0, 176, 255, 0.1)', padding: '4px 12px', borderRadius: '20px', color: '#00b0ff', width: 'fit-content', margin: '0 auto 15px auto', fontWeight: 'bold', display: 'block' }}>
              📢 OPEN QUESTION ROUND (ALL TEAMS PLAY)
            </span>

            {renderQuestionCard(gameState.activeQuestion)}

            {!myGroupId ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                <strong style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>Spectator Mode</strong>
                <p style={{ fontSize: '12px' }}>Teams are currently answering this question.</p>
              </div>
            ) : gameState.gameState === 'OPEN_QUESTION_CLOSED' ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px', color: 'var(--pitch-accent)' }}>Submissions Closed</strong>
                <p style={{ fontSize: '12px' }}>Time is up! Waiting for the referee to reveal the result.</p>
              </div>
            ) : !hasSubmittedOpen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  SELECT YOUR OPTION
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {(gameState.activeQuestion?.options || []).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOpenSubmit(letter)}
                        style={{
                          padding: '14px 20px',
                          borderRadius: '10px',
                          border: '1px solid var(--glass-border)',
                          background: 'var(--input-bg)',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ background: 'rgba(255,255,255,0.08)', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#00b0ff', fontWeight: '900' }}>
                          {letter}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '40px' }}>🔒</div>
                <h3 style={{ color: '#00b0ff', fontWeight: 'bold', marginTop: '10px' }}>SELECTION LOCKED IN</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '5px' }}>
                  You chose option: **{openAnswer || 'Submitted'}** <br />
                  Waiting for all teams to answer and referee to reveal.
                </p>
              </div>
            )}
          </div>
        )}

        {/* OPEN QUESTION REVEAL */}
        {gameState.gameState === 'OPEN_QUESTION_REVEAL' && (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#00b0ff' }}>OPEN ROUND RESULTS</h2>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', maxWidth: '400px', width: '100%', margin: '0 auto' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>CORRECT MCQ ANSWER</div>
              <div style={{ fontSize: '32px', fontWeight: '950', color: 'var(--pitch-accent)', margin: '5px 0' }}>
                Option {gameState.lastResults?.correctAnswer}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>ROUND PAYOUTS</div>
              {Object.keys(gameState.lastResults?.submissions || {}).map(pId => {
                const pSub = gameState.lastResults?.submissions[pId];
                const pObj = Array.isArray(standings) ? standings.find(p => p.id === pId) : null;
                const isPcorrect = pSub?.answer === gameState.lastResults?.correctAnswer;
                
                return (
                  <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                    <span><strong>{pObj?.name || 'Team'}</strong> (Chose {pSub?.answer || 'None'})</span>
                    <span style={{ color: isPcorrect ? 'var(--pitch-accent)' : '#ffb300', fontWeight: 'bold' }}>
                      {isPcorrect ? '+50 🪙' : '+10 🪙'}
                    </span>
                  </div>
                );
              })}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Waiting for the next round to begin...
            </p>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="app-container">
      {/* HUD Header */}
      <header className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '3px solid var(--pitch-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%' }}>
            <User size={20} className="gold-token" />
          </div>
          <div>
            <h4 style={{ fontWeight: '800', fontSize: '16px' }}>{activeProfile?.name || nickname}</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="rank-indicator" style={{ fontSize: '12px' }}>
                <Award size={12} /> Rank #{rank}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '11px', color: 'var(--pitch-accent)', fontWeight: 'bold' }}>{roomName}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>FAN TOKENS</div>
            <div className="gold-token" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Coins size={18} /> {tokens}
            </div>
          </div>

          {streak >= 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#ff6d00' }}>STREAK</div>
              <div className="on-fire" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={18} /> {streak}
              </div>
            </div>
          )}

          <button
            onClick={onLeaveRoom}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', marginLeft: '5px' }}
            title="Leave Room"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Game Interface */}
      {roomId === 'auction' ? (
        renderAuctionPlayerView()
      ) : (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>

        {/* LOBBY VIEW */}
        {gameState.gameState === 'LOBBY' && (
          <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', alignItems: 'center', minHeight: '250px' }}>
            <div style={{ fontSize: '50px', animation: 'bounce-ball 1.5s infinite ease-in-out' }}>⚽</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>LOCKER ROOM</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
              Waiting for the Referee to open the next Match. Get ready to predict!
            </p>
            <div style={{ fontSize: '12px', background: 'rgba(0, 230, 118, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--pitch-accent-glow)', color: 'var(--pitch-accent)', animation: 'pulse-glow 2s infinite' }}>
              Stadium Connected
            </div>
          </div>
        )}

        {/* ACTIVE QUESTION VIEW */}
        {gameState.gameState === 'ACTIVE_QUESTION' && (
          <div className="glass-panel" style={{ padding: '25px', position: 'relative' }}>
            {gameState.timerSecondsRemaining > 0 && (
              <div style={{ position: 'absolute', top: '15px', right: '20px', background: 'rgba(255, 23, 68, 0.15)', border: '1px solid var(--red-glow)', color: 'var(--red-card)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                ⏱️ {gameState.timerSecondsRemaining}s
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                {gameState.activeQuestion?.difficulty === 'PRE-MATCH' ? 'PRE-MATCH (TRIAL)' : `${gameState.activeQuestion?.difficulty || 'MEDIUM'} MATCH`}
              </span>
            </div>

            {renderQuestionCard(gameState.activeQuestion)}

            {!betLocked ? (
              <form onSubmit={submitBet} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* STEP 1: Personal Answer */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                    STEP 1: YOUR ANSWER
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <button
                      type="button"
                      onClick={() => setAnswer('YES')}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: answer === 'YES' ? '2px solid var(--pitch-accent)' : '1px solid var(--glass-border)',
                        background: answer === 'YES' ? 'rgba(0, 230, 118, 0.15)' : 'var(--input-bg)',
                        color: answer === 'YES' ? 'var(--pitch-accent)' : 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      👍 YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer('NO')}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: answer === 'NO' ? '2px solid var(--red-card)' : '1px solid var(--glass-border)',
                        background: answer === 'NO' ? 'rgba(255, 23, 68, 0.15)' : 'var(--input-bg)',
                        color: answer === 'NO' ? 'var(--red-card)' : 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      👎 NO
                    </button>
                  </div>
                </div>

                {/* STEP 2: Hi/Low Prediction */}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                    STEP 2: MATCH PREDICTION
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Will more than 50% of participants answer YES?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <button
                      type="button"
                      onClick={() => setPrediction('HI')}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: prediction === 'HI' ? '2px solid var(--pitch-accent)' : '1px solid var(--glass-border)',
                        background: prediction === 'HI' ? 'rgba(0, 230, 118, 0.15)' : 'var(--input-bg)',
                        color: prediction === 'HI' ? 'var(--pitch-accent)' : 'white',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      📈 HIGHER (&gt;50% YES)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrediction('LOW')}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: prediction === 'LOW' ? '2px solid var(--red-card)' : '1px solid var(--glass-border)',
                        background: prediction === 'LOW' ? 'rgba(255, 23, 68, 0.15)' : 'var(--input-bg)',
                        color: prediction === 'LOW' ? 'var(--red-card)' : 'white',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      📉 LOWER (&lt;50% YES)
                    </button>
                  </div>
                </div>

                {/* STEP 3: Powerup Option (Only for MEDIUM and HARD matches) */}
                {gameState.activeQuestion?.difficulty === 'MEDIUM' && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ marginRight: '10px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🥈 STEP 3: SILVER GOAL
                        </label>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Multiply your correct prediction reward by 1.5x (+15 tokens instead of +10). Can be used only once!
                        </p>
                      </div>

                      {activeProfile?.silverGoalAvailable ? (
                        <div>
                          {useSilverGoal ? (
                            <button
                              type="button"
                              onClick={() => setUseSilverGoal(false)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(0, 230, 118, 0.2)',
                                border: '2px solid var(--pitch-accent)',
                                color: 'var(--pitch-accent)',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🥈 SG ACTIVATED
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowSGConfirm(true)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--glass-border)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              USE SILVER GOAL
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          ALREADY USED
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {gameState.activeQuestion?.difficulty === 'HARD' && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ marginRight: '10px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚽ STEP 3: GOLDEN GOAL
                        </label>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Double your correct prediction reward (+20 tokens instead of +10). Can be used only once!
                        </p>
                      </div>

                      {activeProfile?.goldenGoalAvailable ? (
                        <div>
                          {useGoldenGoal ? (
                            <button
                              type="button"
                              onClick={() => setUseGoldenGoal(false)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(0, 230, 118, 0.2)',
                                border: '2px solid var(--pitch-accent)',
                                color: 'var(--pitch-accent)',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ⚽ GG ACTIVATED
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowGGConfirm(true)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--glass-border)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              USE GOLDEN GOAL
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          ALREADY USED
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Possible Reward Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '0 5px' }}>
                  <span>Possible Fan Tokens on Win:</span>
                  <strong style={{ color: useGoldenGoal ? 'var(--gold-trophy)' : useSilverGoal ? 'var(--pitch-accent)' : 'white', fontSize: '15px' }}>
                    {gameState.activeQuestion?.difficulty === 'PRE-MATCH'
                      ? '+0 Fan Tokens (Trial Room)'
                      : `+${useGoldenGoal
                        ? (gameState.config.goldenGoalReward || 20)
                        : useSilverGoal
                          ? Math.round((gameState.config.correctPredictionReward || 10) * 1.5)
                          : (gameState.config.correctPredictionReward || 10)
                      } Fan Tokens`
                    }
                  </strong>
                </div>

                {errorMessage && (
                  <div style={{ color: 'var(--red-card)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', background: 'rgba(255,23,68,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--red-glow)' }}>
                    <ShieldAlert size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '16px' }}
                  disabled={submitting}
                >
                  {submitting ? 'Locking prediction...' : 'LOCK PREDICTION ⚽'}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '50px', color: 'var(--pitch-accent)', marginBottom: '15px' }}>🔒</div>
                <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>PREDICTION LOCKED</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  Your answers are locked: <strong style={{ color: 'white' }}>{answer}</strong> and <strong style={{ color: 'white' }}>{prediction}</strong>.
                  {useGoldenGoal && <span style={{ color: 'var(--gold-trophy)', fontWeight: 'bold', display: 'block', marginTop: '6px' }}>⚽ Golden Goal Activated!</span>}
                  {useSilverGoal && <span style={{ color: 'var(--pitch-accent)', fontWeight: 'bold', display: 'block', marginTop: '6px' }}>🥈 Silver Goal Activated!</span>}
                </p>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'inline-block', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Waiting for referee's final whistle...
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLOSED VIEW */}
        {gameState.gameState === 'CLOSED' && (
          <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', minHeight: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>📯</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>SUBMISSIONS CLOSED</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', fontSize: '14px' }}>
              Predictions are locked. The referee is checking details. Wait for VAR Review!
            </p>
          </div>
        )}

        {/* REVEAL SUSPENSE VIEW */}
        {gameState.gameState === 'REVEAL_SUSPENSE' && (
          <div className="glass-panel var-screen" style={{ margin: '0 auto', width: '100%' }}>
            <div className="var-ref">🖥️</div>
            <div className="var-text">VAR Review</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '25px' }}>
              Checking game footage. Analyzing player submissions...
            </p>
            <div className="var-progress-bar">
              <div className="var-progress-fill" style={{ width: '100%', transition: 'width 2.8s linear' }}></div>
            </div>
          </div>
        )}

        {/* REVEALED RESULTS VIEW */}
        {gameState.gameState === 'REVEALED' && (
          <div className="glass-panel" style={{ padding: '25px', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', background: 'var(--glass-border)', padding: '4px 10px', borderRadius: '20px', color: 'var(--text-secondary)', display: 'inline-block', marginBottom: '15px' }}>
                MATCH OUTCOME
              </span>
              {renderQuestionCard(gameState.activeQuestion)}
            </div>

            {/* Aggregated Results */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
              <div style={{ background: 'rgba(0, 230, 118, 0.05)', border: '1px solid var(--pitch-accent-glow)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>YES</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--pitch-accent)' }}>
                  {Math.round(gameState.lastResults?.yesPercent || 0)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {gameState.lastResults?.yesCount || 0} votes
                </div>
              </div>

              <div style={{ background: 'rgba(255, 23, 68, 0.05)', border: '1px solid var(--red-glow)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NO</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--red-card)' }}>
                  {Math.round(gameState.lastResults?.noPercent || 0)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {gameState.lastResults?.noCount || 0} votes
                </div>
              </div>
            </div>

            {/* Individual Player Outcome Card */}
            {(() => {
              const myHistory = activeProfile?.history;
              const roundResult = myHistory?.find(h => h.questionId === gameState.currentQuestionId);

              if (!roundResult) {
                return (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>You did not submit a prediction in this round.</p>
                  </div>
                );
              }

              const isPush = roundResult.outcome === 'PUSH';
              const isGoal = roundResult.outcome === 'GOAL';

              return (
                <div style={{
                  background: isPush
                    ? 'rgba(255,255,255,0.04)'
                    : isGoal
                      ? 'rgba(0, 230, 118, 0.08)'
                      : 'rgba(255, 23, 68, 0.08)',
                  border: `1px solid ${isPush ? 'var(--glass-border)' : isGoal ? 'var(--pitch-accent)' : 'var(--red-card)'}`,
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  boxShadow: isGoal ? '0 0 15px var(--pitch-accent-glow)' : 'none'
                }}>
                  {isPush ? (
                    <>
                      <h4 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>🤝 PUSH / DRAW</h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        YES is exactly 50%! No prediction points awarded.
                      </p>
                    </>
                  ) : isGoal ? (
                    <>
                      <h4 style={{ fontSize: '26px', fontWeight: '950', marginBottom: '8px', color: 'var(--pitch-accent)', letterSpacing: '1px' }}>
                        ⚽ GOAL!
                      </h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Your prediction was correct! Earned <strong style={{ color: 'var(--pitch-accent)' }}>+{roundResult.tokensEarned}</strong> tokens.
                        {roundResult.useGoldenGoal && <div style={{ color: 'var(--gold-trophy)', fontWeight: 'bold', marginTop: '4px' }}>⚽ Golden Goal Double Bonus Applied!</div>}
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 style={{ fontSize: '26px', fontWeight: '950', marginBottom: '8px', color: 'var(--red-card)', letterSpacing: '1px' }}>
                        ❌ MISS!
                      </h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Prediction incorrect. Earned <strong style={{ color: 'white' }}>+0</strong> tokens.
                        {roundResult.useGoldenGoal && <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>⚽ Golden Goal was consumed.</div>}
                      </p>
                    </>
                  )}
                  {roundResult.participationTokens > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--gold-trophy)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Sparkles size={12} /> +{roundResult.participationTokens} Fan Tokens for participating!
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                Waiting for the next match to kick off...
              </div>
            </div>
          </div>
        )}

        {/* STATISTICS PANEL */}
        <section className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} className="gold-token" /> STATS SUMMARY
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 6px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MATCHES</div>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>{matches}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 6px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--pitch-accent)' }}>GOALS</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--pitch-accent)' }}>{goals}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 6px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ACCURACY</div>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>{accuracy}%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Best Streak:</span>
              <span style={{ fontWeight: 'bold' }}>{bestStreak}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Misses:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--red-card)' }}>{misses}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)' }}>⚽ Golden Goal:</div>
              <strong style={{ color: activeProfile?.goldenGoalAvailable ? 'var(--gold-trophy)' : 'var(--text-muted)' }}>
                {activeProfile?.goldenGoalAvailable ? 'Available' : 'Used'}
              </strong>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(0, 230, 118, 0.05)', border: '1px solid var(--pitch-accent-glow)', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)' }}>🥈 Silver Goal:</div>
              <strong style={{ color: activeProfile?.silverGoalAvailable ? 'var(--pitch-accent)' : 'var(--text-muted)' }}>
                {activeProfile?.silverGoalAvailable ? 'Available' : 'Used'}
              </strong>
            </div>
          </div>
        </section>

        {/* HISTORY PANEL */}
        {activeProfile?.history && activeProfile.history.length > 0 && (
          <section className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} /> PREDICTION HISTORY
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {activeProfile.history.slice().reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `3px solid ${h.outcome === 'PUSH' ? 'var(--text-muted)' : h.outcome === 'GOAL' ? 'var(--pitch-accent)' : 'var(--red-card)'}` }}>
                  <div style={{ flex: 1, marginRight: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.questionText}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span>Ans: {h.answer}</span>
                      <span>Pred: {h.prediction}</span>
                      {h.useGoldenGoal && <span style={{ color: 'var(--gold-trophy)', fontWeight: 'bold' }}>⚽ Golden Goal</span>}
                      {h.useSilverGoal && <span style={{ color: 'var(--pitch-accent)', fontWeight: 'bold' }}>🥈 Silver Goal</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: h.outcome === 'PUSH' ? 'white' : h.outcome === 'GOAL' ? 'var(--pitch-accent)' : 'var(--red-card)'
                    }}>
                      {h.outcome === 'PUSH' ? 'PUSH' : h.outcome === 'GOAL' ? `+${h.tokensEarned}` : '+0'}
                    </span>
                    <div style={{ fontSize: '9px', color: 'var(--gold-trophy)' }}>
                      +{h.participationTokens} reward
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GOLDEN GOAL CONFIRMATION MODAL */}
        {showGGConfirm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚽</div>
              <h3 style={{ fontSize: '18px', fontWeight: '850', marginBottom: '10px' }}>Use your Golden Goal?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
                This bonus can only be used once during the entire camp. It will double your prediction reward if correct (+20 tokens).
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setShowGGConfirm(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => { setUseGoldenGoal(true); setShowGGConfirm(false); }}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {showSGConfirm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🥈</div>
              <h3 style={{ fontSize: '18px', fontWeight: '850', marginBottom: '10px' }}>Use your Silver Goal?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
                This bonus can only be used once during the entire camp. It will multiply your prediction reward by 1.5x if correct (+15 tokens).
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setShowSGConfirm(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => { setUseSilverGoal(true); setShowSGConfirm(false); }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>
      )}
    </div>
  );
}

export default PlayerView;
