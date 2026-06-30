import React, { useState } from 'react';
import { Play, Square, Award, Settings, RefreshCw, Trash2, Plus, Download, AlertTriangle, HelpCircle, Coins, Users, PlusCircle, MinusCircle, UserMinus, ArrowLeft, Image, Unlock, Edit } from 'lucide-react';

function OrganizerView({ socket, gameState, standings, roomId, roomName, onBackToHub }) {
  // Modal & Dialog States
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(null); // question object
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // Forms
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState('MEDIUM');
  
  // Custom Media Upload & Alignment
  const [newQuestionImage, setNewQuestionImage] = useState(null); // base64 data url
  const [newQuestionImageName, setNewQuestionImageName] = useState('');
  const [newQuestionAlign, setNewQuestionAlign] = useState('TOP'); // TOP | BOTTOM | LEFT | RIGHT

  // Offline mode input
  const [manualYes, setManualYes] = useState('');
  const [manualNo, setManualNo] = useState('');
  const [showOfflineInput, setShowOfflineInput] = useState(false);

  // Local settings copy
  const [startingTokens, setStartingTokens] = useState(gameState.config.startingTokens);
  const [participationReward, setParticipationReward] = useState(gameState.config.participationReward);
  const [correctPredictionReward, setCorrectPredictionReward] = useState(gameState.config.correctPredictionReward || 10);
  const [goldenGoalReward, setGoldenGoalReward] = useState(gameState.config.goldenGoalReward || 20);
  const [timerDuration, setTimerDuration] = useState(gameState.config.timerDuration);
  const [revealStyle, setRevealStyle] = useState(gameState.config.revealStyle);

  // Token stats
  const totalPlayers = standings.length;
  const totalTokens = standings.reduce((acc, p) => acc + p.fanTokens, 0);
  const avgTokens = totalPlayers > 0 ? Math.round(totalTokens / totalPlayers) : 0;

  // Manage config save
  const saveConfig = () => {
    socket.emit('admin-update-config', {
      roomId,
      config: {
        startingTokens: parseInt(startingTokens) || 100,
        participationReward: parseInt(participationReward) || 0,
        correctPredictionReward: parseInt(correctPredictionReward) || 10,
        goldenGoalReward: parseInt(goldenGoalReward) || 20,
        timerDuration: parseInt(timerDuration) || 0,
        revealStyle
      }
    }, (res) => {
      if (res.success) {
        setShowSettings(false);
      }
    });
  };

  // Convert File Input to Base64
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewQuestionImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewQuestionImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Add/Edit Question with Media Flow
  const addQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    // Check if newQuestionImage is a base64 string (starts with data:image)
    const isNewImage = newQuestionImage && newQuestionImage.startsWith('data:image');

    if (isNewImage) {
      // Step 1: Upload image file to server first
      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: newQuestionImage, filename: newQuestionImageName })
      })
        .then(res => res.json())
        .then(uploadRes => {
          if (uploadRes.success) {
            saveQuestion(uploadRes.url);
          } else {
            alert('Image upload failed: ' + uploadRes.error);
          }
        })
        .catch(() => alert('Network error uploading question media.'));
    } else {
      saveQuestion(newQuestionImage); // Keep existing url or null
    }
  };

  const saveQuestion = (imageUrl) => {
    let updated;
    if (editingQuestionId) {
      updated = gameState.questions.map(q => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            text: newQuestionText.trim(),
            difficulty: newQuestionDifficulty,
            imageUrl: imageUrl,
            imageAlign: newQuestionAlign
          };
        }
        return q;
      });
    } else {
      const newQ = {
        id: 'q-' + Math.random().toString(36).substring(2, 9),
        text: newQuestionText.trim(),
        difficulty: newQuestionDifficulty,
        imageUrl: imageUrl,
        imageAlign: newQuestionAlign,
        isPlayed: false
      };
      updated = [...gameState.questions, newQ];
    }

    socket.emit('admin-update-questions', { roomId, questions: updated }, (res) => {
      if (res.success) {
        setNewQuestionText('');
        setNewQuestionImage(null);
        setNewQuestionImageName('');
        setNewQuestionAlign('TOP');
        setEditingQuestionId(null);
        setShowAddQuestion(false);
      }
    });
  };

  const deleteQuestion = (id) => {
    const updated = gameState.questions.filter(q => q.id !== id);
    socket.emit('admin-update-questions', { roomId, questions: updated });
  };

  const unlockQuestion = (questionId) => {
    socket.emit('admin-unlock-question', { roomId, questionId }, (res) => {
      if (!res.success) {
        alert(res.error || 'Failed to unlock question.');
      }
    });
  };

  // Game Control Actions
  const handleLaunchQuestion = (q) => {
    setShowLaunchConfirm(q);
  };

  const confirmLaunchQuestion = () => {
    if (!showLaunchConfirm) return;
    socket.emit('admin-open-question', { roomId, questionId: showLaunchConfirm.id }, (res) => {
      if (res.success) {
        setShowLaunchConfirm(null);
      }
    });
  };

  const closeSubmissions = () => {
    socket.emit('admin-close-submissions', { roomId });
  };

  const revealResults = () => {
    socket.emit('admin-reveal-results', { roomId });
  };

  const resetGame = () => {
    socket.emit('admin-reset-game', { roomId }, () => {
      setShowResetConfirm(false);
    });
  };

  const exportCSV = () => {
    window.open(`/api/export/${roomId}`, '_blank');
  };

  // Adjust player balance
  const adjustTokens = (playerId, amount) => {
    socket.emit('admin-adjust-tokens', { roomId, playerId, amount });
  };

  // Kick player
  const kickPlayer = (playerId) => {
    if (confirm("Are you sure you want to kick this player from the stadium?")) {
      socket.emit('admin-kick-player', { roomId, playerId });
    }
  };

  // Recovery tools
  const reopenRound = () => {
    socket.emit('admin-reopen-round', { roomId });
  };

  const cancelRound = () => {
    if (gameState.gameState === 'REVEALED') {
      socket.emit('admin-next-match', { roomId });
    } else {
      if (confirm("Cancel current round? This will clear all predictions and restore active players' Golden Goals for this round.")) {
        socket.emit('admin-cancel-round', { roomId });
      }
    }
  };

  const resetQuestion = () => {
    if (confirm("Clear all predictions for this question?")) {
      socket.emit('admin-reset-question', { roomId });
    }
  };

  // Trigger manual results submission (Offline Mode)
  const submitManualResults = () => {
    const yes = parseInt(manualYes);
    const no = parseInt(manualNo);
    if (isNaN(yes) || isNaN(no)) {
      alert("Please enter valid Yes and No counts.");
      return;
    }
    
    socket.emit('admin-emergency-offline', { roomId, yesCount: yes, noCount: no }, (res) => {
      if (res.success) {
        setShowOfflineInput(false);
        setManualYes('');
        setManualNo('');
      }
    });
  };

  return (
    <div className="app-container" style={{ maxWidth: '1400px' }}>
      
      {/* Header Info */}
      <header className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '20px', borderTop: '3px solid var(--pitch-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={onBackToHub}>
            <ArrowLeft size={14} /> Hub
          </button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏆 REFEREE CONTROL PANEL
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Workspace: <strong style={{ color: '#fff' }}>{roomName}</strong> | Game State: <strong style={{ color: 'var(--pitch-accent)' }}>{gameState.gameState}</strong>
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <Users size={12} /> STADIUM
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalPlayers} Players</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold-trophy)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <Coins size={12} /> CIRCULATION
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gold-trophy)' }}>{totalTokens} 🪙</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <Award size={12} /> AVERAGE
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{avgTokens} 🪙</div>
          </div>
        </div>

        <div className="flex-wrap-mobile">
          <button className="btn-secondary" onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={16} /> Rules Config
          </button>
          <button className="btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pitch-accent)', borderColor: 'var(--pitch-accent-glow)' }}>
            <Download size={16} /> Standings CSV
          </button>
          <button className="btn-danger" onClick={() => setShowResetConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} /> Full Reset
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="responsive-grid-2-col" style={{ flex: 1 }}>
        
        {/* Left Side: Game Controller & Question Bank */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Game Controller Panel */}
          <section className="glass-panel" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              ⚽ LIVE MATCH STEWARD
            </h2>

            {gameState.gameState === 'LOBBY' ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <HelpCircle size={40} style={{ color: 'var(--text-secondary)', marginBottom: '10px' }} />
                <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No Active Match</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Select a question from the Match Roster below or start from the Projector View.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', background: 'var(--glass-border)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    ACTIVE QUESTION (State: {gameState.gameState})
                  </span>
                  <h3 style={{ fontSize: '18px', marginTop: '8px', fontWeight: 'bold' }}>
                    {gameState.activeQuestion?.text}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--pitch-accent)', fontWeight: 'bold' }}>
                      📩 Predictions: {gameState.submissionsCount} / {totalPlayers} Locked
                    </span>
                    {gameState.timerSecondsRemaining > 0 && (
                      <span style={{ color: 'var(--red-card)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⏱️ Timer: {gameState.timerSecondsRemaining}s
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {gameState.gameState === 'ACTIVE_QUESTION' && (
                    <button className="btn-primary" onClick={closeSubmissions} style={{ background: 'linear-gradient(135deg, var(--red-card) 0%, #d50000 100%)', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Square size={16} /> Close Predictions (Ref Whistle)
                    </button>
                  )}
                  {(gameState.gameState === 'CLOSED' || gameState.gameState === 'ACTIVE_QUESTION') && (
                    <button className="btn-primary" onClick={revealResults} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Play size={16} /> Reveal results & Award Tokens ({gameState.config.revealStyle} Reveal)
                    </button>
                  )}
                  {gameState.gameState === 'REVEALED' && (
                    <button className="btn-primary" onClick={cancelRound} style={{ background: 'var(--text-muted)', color: 'var(--pitch-green-dark)', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Next Match (Lobby)
                    </button>
                  )}
                  
                  <button className="btn-secondary" onClick={() => setShowOfflineInput(!showOfflineInput)}>
                    ⚠️ Manual Input (Offline Backup)
                  </button>
                </div>

                {/* Emergency Offline Input */}
                {showOfflineInput && (
                  <div className="glass-panel" style={{ padding: '15px', background: 'rgba(255, 23, 68, 0.05)', border: '1px solid var(--red-glow)', borderRadius: '12px', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--red-card)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={16} /> EMERGENCY OFFLINE MODE
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      If players are unable to submit due to network issues, take a hand-count in the room and enter the totals below.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>YES Count</label>
                        <input type="number" className="text-input" style={{ width: '80px', padding: '8px' }} value={manualYes} onChange={(e) => setManualYes(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>NO Count</label>
                        <input type="number" className="text-input" style={{ width: '80px', padding: '8px' }} value={manualNo} onChange={(e) => setManualNo(e.target.value)} />
                      </div>
                      <button className="btn-danger" onClick={submitManualResults} style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '13px' }}>
                        Process Manual Results
                      </button>
                    </div>
                  </div>
                )}

                {/* Recovery Tools Panel */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '8px' }}>
                    🔧 REF RECOVERY TOOLS (Use only if mistake occurs)
                  </div>
                  <div className="flex-wrap-mobile">
                    <button className="btn-secondary" onClick={reopenRound} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Reopen Round
                    </button>
                    <button className="btn-secondary" onClick={resetQuestion} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Reset Predictions
                    </button>
                    <button className="btn-danger" onClick={() => { if(confirm("Are you sure you want to cancel the round?")) { socket.emit('admin-cancel-round', { roomId }); } }} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Cancel Round & Refund
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Question Bank Manager */}
          <section className="glass-panel" style={{ padding: '20px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                📋 MATCH ROSTER (QUESTION BANK)
              </h2>
              <button className="btn-primary" onClick={() => setShowAddQuestion(true)} style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Add Question
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
              {gameState.questions.map((q) => {
                const isSelected = gameState.currentQuestionId === q.id;
                let diffColor = 'var(--text-muted)';
                if (q.difficulty === 'EASY') diffColor = 'var(--pitch-accent)';
                if (q.difficulty === 'HARD') diffColor = 'var(--red-card)';
                if (q.difficulty === 'PRE-MATCH') diffColor = '#00b0ff';

                return (
                  <div 
                    key={q.id} 
                    className="question-item"
                    style={{ 
                      background: isSelected ? 'rgba(0, 230, 118, 0.08)' : 'rgba(0,0,0,0.15)', 
                      border: isSelected ? '1px solid var(--pitch-accent)' : '1px solid var(--glass-border)'
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '15px' }}>
                      <span style={{ fontSize: '10px', color: diffColor, fontWeight: 'bold', border: `1px solid ${diffColor}`, padding: '1px 6px', borderRadius: '3px', marginRight: '8px' }}>
                        {q.difficulty}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: isSelected ? 'bold' : 'normal' }}>{q.text}</span>
                      {q.imageUrl && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--gold-trophy)', background: 'rgba(255,215,0,0.1)', padding: '1px 5px', borderRadius: '3px' }}>🖼️ {q.imageAlign}</span>}
                      {q.isPlayed && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px' }}>PLAYED 🔒</span>}
                    </div>

                    <div className="question-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {q.isPlayed && (
                        <button
                          className="btn-secondary"
                          onClick={() => unlockQuestion(q.id)}
                          style={{ padding: '4px 8px', fontSize: '11px', borderColor: 'var(--pitch-accent-glow)', color: 'var(--pitch-accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="Unlock Question"
                        >
                          <Unlock size={11} /> Unlock
                        </button>
                      )}
                      
                      <button
                        className="btn-primary"
                        onClick={() => handleLaunchQuestion(q)}
                        disabled={gameState.gameState !== 'LOBBY' && !isSelected}
                        style={{ padding: '6px 12px', fontSize: '12px', background: isSelected ? 'var(--pitch-accent)' : 'var(--text-muted)', color: 'var(--pitch-green-dark)', boxShadow: 'none' }}
                      >
                        {isSelected ? 'ACTIVE ⚽' : 'Launch'}
                      </button>

                      <button
                        onClick={() => {
                          setEditingQuestionId(q.id);
                          setNewQuestionText(q.text);
                          setNewQuestionDifficulty(q.difficulty);
                          setNewQuestionImage(q.imageUrl);
                          setNewQuestionImageName(q.imageUrl ? q.imageUrl.split('/').pop() : '');
                          setNewQuestionAlign(q.imageAlign || 'TOP');
                          setShowAddQuestion(true);
                        }}
                        disabled={isSelected}
                        style={{ background: 'none', border: 'none', color: isSelected ? 'var(--text-muted)' : 'var(--pitch-accent)', cursor: isSelected ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Edit Question"
                      >
                        <Edit size={16} />
                      </button>
                      
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        disabled={isSelected}
                        style={{ background: 'none', border: 'none', color: isSelected ? 'var(--text-muted)' : 'var(--red-card)', cursor: isSelected ? 'not-allowed' : 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right Side: Player List & Standing */}
        <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
              🏃 STADIUM LINEUP
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '700px' }}>
            {standings.map((p) => {
              const accuracy = p.matchesPlayed > 0 ? Math.round((p.goals / p.matchesPlayed) * 100) : 0;
              const hasPredicted = gameState.submittedPlayerIds && gameState.submittedPlayerIds.includes(p.id);

              return (
                <div 
                  key={p.id} 
                  style={{ 
                    padding: '10px 12px', 
                    background: 'rgba(0,0,0,0.15)', 
                    border: `1px solid ${hasPredicted ? 'var(--pitch-accent)' : 'var(--glass-border)'}`, 
                    borderRadius: '8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                        {p.currentRank}
                      </span>
                      <strong style={{ fontSize: '13px' }}>{p.name}</strong>
                      {hasPredicted && <span style={{ fontSize: '10px', background: 'var(--pitch-accent)', color: 'var(--pitch-green-dark)', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>PRED ⚽</span>}
                    </div>
                    <span className="gold-token" style={{ fontSize: '14px' }}>
                      {p.fanTokens} 🪙
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Acc: {accuracy}% ({p.goals}/{p.matchesPlayed})</span>
                    <span>GG: {p.goldenGoalAvailable ? 'Avail' : 'Used'}</span>
                    
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--pitch-accent)', cursor: 'pointer' }} onClick={() => adjustTokens(p.id, 10)} title="Add 10 tokens">
                        <PlusCircle size={14} />
                      </button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--red-card)', cursor: 'pointer' }} onClick={() => adjustTokens(p.id, -10)} title="Deduct 10 tokens">
                        <MinusCircle size={14} />
                      </button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => kickPlayer(p.id)} title="Kick Player">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {standings.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
                No players in stadium yet.
              </div>
            )}
          </div>
        </section>

      </div>

      {/* CONFIRM QUESTION LAUNCH MODAL */}
      {showLaunchConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '480px', width: '90%', textAlign: 'center' }}>
            <HelpCircle size={48} style={{ color: 'var(--pitch-accent)', marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>Confirm Question Launch?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.4' }}>
              Are you sure you want to open this question to the lobby? All current session wagers will be reset.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)', margin: '15px 0', textAlign: 'left' }}>
              <span style={{ fontSize: '11px', color: 'var(--pitch-accent)', fontWeight: 'bold' }}>[{showLaunchConfirm.difficulty}] QUESTION:</span>
              <p style={{ fontWeight: 'bold', fontSize: '15px', marginTop: '4px' }}>{showLaunchConfirm.text}</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowLaunchConfirm(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmLaunchQuestion}>Launch Match ⚽</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET GAME MODAL */}
      {showResetConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center', border: '2px solid var(--red-card)' }}>
            <AlertTriangle size={48} style={{ color: 'var(--red-card)', marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '850', color: 'var(--red-card)', marginBottom: '10px' }}>FULL GAME RESET?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '25px', lineHeight: '1.4' }}>
              This will erase all registered players, Fan Token balances, and stats history. This action cannot be undone!
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={resetGame}>Yes, Reset Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showAddQuestion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={20} style={{ color: 'var(--pitch-accent)' }} /> {editingQuestionId ? 'Edit Question Details' : 'Add Question to Bank'}
            </h3>
            
            <form onSubmit={addQuestion}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Question Text</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="e.g. Do you prefer debug than write docs?" 
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Difficulty Classification</label>
                  <select 
                    className="text-input"
                    style={{ background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)' }}
                    value={newQuestionDifficulty} 
                    onChange={(e) => setNewQuestionDifficulty(e.target.value)}
                  >
                    <option value="PRE-MATCH">🔵 PRE-MATCH (TRIAL)</option>
                    <option value="EASY">🟢 EASY</option>
                    <option value="MEDIUM">🟡 MEDIUM</option>
                    <option value="HARD">🔴 HARD</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Image Alignment</label>
                  <select
                    className="text-input"
                    style={{ background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)' }}
                    value={newQuestionAlign}
                    onChange={(e) => setNewQuestionAlign(e.target.value)}
                  >
                    <option value="TOP">Image ABOVE Text (TOP)</option>
                    <option value="BOTTOM">Image BELOW Text (BOTTOM)</option>
                    <option value="LEFT">Image LEFT of Text</option>
                    <option value="RIGHT">Image RIGHT of Text</option>
                  </select>
                </div>
              </div>

              {/* Media Upload input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  Question Media / Meme (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, padding: '10px 15px' }}>
                    <Image size={16} /> Choose File
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageFileChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {newQuestionImageName || "No file chosen"}
                  </span>
                  {newQuestionImage && (
                    <button 
                      type="button" 
                      onClick={() => { setNewQuestionImage(null); setNewQuestionImageName(''); }} 
                      style={{ background: 'none', border: 'none', color: 'var(--red-card)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* LIVE LAYOUT CHECKER PREVIEW PANEL */}
              <div style={{ marginBottom: '25px', border: '1px dashed var(--glass-border)', padding: '15px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: '11px', color: 'var(--pitch-accent)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  📺 LIVE LAYOUT CHECKER (PREVIEW)
                </span>
                
                <div style={{
                  display: 'flex',
                  flexDirection: newQuestionImage ? (newQuestionAlign === 'BOTTOM' ? 'column' : newQuestionAlign === 'LEFT' ? 'row-reverse' : newQuestionAlign === 'RIGHT' ? 'row' : 'column-reverse') : 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '15px',
                  borderRadius: '8px',
                  minHeight: '100px'
                }}>
                  {newQuestionImage && (
                    <div style={{ flex: '1 1 100px', display: 'flex', justifyContent: 'center' }}>
                      <img 
                        src={newQuestionImage} 
                        alt="Preview Thumbnail" 
                        style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--glass-border)', objectFit: 'contain' }} 
                      />
                    </div>
                  )}
                  <div style={{ flex: '2 1 150px', fontSize: '14px', fontWeight: 'bold', color: newQuestionText ? 'white' : 'var(--text-muted)', lineHeight: '1.4' }}>
                    {newQuestionText || "Question text will appear here..."}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => {
                  setNewQuestionText('');
                  setNewQuestionImage(null);
                  setNewQuestionImageName('');
                  setNewQuestionAlign('TOP');
                  setEditingQuestionId(null);
                  setShowAddQuestion(false);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingQuestionId ? 'Save Changes 💾' : 'Add Question ⚽'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS / RULES CONFIG MODAL */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              🔧 Rules & Token Economy Config
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Starting Balance (Tokens)</label>
                <input type="number" className="text-input" style={{ padding: '10px' }} value={startingTokens} onChange={(e) => setStartingTokens(e.target.value)} />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Participation Reward (Tokens per round)</label>
                <input type="number" className="text-input" style={{ padding: '10px' }} value={participationReward} onChange={(e) => setParticipationReward(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Correct Prediction Reward (Tokens)</label>
                <input type="number" className="text-input" style={{ padding: '10px' }} value={correctPredictionReward} onChange={(e) => setCorrectPredictionReward(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Correct Prediction with Golden Goal (Tokens)</label>
                <input type="number" className="text-input" style={{ padding: '10px' }} value={goldenGoalReward} onChange={(e) => setGoldenGoalReward(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reveal Suspense Style</label>
                <select className="text-input" style={{ padding: '10px', background: 'var(--input-bg)', color: 'white' }} value={revealStyle} onChange={(e) => setRevealStyle(e.target.value)}>
                  <option value="VAR">🖥️ VAR Reveal (3s Suspense Countdown)</option>
                  <option value="PENALTY">⚡ Penalty Shootout Reveal (Instant/0.5s)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Round Timer Duration (Seconds)</label>
                <select className="text-input" style={{ padding: '10px', background: 'var(--input-bg)', color: 'white' }} value={timerDuration} onChange={(e) => setTimerDuration(e.target.value)}>
                  <option value="0">Indefinite (Organizer whistle closes)</option>
                  <option value="30">30 Seconds</option>
                  <option value="60">60 Seconds</option>
                  <option value="90">90 Seconds</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveConfig}>Save Rules</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default OrganizerView;
