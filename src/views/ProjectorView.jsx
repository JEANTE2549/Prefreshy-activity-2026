import React, { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import { Award, ShieldAlert, Sparkles, Flame, Coins, Play, Square, ArrowLeft, Lock } from 'lucide-react';

// Canvas QR Code Generator Component
const CanvasQRCode = ({ url }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current && url) {
      QRCodeLib.toCanvas(canvasRef.current, url, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#07170f', // deep pitch green
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('Error generating QR Code:', err);
      });
    }
  }, [url]);

  return <canvas ref={canvasRef} style={{ borderRadius: '12px', border: '5px solid var(--gold-trophy)', boxShadow: '0 0 20px var(--gold-glow)', maxWidth: '100%', height: 'auto' }} />;
};

function ProjectorView({ socket, gameState, standings, roomId, roomName, adminMode, onBackToHub }) {
  const [joinUrl, setJoinUrl] = useState('');
  
  // Calculate Join URL based on browser location
  useEffect(() => {
    const url = window.location.origin + window.location.pathname;
    setJoinUrl(url);
  }, []);

  // Filter out players who haven't completed any rounds from the main League Table
  const activeStandings = standings.filter(p => p.matchesPlayed > 0);
  
  // Leaderboard psychology: finding special achievements
  const onFirePlayers = standings.filter(p => p.currentStreak >= 3);
  
  // Golden Glove (Highest Accuracy with at least 2 matches played)
  let goldenGlove = null;
  let maxAcc = 0;
  standings.forEach(p => {
    if (p.matchesPlayed >= 2) {
      const acc = Math.round((p.goals / p.matchesPlayed) * 100);
      if (acc > maxAcc) {
        maxAcc = acc;
        goldenGlove = p;
      }
    }
  });

  // Sort questions by difficulty weights (PRE-MATCH -> EASY -> MEDIUM -> HARD) for lobby presentation
  const sortedQuestions = gameState.questions ? [...gameState.questions].sort((a, b) => {
    const diffWeights = { 'PRE-MATCH': 0, 'EASY': 1, 'MEDIUM': 2, 'HARD': 3 };
    const weightA = diffWeights[a.difficulty] !== undefined ? diffWeights[a.difficulty] : 2;
    const weightB = diffWeights[b.difficulty] !== undefined ? diffWeights[b.difficulty] : 2;
    return weightA - weightB;
  }) : [];

  // Helper to render customized layout with alignment checker
  const renderQuestionCard = (q, textStyle = {}) => {
    if (!q) return null;

    const imgEl = q.imageUrl ? (
      <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px' }}>
        <img 
          src={q.imageUrl} 
          alt="Question media" 
          style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '16px', border: '3px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
        />
      </div>
    ) : null;

    const textEl = (
      <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '850', lineHeight: '1.4', margin: '0', ...textStyle }}>
          {q.text}
        </h1>
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
        gap: '30px',
        width: '100%',
        margin: '20px 0'
      }}>
        {imgEl}
        {textEl}
      </div>
    );
  };

  return (
    <div className="app-container" style={{ maxWidth: '1600px', padding: '30px' }}>
      
      {/* Presenter Admin Controls Bar */}
      {adminMode && (
        <div style={{
          background: 'rgba(0,0,0,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px',
          margin: '-30px -30px 20px -30px',
          borderRadius: '8px 8px 0 0',
          color: '#fff',
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--pitch-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> PRESENTER MODE
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>|</span>
            <span>Room: {roomName}</span>
          </div>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onBackToHub}>
            <ArrowLeft size={14} /> Return to Hub
          </button>
        </div>
      )}

      {/* LOBBY MODE */}
      {gameState.gameState === 'LOBBY' && (
        <div className="projector-lobby-grid" style={{ minHeight: '80vh' }}>
          
          {/* QR Code Column */}
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--pitch-accent)', letterSpacing: '1px' }}>
              🏟️ JOIN PLAYING FIELD
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Scan the QR Code with your smartphone to enter the stadium:
            </p>
            
            {joinUrl && <CanvasQRCode url={joinUrl} />}
            
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--glass-border)', width: '100%' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>MANUAL URL</span>
              <strong style={{ fontSize: '15px', color: 'var(--pitch-accent)' }}>{joinUrl}</strong>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Choose a nickname, get starting Fan Tokens, and prepare to make predictions.
            </div>
          </div>

          {/* Roster Grid Column */}
          <div className="glass-panel" style={{ padding: '30px', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '900', borderBottom: '2px solid var(--pitch-accent-glow)', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🏃 STADIUM LINEUP ({standings.length})</span>
              <span style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--pitch-accent)', padding: '4px 14px', borderRadius: '20px', fontSize: '16px' }}>
                {standings.length} Active
              </span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', alignContent: 'start', flex: 1 }}>
              {standings.map((p, idx) => (
                <div 
                  key={p.id} 
                  style={{ 
                    padding: '12px 15px', 
                    background: 'rgba(0, 230, 118, 0.05)', 
                    border: '1px solid var(--pitch-accent-glow)', 
                    borderRadius: '10px',
                    textAlign: 'center',
                    animation: 'pulse-glow 3s infinite',
                    fontWeight: 'bold',
                    fontSize: '15px'
                  }}
                >
                  🥅 {p.name}
                </div>
              ))}

              {standings.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '50px', fontSize: '18px' }}>
                  Waiting for players to step onto the pitch... ⚽
                </div>
              )}
            </div>

            {/* Presenter Question Launch Panel */}
            {adminMode && (
              <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--pitch-accent)', marginBottom: '15px' }}>
                  ⚽ START MATCH (LAUNCH QUESTION)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                  {sortedQuestions.map((q, idx) => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: '13px' }}>
                        <strong style={{ 
                          color: q.difficulty === 'EASY' ? 'var(--pitch-accent)' : q.difficulty === 'HARD' ? 'var(--red-card)' : q.difficulty === 'PRE-MATCH' ? '#00b0ff' : 'var(--gold-trophy)', 
                          borderColor: q.difficulty === 'EASY' ? 'var(--pitch-accent)' : q.difficulty === 'HARD' ? 'var(--red-card)' : q.difficulty === 'PRE-MATCH' ? '#00b0ff' : 'var(--gold-trophy)',
                          borderStyle: 'solid',
                          borderWidth: '1px',
                          padding: '1px 5px', 
                          borderRadius: '3px', 
                          marginRight: '8px', 
                          fontSize: '10px' 
                        }}>
                          {q.difficulty}
                        </strong> 
                        Match {idx + 1}
                      </span>
                      {q.isPlayed ? (
                        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)', fontWeight: 'bold' }}>
                          PLAYED 🔒
                        </span>
                      ) : (
                        <button 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '11px', flexShrink: 0, marginLeft: '10px' }}
                          onClick={() => socket.emit('admin-open-question', { roomId, questionId: q.id })}
                        >
                          Launch Match ⚽
                        </button>
                      )}
                    </div>
                  ))}
                  {(!gameState.questions || gameState.questions.length === 0) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                      No questions in bank. Add questions via the Organizer Panel!
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ACTIVE QUESTION MODE */}
      {gameState.gameState === 'ACTIVE_QUESTION' && (
        <div className="responsive-grid-2-col" style={{ minHeight: '80vh', gap: '30px' }}>
          
          {/* Active Question Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="glass-panel" style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: '20px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  {gameState.activeQuestion?.difficulty === 'PRE-MATCH' ? 'PRE-MATCH (TRIAL)' : `${gameState.activeQuestion?.difficulty || 'MEDIUM'} MATCH`}
                </span>
              </div>

              {renderQuestionCard(gameState.activeQuestion)}

              {/* Progress Tracker */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>
                  <span>Predictions Submitted</span>
                  <span style={{ color: 'var(--pitch-accent)' }}>
                    {gameState.submissionsCount} / {standings.length} Locked
                  </span>
                </div>
                <div style={{ width: '100%', height: '14px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '7px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--pitch-accent) 0%, #00b0ff 100%)', 
                    width: `${standings.length > 0 ? (gameState.submissionsCount / standings.length) * 100 : 0}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>

              {/* Presenter Skip whistle */}
              {adminMode && (
                <div style={{ marginTop: '20px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ background: 'linear-gradient(135deg, var(--red-card) 0%, #d50000 100%)', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '14px' }}
                    onClick={() => socket.emit('admin-close-submissions', { roomId })}
                  >
                    <Square size={16} /> Skip Whistle (Close Predictions)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pitch Status Board (Kahoot style) */}
          <div className="glass-panel" style={{ 
            padding: '40px 30px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '40px',
            minWidth: '280px',
            textAlign: 'center'
          }}>
            {/* Timer circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '160px', 
                height: '160px', 
                borderRadius: '50%', 
                border: '6px solid #a855f7', 
                background: 'rgba(168, 85, 247, 0.08)',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                animation: gameState.timerSecondsRemaining > 0 && gameState.timerSecondsRemaining <= 10 ? 'pulse-glow 1s infinite' : 'none'
              }}>
                {gameState.timerSecondsRemaining > 0 ? (
                  <>
                    <span style={{ fontSize: '64px', fontWeight: '950', color: '#fff', lineHeight: '1' }}>
                      {gameState.timerSecondsRemaining}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '1px', marginTop: '4px' }}>
                      SECONDS
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '48px', lineHeight: '1' }}>⏱️</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '1px', marginTop: '6px' }}>
                      ACTIVE
                    </span>
                  </>
                )}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', marginTop: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                TIME REMAINING
              </span>
            </div>

            {/* Separator line */}
            <div style={{ width: '60px', height: '2px', background: 'var(--glass-border)' }}></div>

            {/* Answer count */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '96px', fontWeight: '950', color: 'var(--pitch-accent)', lineHeight: '1' }}>
                {gameState.submissionsCount}
              </div>
              <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '10px' }}>
                Answers
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 'bold' }}>
                out of {standings.length} players
              </span>
            </div>
          </div>

        </div>
      )}

      {/* CLOSED MODE (LOCKED STAGE BEFORE REVEAL) */}
      {gameState.gameState === 'CLOSED' && (
        <div className="glass-panel" style={{ padding: '45px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '300px', justifyContent: 'center', borderTop: '3px solid var(--red-card)', marginBottom: '30px' }}>
          <span style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--red-card)', fontWeight: '900', letterSpacing: '2px', background: 'rgba(255, 23, 68, 0.1)', padding: '4px 12px', borderRadius: '20px', alignSelf: 'center' }}>
            🔒 PREDICTIONS LOCKED
          </span>
          {renderQuestionCard(gameState.activeQuestion, { fontSize: '38px', textAlign: 'center' })}
          <p style={{ color: 'var(--text-secondary)' }}>All user predictions have been locked. Waiting for the referee to reveal results...</p>
          
          {adminMode && (
            <div style={{ marginTop: '20px' }}>
              <button 
                className="btn-primary" 
                style={{ fontSize: '16px', padding: '12px 30px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => socket.emit('admin-reveal-results', { roomId })}
              >
                <Play size={16} /> Reveal Results
              </button>
            </div>
          )}
        </div>
      )}

      {/* REVEAL SUSPENSE / VAR OVERLAY */}
      {gameState.gameState === 'REVEAL_SUSPENSE' && (
        <div className="var-overlay">
          <div className="var-screen" style={{ transform: 'scale(1.2)' }}>
            <div className="var-ref">🖥️</div>
            <div className="var-text" style={{ fontSize: '40px' }}>VAR Review</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '35px' }}>
              REFEREE VERIFYING PLAY BOOK...
            </p>
            <div className="var-progress-bar">
              <div className="var-progress-fill" style={{ width: '100%', transition: 'width 2.8s linear' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS REVEALED MODE */}
      {gameState.gameState === 'REVEALED' && (
        <div className="projector-reveal-grid" style={{ minHeight: '80vh' }}>
          
          {/* Main Results Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.08)', padding: '4px 15px', borderRadius: '20px', color: 'var(--text-secondary)', width: 'fit-content', margin: '0 auto 20px auto' }}>
                MATCH REPLAY OUTCOME
              </span>

              {/* Progress Bars */}
              <div className="results-cards-grid">
                
                {/* YES Card */}
                <div style={{ background: 'rgba(0, 230, 118, 0.04)', border: '2px solid var(--pitch-accent)', padding: '25px', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>YES</div>
                  <div style={{ fontSize: '64px', fontWeight: '950', color: 'var(--pitch-accent)', margin: '10px 0' }}>
                    {Math.round(gameState.lastResults?.yesPercent || 0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {gameState.lastResults?.yesCount || 0} votes
                  </div>
                </div>

                {/* NO Card */}
                <div style={{ background: 'rgba(255, 23, 68, 0.04)', border: '2px solid var(--red-card)', padding: '25px', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>NO</div>
                  <div style={{ fontSize: '64px', fontWeight: '950', color: 'var(--red-card)', margin: '10px 0' }}>
                    {Math.round(gameState.lastResults?.noPercent || 0)}%
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {gameState.lastResults?.noCount || 0} votes
                  </div>
                </div>

              </div>

              {/* Winner Header */}
              {gameState.lastResults?.outcome === 'PUSH' ? (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'inline-block', margin: '0 auto', maxWidth: '400px', width: '100%' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '900' }}>🤝 RESULT: PUSH (DRAW)</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '5px' }}>
                    Distribution exactly 50/50. No correct predictions (+0 Tokens).
                  </p>
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 215, 0, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gold-trophy)', display: 'inline-block', margin: '0 auto', maxWidth: '500px', width: '100%', animation: 'pulse-glow 2s infinite' }}>
                  <h3 style={{ fontSize: '26px', fontWeight: '950', color: 'var(--gold-trophy)', letterSpacing: '1px' }}>
                    🏆 CORRECT PREDICTION: {gameState.lastResults?.outcome}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
                    {gameState.lastResults?.winnerCount || 0} Players scored a ⚽ GOAL!
                  </p>
                </div>
              )}

              {/* Next Match button (Admin only) */}
              {adminMode && (
                <div style={{ marginTop: '30px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ fontSize: '16px', padding: '12px 28px', background: 'linear-gradient(135deg, var(--pitch-accent) 0%, #00b0ff 100%)' }}
                    onClick={() => socket.emit('admin-next-match', { roomId })}
                  >
                    Next Match (Back to Lobby) ⚽
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* World Cup Standings simplified table instead of Goalscorers */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minWidth: '320px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🏆 Standings
            </h3>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '8px', width: '60px' }}>RANK</th>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>PLAYER</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>TOKENS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((p) => {
                    let rankText = p.currentRank;
                    if (p.currentRank === 1) rankText = '🥇';
                    else if (p.currentRank === 2) rankText = '🥈';
                    else if (p.currentRank === 3) rankText = '🥉';
                    
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 0', fontWeight: 'bold' }}>{rankText}</td>
                        <td style={{ padding: '10px 0', fontWeight: 'bold' }}>{p.name}</td>
                        <td className="gold-token" style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold' }}>
                          {p.fanTokens} 🪙
                        </td>
                      </tr>
                    );
                  })}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                        No standings yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}



    </div>
  );
}

export default ProjectorView;
