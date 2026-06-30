import React, { useState, useEffect } from 'react';
import { Award, Coins, Flame, Check, X, ShieldAlert, Sparkles, History, User, LogOut } from 'lucide-react';

function PlayerView({ socket, playerId, gameState, standings, roomId, roomName, onLeaveRoom }) {
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
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

  // Find player profile in standings
  const activeProfile = standings.find(p => p.id === playerId);

  // Auto-join if nickname is in localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('python_wc_player_name');
    if (savedName && playerId) {
      setNickname(savedName);
      handleJoin(savedName);
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

  const handleJoin = (nameToJoin) => {
    if (!nameToJoin.trim()) return;
    setSubmitting(true);
    socket.emit('join-game', { roomId, id: playerId, name: nameToJoin }, (res) => {
      setSubmitting(false);
      if (res.success) {
        setJoined(true);
        setPlayerInfo(res.player);
        localStorage.setItem('python_wc_player_name', nameToJoin);
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

  const submitBet = (e) => {
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
            ⚽ PREDICTION CHALLENGE ⚽
          </p>
          
          <form onSubmit={(e) => { e.preventDefault(); handleJoin(nickname); }}>
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                ENTER NICKNAME
              </label>
              <input 
                type="text" 
                className="text-input" 
                placeholder="e.g. PenaltyKing" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
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

  // Calculate statistics
  const matches = activeProfile?.matchesPlayed || 0;
  const goals = activeProfile?.goals || 0;
  const misses = activeProfile?.misses || 0;
  const accuracy = matches > 0 ? Math.round((goals / matches) * 100) : 0;
  const streak = activeProfile?.currentStreak || 0;
  const bestStreak = activeProfile?.bestStreak || 0;
  const tokens = activeProfile?.fanTokens || 100;
  const rank = activeProfile?.currentRank || '-';
  const renderQuestionCard = (q) => {
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
        <h3 style={{ fontSize: '18px', fontWeight: '700', lineHeight: '1.4', margin: '0 0 15px 0' }}>
          {q.text}
        </h3>
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
      <div style={{ 
        display: 'flex', 
        flexDirection, 
        flexWrap: 'wrap', 
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '20px'
      }}>
        {imgEl}
        {textEl}
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
                      📈 HI (&gt;50% YES)
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
                      📉 LOW (&lt;50% YES)
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
    </div>
  );
}

export default PlayerView;
