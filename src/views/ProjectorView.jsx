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

function ProjectorView({ socket, gameState, standings, roomId, roomName, adminMode, adminToken, onBackToHub }) {
  const [joinUrl, setJoinUrl] = useState('');
  
  // Calculate Join URL based on browser location
  useEffect(() => {
    const url = window.location.origin + window.location.pathname;
    setJoinUrl(url);
  }, []);

  // Filter out players who haven't completed any rounds from the main League Table
  const activeStandings = [...standings]
    .filter(p => p.matchesPlayed > 0)
    .sort((a, b) => b.fanTokens - a.fanTokens);
  
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

  const renderAuctionMode = () => {
    const currentPrice = gameState.currentBid || 10;
    const activeQuestion = gameState.activeQuestion;
    const isAnswering = gameState.gameState === 'AUCTION_ANSWERING' || gameState.gameState === 'AUCTION_ANSWERED';
    
    const groupsList = Object.values(gameState.groups || {
      "A": { id: "A", name: "Team A", playerIds: [], tokens: 100, itemsWon: [] },
      "B": { id: "B", name: "Team B", playerIds: [], tokens: 100, itemsWon: [] },
      "C": { id: "C", name: "Team C", playerIds: [], tokens: 100, itemsWon: [] }
    });
    const sortedGroups = [...groupsList].sort((a, b) => b.tokens - a.tokens);

    if (gameState.gameState === 'AUCTION_END') {
      const first = sortedGroups[0];
      const second = sortedGroups[1];
      const third = sortedGroups[2];

      const renderPodiumColumn = (group, rank) => {
        if (!group) return null;
        let colHeight = '180px';
        let badge = '🥉';
        let colColor = 'rgba(205, 127, 50, 0.15)';
        let borderColor = '#cd7f32';
        
        if (rank === 1) {
          colHeight = '320px';
          badge = '🥇';
          colColor = 'rgba(255, 215, 0, 0.15)';
          borderColor = 'var(--gold-trophy)';
        } else if (rank === 2) {
          colHeight = '240px';
          badge = '🥈';
          colColor = 'rgba(192, 192, 192, 0.15)';
          borderColor = '#c0c0c0';
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', minWidth: '220px', transition: 'all 0.5s ease-in-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '32px' }}>{badge}</span>
              <h2 style={{ fontSize: '22px', fontWeight: '950', color: '#fff', margin: '5px 0' }}>{group.name}</h2>
              <strong style={{ fontSize: '28px', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                {group.tokens} <span style={{ fontSize: '16px' }}>🪙</span>
              </strong>
            </div>

            <div style={{
              height: colHeight,
              width: '100%',
              background: `linear-gradient(to top, ${colColor}, rgba(0,0,0,0.4))`,
              border: `2px solid ${borderColor}`,
              boxShadow: `0 0 30px ${borderColor}44`,
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px',
              gap: '15px',
              justifyContent: 'flex-start'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--glass-border)', width: '100%', paddingBottom: '6px', textAlign: 'center' }}>
                Inventory
              </span>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                {(group.itemsWon || []).map((itm, idx) => {
                  const isOpened = itm.startsWith('OPENED:');
                  const val = isOpened ? itm.split(':')[1] : null;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (adminMode && !isOpened) {
                          socket.emit('admin-reveal-team-item', { roomId, adminToken, teamId: group.id, itemIdx: idx });
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: isOpened ? (val.startsWith('+') ? 'rgba(0,230,118,0.1)' : 'rgba(255,23,68,0.1)') : 'rgba(255,215,0,0.05)',
                        border: isOpened ? (val.startsWith('+') ? '1px solid var(--pitch-accent)' : '1px solid var(--red-card)') : '1px solid var(--gold-trophy)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '50px',
                        cursor: (adminMode && !isOpened) ? 'pointer' : 'default',
                        animation: isOpened ? 'score-grow 0.5s ease' : 'gold-pulse 2s infinite ease-in-out'
                      }}
                      title={(adminMode && !isOpened) ? "Click to open mystery box" : undefined}
                    >
                      {isOpened ? (
                        <strong style={{ fontSize: '15px', color: val.startsWith('+') ? 'var(--pitch-accent)' : 'var(--red-card)' }}>
                          {val}
                        </strong>
                      ) : (
                        <span style={{ fontSize: '18px' }}>🎁</span>
                      )}
                    </div>
                  );
                })}
                {(group.itemsWon || []).length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No items</span>
                )}
              </div>
            </div>
          </div>
        );
      };

      return (
        <div className="app-container" style={{ maxWidth: '1400px', padding: '30px', minHeight: '95vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'radial-gradient(circle at 50% 10%, rgba(255, 215, 0, 0.08) 0%, transparent 60%)' }}>
          <header style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ fontSize: '14px', background: 'rgba(255,215,0,0.1)', border: '1px solid var(--gold-trophy)', padding: '6px 20px', borderRadius: '25px', color: 'var(--gold-trophy)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', animation: 'gold-pulse 2s infinite' }}>
              🏆 GRAND FINALE CHAMPIONSHIP 🏆
            </span>
            <h1 style={{ fontSize: '48px', fontWeight: '950', color: '#fff', marginTop: '15px', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Python Arena Podium
            </h1>
          </header>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '30px', flex: 1, marginBottom: '50px' }}>
            {renderPodiumColumn(second, 2)}
            {renderPodiumColumn(first, 1)}
            {renderPodiumColumn(third, 3)}
          </div>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            🏟️ PRE-FRESHY PYTHON WORLD CUP 2026
          </div>
        </div>
      );
    }

    return (
      <div className="app-container" style={{ maxWidth: '1400px', padding: '20px', minHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header HUD */}
        <header className="glass-panel" style={{ padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '32px' }}>🔨</span>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px', color: '#fff' }}>
                Python Traditional Auction
              </h1>
              <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}>
                {roomName} • PIN: {gameState.pin || '1127'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {adminMode && (
              <button type="button" className="btn-secondary" onClick={onBackToHub} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}>
                <ArrowLeft size={14} /> Back to Hub
              </button>
            )}
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px 15px', borderRadius: '20px', color: 'var(--text-secondary)' }}>
              STADIUM SCREEN
            </span>
          </div>
        </header>

        {/* Main Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: '25px' }}>
          
          {/* Left panel: active screen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* LOBBY STATE */}
            {gameState.gameState === 'LOBBY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div className="glass-panel" style={{ display: 'flex', gap: '30px', padding: '30px', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px', animation: 'bounce-ball 1.5s infinite ease-in-out' }}>🔨</div>
                    <h2 style={{ fontSize: '32px', fontWeight: '950', color: '#fff', marginBottom: '15px' }}>
                      JOIN THE AUCTION STADIUM
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '400px', margin: '0 auto 25px auto', lineHeight: '1.6' }}>
                      Scan the QR code or visit the website and enter the Game PIN to register your Team.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '15px', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>MANUAL URL</span>
                        <strong style={{ fontSize: '13px', color: 'var(--pitch-accent)', wordBreak: 'break-all' }}>{joinUrl}</strong>
                      </div>
                      
                      <div style={{ background: 'rgba(0, 230, 118, 0.05)', padding: '12px 10px', borderRadius: '8px', border: '1px solid var(--pitch-accent-glow)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--pitch-accent)', display: 'block', fontWeight: 'bold' }}>GAME PIN</span>
                        <strong style={{ fontSize: '20px', color: '#fff', letterSpacing: '1px', fontWeight: '950' }}>{gameState.pin || '1127'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <CanvasQRCode url={joinUrl} />
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>SCAN WITH PHONE</span>
                  </div>
                </div>

                {/* Presenter control board for Auction */}
                {adminMode && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    {/* Container questions */}
                    <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#f59e0b', marginBottom: '15px' }}>
                        📦 CONTAINER ROSTER ({gameState.questions ? gameState.questions.length : 0})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                        {(gameState.questions || []).map((q, idx) => (
                          <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#fff' }}>
                                Container {idx + 1}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Items: {q.items ? q.items.length : 0}
                              </span>
                            </div>
                            {q.isPlayed ? (
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px' }}>
                                  PLAYED
                                </span>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => socket.emit('admin-unlock-question', { roomId, adminToken, questionId: q.id })}
                                  style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'var(--pitch-accent-glow)', color: 'var(--pitch-accent)' }}
                                >
                                  Unlock
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                  socket.emit('admin-start-container-auction', { roomId, adminToken, questionId: q.id }, (res) => {
                                    if (res && !res.success) alert(res.error || 'Failed to start bidding.');
                                  });
                                }}
                                style={{ padding: '6px 12px', fontSize: '11px', background: 'linear-gradient(135deg, #f59e0b 0%, #ff5252 100%)', color: '#170c00', border: 'none' }}
                              >
                                Bid 🔨
                              </button>
                            )}
                          </div>
                        ))}
                        {(!gameState.questions || gameState.questions.length === 0) && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No containers in roster</span>
                        )}
                      </div>
                    </div>

                    {/* MCQ Questions & Game Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      
                      {/* MCQ Recovery List */}
                      <div className="glass-panel" style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#00b0ff', marginBottom: '10px' }}>
                          📢 RECOVERY MCQ ({gameState.mcqQuestions ? gameState.mcqQuestions.length : 0})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                          {(gameState.mcqQuestions || []).map((q, idx) => (
                            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                              <span style={{ fontSize: '11px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={q.text}>
                                {idx + 1}. {q.text}
                              </span>
                              {q.isPlayed ? (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                                    PLAYED
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => socket.emit('admin-unlock-question', { roomId, adminToken, questionId: q.id })}
                                    style={{ padding: '2px 6px', fontSize: '9px', borderColor: 'var(--pitch-accent-glow)', color: 'var(--pitch-accent)' }}
                                  >
                                    Unlock
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => socket.emit('admin-start-open-question', { roomId, adminToken, questionId: q.id })}
                                  style={{ padding: '4px 10px', fontSize: '10px', background: '#00b0ff', color: 'black', border: 'none' }}
                                >
                                  Launch 📢
                                </button>
                              )}
                            </div>
                          ))}
                          {(!gameState.mcqQuestions || gameState.mcqQuestions.length === 0) && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '15px 0' }}>No recovery MCQs</span>
                          )}
                        </div>
                      </div>

                      {/* General Game Actions */}
                      <div className="glass-panel" style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => socket.emit('admin-end-auction-game', { roomId, adminToken })}
                          style={{ flex: 1, padding: '10px', fontSize: '12px', background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: '#fff', border: 'none', fontWeight: 'bold' }}
                        >
                          🏆 End Game & View Podium
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            if (confirm("Reset whole auction game state? This will clear all play status and group tokens.")) {
                              socket.emit('admin-reset-room', { roomId, adminToken });
                            }
                          }}
                          style={{ padding: '10px 15px', fontSize: '12px', borderColor: 'rgba(255,23,68,0.3)', color: '#ff4d4d' }}
                        >
                          Reset Game 🔄
                        </button>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            )}

            {/* AUCTION_BIDDING STATE */}
            {gameState.gameState === 'AUCTION_BIDDING' && (
              <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center', background: 'rgba(10,15,30,0.6)' }}>
                <span style={{ fontSize: '14px', background: 'rgba(255,215,0,0.1)', border: '1px solid var(--gold-trophy)', padding: '6px 20px', borderRadius: '25px', color: 'var(--gold-trophy)', fontWeight: 'bold', marginBottom: '30px', animation: 'gold-pulse 1.5s infinite' }}>
                  ⚡ Traditional Container Bidding Active
                </span>

                <div style={{ marginBottom: '35px', display: 'flex', gap: '40px' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>ACTIVE CONTAINER</div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '950',
                      letterSpacing: '1px',
                      color: '#f59e0b'
                    }}>
                      📦 {gameState.questions ? `Container ${gameState.questions.findIndex(q => q.id === activeQuestion?.id) + 1}` : 'Container'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>HIDDEN ITEMS</div>
                    <div style={{ fontSize: '36px', fontWeight: '950', color: 'var(--gold-trophy)' }}>
                      🎁 {activeQuestion?.items ? activeQuestion.items.length : 0} Boxes
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(145deg, rgba(20,25,45,0.8) 0%, rgba(10,12,25,0.9) 100%)',
                  border: '3px solid #f59e0b',
                  boxShadow: '0 0 40px rgba(245,158,11,0.25)',
                  padding: '30px 50px',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '20px',
                  minWidth: '400px'
                }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Current High Bid</div>
                  <div style={{ fontSize: '80px', fontWeight: '950', color: '#f59e0b', margin: '10px 0 5px 0', fontFamily: 'monospace', letterSpacing: '-2px', textShadow: '0 0 20px rgba(245,158,11,0.5)' }}>
                    {currentPrice} <span style={{ fontSize: '40px' }}>🪙</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', marginTop: '10px' }}>
                    Leader: <span style={{ color: 'var(--pitch-accent)', fontSize: '18px' }}>{gameState.highestBidder ? (gameState.groups && gameState.groups[gameState.highestBidder]?.name) : 'No bids yet'}</span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                  Max Caps: Easy 50 | Medium 60 | Hard 80. Reaching the cap wins immediately!
                </div>

                {adminMode && (
                  <div style={{ marginTop: '25px', display: 'flex', gap: '15px', justifyContent: 'center', width: '100%', maxWidth: '400px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => socket.emit('admin-confirm-bid-winner', { roomId, adminToken })}
                      style={{ flex: 1, padding: '12px 20px', fontSize: '14px', background: '#00e676', color: 'black', border: 'none', fontWeight: 'bold' }}
                    >
                      Confirm Bid Winner 🔨
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        if (confirm("Cancel this container bidding?")) {
                          socket.emit('admin-cancel-bidding', { roomId, adminToken });
                        }
                      }}
                      style={{ padding: '12px 20px', fontSize: '14px', borderColor: 'rgba(255,23,68,0.3)', color: '#ff4d4d' }}
                    >
                      Cancel Bidding ❌
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AUCTION ANSWERING / ANSWERED STATE */}
            {isAnswering && (
              <div className="glass-panel" style={{ flex: 1, padding: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
                  <span style={{ fontSize: '14px', background: 'rgba(0, 230, 118, 0.15)', color: 'var(--pitch-accent)', padding: '6px 15px', borderRadius: '25px', fontWeight: 'bold' }}>
                    📦 CONTAINER WON BY: {gameState.groups && gameState.groups[gameState.auctionWinner]?.name} ({currentPrice} 🪙)
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Status: Verbal Answer pending...
                  </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {renderQuestionCard(activeQuestion, { fontSize: '28px', lineHeight: '1.4' })}
                </div>

                {adminMode && (
                  <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center', maxWidth: '600px', width: '100%', margin: '30px auto 0 auto' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => socket.emit('admin-reveal-auction-result', { roomId, adminToken, isCorrect: true })}
                      style={{ flex: 1, padding: '12px 25px', fontSize: '14px', background: '#00e676', color: 'black', border: 'none', fontWeight: 'bold' }}
                    >
                      Correct (Refund + Bonus + Items) ✅
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => socket.emit('admin-reveal-auction-result', { roomId, adminToken, isCorrect: false })}
                      style={{ flex: 1, padding: '12px 25px', fontSize: '14px', borderColor: 'var(--red-card)', color: 'var(--red-card)', fontWeight: 'bold' }}
                    >
                      Incorrect (Deduct Tokens) ❌
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* OPEN QUESTION ACTIVE STATE */}
            {gameState.gameState === 'OPEN_QUESTION_ACTIVE' && (
              <div className="glass-panel" style={{ flex: 1, padding: '35px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
                  <span style={{ fontSize: '14px', background: 'rgba(0, 176, 255, 0.15)', color: '#00b0ff', padding: '6px 15px', borderRadius: '25px', fontWeight: 'bold' }}>
                    📢 RECOVERY ROUND (ALL TEAMS SUBMIT)
                  </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {renderQuestionCard(activeQuestion, { fontSize: '28px', lineHeight: '1.4' })}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px', maxWidth: '800px', margin: '30px auto 0 auto', width: '100%' }}>
                    {(activeQuestion?.options || []).map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <div key={idx} style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(0, 176, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', color: '#00b0ff' }}>{letter}</span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {adminMode && (
                  <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => socket.emit('admin-reveal-open-results', { roomId, adminToken })}
                      style={{ padding: '12px 30px', fontSize: '15px', background: 'linear-gradient(135deg, #00b0ff 0%, #0080ff 100%)', color: 'black', border: 'none', fontWeight: 'bold' }}
                    >
                      Reveal Results 📢
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* OPEN QUESTION REVEAL STATE */}
            {gameState.gameState === 'OPEN_QUESTION_REVEAL' && (
              <div className="glass-panel" style={{ flex: 1, padding: '35px', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', background: 'rgba(0, 176, 255, 0.1)', padding: '4px 15px', borderRadius: '20px', color: '#00b0ff', fontWeight: 'bold' }}>
                  OPEN ROUND RESULTS
                </span>

                <div style={{ maxWidth: '600px', margin: '15px 0' }}>
                  <h3 style={{ fontSize: '24px', color: 'var(--text-muted)', marginBottom: '10px' }}>{activeQuestion?.text}</h3>
                  <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                    Correct Answer: <strong style={{ color: 'var(--pitch-accent)', fontSize: '22px' }}>Option {gameState.lastResults?.correctAnswer}</strong>
                  </div>
                </div>

                {adminMode && (
                  <div style={{ marginTop: '20px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => socket.emit('admin-next-auction-match', { roomId, adminToken })}
                      style={{ padding: '12px 30px', fontSize: '15px', background: '#00e676', color: 'black', border: 'none', fontWeight: 'bold' }}
                    >
                      Next Match (Back to Lobby) ⚽
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Panel: Standings Podium */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', borderTop: '3px solid #f59e0b' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 Standings
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '8px', width: '60px' }}>RANK</th>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>TEAM</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>TOKENS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((g, idx) => {
                    let rankText = (idx + 1).toString();
                    if (idx === 0) rankText = '🥇';
                    else if (idx === 1) rankText = '🥈';
                    else if (idx === 2) rankText = '🥉';
                    
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold', fontSize: '15px' }}>{rankText}</td>
                        <td style={{ padding: '12px 0', fontWeight: 'bold', fontSize: '15px' }}>{g.name}</td>
                        <td className="gold-token" style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                          {g.tokens} 🪙
                        </td>
                      </tr>
                    );
                  })}
                  {sortedGroups.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                        No groups configured
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '15px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
              🏟️ PYTHON WORLD CUP ARENA
            </div>
          </div>

        </div>

      </div>
    );
  };

  if (roomId === 'auction') {
    return renderAuctionMode();
  }

  // Do not sort questions, keep database order
  const sortedQuestions = gameState.questions || [];

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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '15px', width: '100%' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>MANUAL URL</span>
                <strong style={{ fontSize: '13px', color: 'var(--pitch-accent)', wordBreak: 'break-all' }}>{joinUrl}</strong>
              </div>
              
              <div style={{ background: 'rgba(0, 230, 118, 0.05)', padding: '12px 10px', borderRadius: '8px', border: '1px solid var(--pitch-accent-glow)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--pitch-accent)', display: 'block', fontWeight: 'bold' }}>GAME PIN</span>
                <strong style={{ fontSize: '20px', color: '#fff', letterSpacing: '1px', fontWeight: '950' }}>{gameState.pin || '2026'}</strong>
              </div>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Create a player account, enter the Game PIN above, and prepare to make predictions!
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)', fontWeight: 'bold' }}>
                            PLAYED 🔒
                          </span>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => socket.emit('admin-unlock-question', { roomId, adminToken, questionId: q.id })}
                            style={{ padding: '4px 10px', fontSize: '11px', borderColor: 'var(--pitch-accent-glow)', color: 'var(--pitch-accent)' }}
                          >
                            Unlock
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '11px', flexShrink: 0, marginLeft: '10px' }}
                          onClick={() => socket.emit('admin-open-question', { roomId, adminToken, questionId: q.id })}
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
                    onClick={() => socket.emit('admin-close-submissions', { roomId, adminToken })}
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
            <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                className="btn-primary" 
                style={{ fontSize: '16px', padding: '12px 30px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #00b0ff 0%, #00e676 100%)', color: '#07170f', border: 'none' }}
                onClick={() => socket.emit('admin-reveal-results', { roomId, adminToken, revealStyle: 'VAR' })}
              >
                <Play size={16} /> Reveal via VAR 🖥️
              </button>
              <button 
                className="btn-primary" 
                style={{ fontSize: '16px', padding: '12px 30px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #ff9100 0%, #ff3d00 100%)', color: 'white', border: 'none' }}
                onClick={() => socket.emit('admin-reveal-results', { roomId, adminToken, revealStyle: 'PENALTY' })}
              >
                <Play size={16} /> Reveal via Penalty ⚡
              </button>
            </div>
          )}
        </div>
      )}

      {/* REVEAL SUSPENSE / VAR OR PENALTY OVERLAY */}
      {gameState.gameState === 'REVEAL_SUSPENSE' && (
        <div className="var-overlay">
          {gameState.revealStyle === 'PENALTY' ? (
            <div className="var-screen" style={{ transform: 'scale(1.2)', background: 'linear-gradient(135deg, #1e0508 0%, #3a0007 100%)', border: '3px solid #ff3d00', boxShadow: '0 0 40px rgba(255, 61, 0, 0.4)' }}>
              <div className="var-ref" style={{ animation: 'bounce-ball 0.8s infinite ease-in-out' }}>🥅⚽</div>
              <div className="var-text" style={{ fontSize: '40px', color: '#ff3d00', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 20px rgba(255,61,0,0.6)' }}>Penalty Shootout!</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '35px' }}>
                GOALKEEPER DIVING... TAKING THE SHOT!
              </p>
              <div className="var-progress-bar" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="var-progress-fill" style={{ background: 'linear-gradient(90deg, #ff9100 0%, #ff3d00 100%)', width: '100%', transition: 'width 1.0s linear' }}></div>
              </div>
            </div>
          ) : (
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
          )}
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
                    onClick={() => socket.emit('admin-next-match', { roomId, adminToken })}
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
                  {[...standings].sort((a, b) => b.fanTokens - a.fanTokens).map((p) => {
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
