import React, { useState, useEffect } from 'react';
import { Play, Square, Award, Settings, RefreshCw, Trash2, Plus, Download, AlertTriangle, HelpCircle, Coins, Users, PlusCircle, MinusCircle, UserMinus, ArrowLeft, Image, Unlock, Edit, Lock } from 'lucide-react';

function OrganizerView({ socket, gameState, standings: rawStandings, roomId, roomName, adminToken, onBackToHub }) {
  const standings = Array.isArray(rawStandings) ? rawStandings : [];
  // Modal & Dialog States
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(null); // question object
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // Security & Recovery modal state has been moved globally to App.jsx.

  // Auction specific states
  const [showAddAuctionQuestion, setShowAddAuctionQuestion] = useState(false);
  const [showAddOpenQuestion, setShowAddOpenQuestion] = useState(false);

  // Form states for Auction Question
  const [aqText, setAqText] = useState('');
  const [aqDiff, setAqDiff] = useState('MEDIUM');
  const [aqCorrect, setAqCorrect] = useState('');
  const [aqImg, setAqImg] = useState(null);
  const [aqImgName, setAqImgName] = useState('');
  const [aqAlign, setAqAlign] = useState('TOP');
  const [editingAqId, setEditingAqId] = useState(null);
  const [aqItems, setAqItems] = useState([]);

  // Form states for Open Question
  const [oqText, setOqText] = useState('');
  const [oqA, setOqA] = useState('');
  const [oqB, setOqB] = useState('');
  const [oqC, setOqC] = useState('');
  const [oqD, setOqD] = useState('');
  const [oqCorrect, setOqCorrect] = useState('A');
  const [editingOqId, setEditingOqId] = useState(null);

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
        timerDuration: parseInt(timerDuration) || 0
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

    socket.emit('admin-update-questions', { roomId, adminToken, questions: updated }, (res) => {
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
    socket.emit('admin-update-questions', { roomId, adminToken, questions: updated });
  };

  const unlockQuestion = (questionId) => {
    socket.emit('admin-unlock-question', { roomId, adminToken, questionId }, (res) => {
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
    socket.emit('admin-open-question', { roomId, adminToken, questionId: showLaunchConfirm.id }, (res) => {
      if (res.success) {
        setShowLaunchConfirm(null);
      }
    });
  };

  const closeSubmissions = () => {
    socket.emit('admin-close-submissions', { roomId, adminToken });
  };

  const revealResultsStyle = (style) => {
    socket.emit('admin-reveal-results', { roomId, adminToken, revealStyle: style });
  };

  const resetGame = () => {
    socket.emit('admin-reset-game', { roomId, adminToken }, () => {
      setShowResetConfirm(false);
    });
  };

  const exportCSV = () => {
    window.open(`/api/export/${roomId}`, '_blank');
  };

  // Adjust player balance
  const adjustTokens = (playerId, amount) => {
    socket.emit('admin-adjust-tokens', { roomId, adminToken, playerId, amount });
  };

  // Kick player
  const kickPlayer = (playerId) => {
    if (confirm("Are you sure you want to kick this player from the stadium?")) {
      socket.emit('admin-kick-player', { roomId, adminToken, playerId });
    }
  };

  // Recovery tools
  const reopenRound = () => {
    socket.emit('admin-reopen-round', { roomId, adminToken });
  };

  const cancelRound = () => {
    if (gameState.gameState === 'REVEALED') {
      socket.emit('admin-next-match', { roomId, adminToken });
    } else {
      if (confirm("Cancel current round? This will clear all predictions and restore active players' Golden Goals for this round.")) {
        socket.emit('admin-cancel-round', { roomId, adminToken });
      }
    }
  };

  const resetQuestion = () => {
    if (confirm("Clear all predictions for this question?")) {
      socket.emit('admin-reset-question', { roomId, adminToken });
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

    socket.emit('admin-emergency-offline', { roomId, adminToken, yesCount: yes, noCount: no }, (res) => {
      if (res.success) {
        setShowOfflineInput(false);
        setManualYes('');
        setManualNo('');
      }
    });
  };

  const renderAuctionMode = () => {
    const activeQuestion = gameState.activeQuestion;
    const currentPrice = gameState.currentBid || 10;
    const isAnswering = gameState.gameState === 'AUCTION_ANSWERING' || gameState.gameState === 'AUCTION_ANSWERED';
    const sortedStandings = [...standings].sort((a, b) => b.fanTokens - a.fanTokens);

    const handleStartAuction = (qId) => {
      socket.emit('admin-start-auction', { roomId, adminToken, questionId: qId }, (res) => {
        if (!res.success) alert(res.error);
      });
    };

    const handleCloseBidding = () => {
      socket.emit('admin-close-bidding', { roomId, adminToken }, (res) => {
        if (!res.success) alert(res.error);
      });
    };

    const handleRevealAuctionResults = (isCorrectOverride) => {
      socket.emit('admin-reveal-auction-results', { roomId, adminToken, isCorrectOverride }, (res) => {
        if (!res.success) alert(res.error);
      });
    };

    const handleNextAuctionMatch = () => {
      socket.emit('admin-next-auction-match', { roomId, adminToken }, (res) => {
        if (!res.success) alert(res.error);
      });
    };

    const handleLaunchOpenQuestion = (qId) => {
      socket.emit('admin-launch-open-question', { roomId, adminToken, questionId: qId }, (res) => {
        if (!res.success) alert(res.error);
      });
    };

    const handleRevealOpenResults = () => {
      socket.emit('admin-reveal-open-results', { roomId, adminToken }, (res) => {
        if (!res.success) alert(res.error);
      });
    };

    // CRUD Auction Questions
    const saveAuctionQuestion = async (e) => {
      e.preventDefault();
      if (!aqText.trim() || !aqCorrect.trim()) return;

      let uploadedUrl = null;
      if (aqImg) {
        // Upload image if selected
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: aqImg, filename: aqImgName })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedUrl = uploadData.url;
        } else {
          alert('Failed to upload image.');
          return;
        }
      }

      let updatedQuestions = [...(gameState.questions || [])];
      const newQ = {
        id: editingAqId || 'aq-' + Date.now(),
        text: aqText.trim(),
        difficulty: aqDiff,
        correctAnswer: aqCorrect.trim(),
        imageUrl: uploadedUrl || (editingAqId ? updatedQuestions.find(q => q.id === editingAqId)?.imageUrl : null),
        imageAlign: aqAlign,
        isPlayed: false,
        items: aqItems
      };

      if (editingAqId) {
        updatedQuestions = updatedQuestions.map(q => q.id === editingAqId ? newQ : q);
      } else {
        updatedQuestions.push(newQ);
      }

      socket.emit('admin-update-questions', { roomId, adminToken, questions: updatedQuestions }, (res) => {
        if (res.success) {
          setShowAddAuctionQuestion(false);
          setAqText('');
          setAqCorrect('');
          setAqImg(null);
          setAqImgName('');
          setEditingAqId(null);
          setAqItems([]);
        } else {
          alert(res.error || 'Failed to update auction questions.');
        }
      });
    };

    const deleteAuctionQuestion = (qId) => {
      if (!window.confirm('Delete this auction question?')) return;
      const updated = (gameState.questions || []).filter(q => q.id !== qId);
      socket.emit('admin-update-questions', { roomId, adminToken, questions: updated });
    };

    const editAuctionQuestion = (q) => {
      setEditingAqId(q.id);
      setAqText(q.text);
      setAqDiff(q.difficulty);
      setAqCorrect(q.correctAnswer);
      setAqAlign(q.imageAlign || 'TOP');
      setAqImg(null);
      setAqImgName('');
      setAqItems(q.items || []);
      setShowAddAuctionQuestion(true);
    };

    // CRUD Open Questions
    const saveOpenQuestion = (e) => {
      e.preventDefault();
      if (!oqText.trim() || !oqA.trim() || !oqB.trim() || !oqC.trim() || !oqD.trim()) return;

      let updated = [...(gameState.openQuestions || [])];
      const newQ = {
        id: editingOqId || 'oq-' + Date.now(),
        text: oqText.trim(),
        options: [oqA.trim(), oqB.trim(), oqC.trim(), oqD.trim()],
        correctAnswer: oqCorrect,
        isPlayed: false
      };

      if (editingOqId) {
        updated = updated.map(q => q.id === editingOqId ? newQ : q);
      } else {
        updated.push(newQ);
      }

      socket.emit('admin-update-open-questions', { roomId, adminToken, openQuestions: updated }, (res) => {
        if (res.success) {
          setShowAddOpenQuestion(false);
          setOqText('');
          setOqA('');
          setOqB('');
          setOqC('');
          setOqD('');
          setOqCorrect('A');
          setEditingOqId(null);
        } else {
          alert(res.error || 'Failed to update open questions.');
        }
      });
    };

    const deleteOpenQuestion = (qId) => {
      if (!window.confirm('Delete this open question?')) return;
      const updated = (gameState.openQuestions || []).filter(q => q.id !== qId);
      socket.emit('admin-update-open-questions', { roomId, adminToken, openQuestions: updated });
    };

    const editOpenQuestion = (q) => {
      setEditingOqId(q.id);
      setOqText(q.text);
      setOqA(q.options[0] || '');
      setOqB(q.options[1] || '');
      setOqC(q.options[2] || '');
      setOqD(q.options[3] || '');
      setOqCorrect(q.correctAnswer);
      setShowAddOpenQuestion(true);
    };

    // Reset game handler
    const triggerReset = () => {
      if (window.confirm('WARNING: This wipes all registered Teams and resets standings. Proceed?')) {
        socket.emit('admin-reset-game', { roomId });
      }
    };

    // Render Groups layout in Lobby
    const renderLobbyGroupsManager = () => {
      const groups = gameState.groups || {
        "A": { id: "A", name: "Team A", playerIds: [], tokens: 100, itemsWon: [] },
        "B": { id: "B", name: "Team B", playerIds: [], tokens: 100, itemsWon: [] },
        "C": { id: "C", name: "Team C", playerIds: [], tokens: 100, itemsWon: [] }
      };
      const teamsLocked = gameState.teamsLocked || false;

      const activePlayers = [...standings];
      const unassignedPlayers = activePlayers.filter(p => {
        return !groups.A.playerIds.includes(p.id) &&
          !groups.B.playerIds.includes(p.id) &&
          !groups.C.playerIds.includes(p.id);
      });

      const handleMove = (pId, gId) => {
        if (teamsLocked) return;
        const updated = JSON.parse(JSON.stringify(groups));
        Object.values(updated).forEach(g => {
          g.playerIds = g.playerIds.filter(id => id !== pId);
        });
        if (gId) {
          updated[gId].playerIds.push(pId);
        }
        socket.emit('admin-save-groups', { roomId, adminToken, groups: updated }, (res) => {
          if (res && !res.success) alert(res.error || 'Failed to save team changes.');
        });
      };

      const handleAutofill = () => {
        if (teamsLocked) return;
        socket.emit('admin-autofill-groups', { roomId, adminToken }, (res) => {
          if (res && !res.success) alert(res.error || 'Failed to auto-fill teams.');
        });
      };

      const handleLockTeams = () => {
        const totalAssigned = Object.values(groups).reduce((sum, g) => sum + g.playerIds.length, 0);
        if (totalAssigned === 0) {
          alert('Assign at least one player to a team before locking.');
          return;
        }
        socket.emit('admin-lock-teams', { roomId, adminToken }, (res) => {
          if (res && !res.success) alert(res.error || 'Failed to lock teams.');
        });
      };

      const handleUnlockTeams = () => {
        socket.emit('admin-unlock-teams', { roomId, adminToken }, (res) => {
          if (res && !res.success) alert(res.error || 'Failed to unlock teams.');
        });
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>👥 Group Organizer & Balanced Auto-Fill</h3>
              {teamsLocked && (
                <span style={{ fontSize: '11px', background: 'rgba(255, 179, 0, 0.15)', color: '#ffb300', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(255, 179, 0, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={11} /> TEAMS LOCKED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {teamsLocked ? (
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--pitch-accent-glow)', color: 'var(--pitch-accent)' }} onClick={handleUnlockTeams}>
                  <Unlock size={12} /> Unlock Teams
                </button>
              ) : (
                <>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleAutofill}>
                    Auto-Fill Balanced Teams
                  </button>
                  <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)', color: 'black', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={handleLockTeams}>
                    <Lock size={12} /> Lock Teams
                  </button>
                </>
              )}
              <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)', color: 'black' }} onClick={() => socket.emit('admin-end-auction-game', { roomId, adminToken })}>
                End Game (Podium View) 🏆
              </button>
            </div>
          </div>

          {teamsLocked && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255, 179, 0, 0.05)', border: '1px solid rgba(255, 179, 0, 0.15)', padding: '10px 12px', borderRadius: '8px' }}>
              Team assignments are saved and locked. They will persist after a page refresh. Unlock teams to edit assignments or run auto-fill again.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            {Object.values(groups).map(g => (
              <div key={g.id} className="glass-panel" style={{ padding: '15px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '10px' }}>
                  <strong style={{ color: 'var(--pitch-accent)', fontSize: '14px' }}>{g.name}</strong>
                  <span className="gold-token" style={{ fontSize: '13px' }}>{g.tokens} 🪙</span>
                </div>

                {g.itemsWon && g.itemsWon.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span>Boxes won:</span>
                    {g.itemsWon.map((itm, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,215,0,0.1)', color: 'var(--gold-trophy)', padding: '1px 4px', borderRadius: '4px', fontSize: '10px' }}>
                        🎁 {itm.startsWith('OPENED:') ? itm.split(':')[1] : 'Hidden'}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '80px' }}>
                  {g.playerIds.map(pId => {
                    const profile = activePlayers.find(p => p.id === pId);
                    const isCaptain = g.bidderId === pId;
                    return (
                      <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isCaptain ? 'rgba(255, 179, 0, 0.08)' : 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '12px', border: isCaptain ? '1px solid rgba(255, 179, 0, 0.2)' : '1px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            title={isCaptain ? 'Team Bidder (Captain)' : `Promote ${profile?.name || pId} to Team Bidder`}
                            disabled={teamsLocked}
                            onClick={() => {
                              if (!isCaptain && !teamsLocked) {
                                socket.emit('admin-set-team-bidder', { roomId, adminToken, teamId: g.id, bidderId: pId });
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '0',
                              cursor: teamsLocked ? 'not-allowed' : (isCaptain ? 'default' : 'pointer'),
                              fontSize: '14px',
                              filter: isCaptain ? 'none' : 'grayscale(1) opacity(0.4)',
                              transition: 'filter 0.2s ease',
                              opacity: teamsLocked ? 0.5 : 1
                            }}
                          >
                            👑
                          </button>
                          <span style={{ fontWeight: isCaptain ? 'bold' : 'normal', color: isCaptain ? '#ffb300' : '#fff' }}>{profile?.name || pId}</span>
                        </div>
                        <select
                          value={g.id}
                          onChange={(e) => handleMove(pId, e.target.value)}
                          disabled={teamsLocked}
                          style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid var(--glass-border)', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', opacity: teamsLocked ? 0.5 : 1, cursor: teamsLocked ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="A">Team A</option>
                          <option value="B">Team B</option>
                          <option value="C">Team C</option>
                          <option value="">Remove</option>
                        </select>
                      </div>
                    );
                  })}
                  {g.playerIds.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>No players assigned</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {unassignedPlayers.length > 0 && (
            <div className="glass-panel" style={{ padding: '15px', background: 'rgba(255,255,255,0.01)' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                🏃 Unassigned Stadium Players ({unassignedPlayers.length})
              </strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {unassignedPlayers.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '6px', fontSize: '12px' }}>
                    <span>{p.name}</span>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button type="button" disabled={teamsLocked} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px', cursor: teamsLocked ? 'not-allowed' : 'pointer', fontSize: '10px', opacity: teamsLocked ? 0.5 : 1 }} onClick={() => handleMove(p.id, 'A')}>+A</button>
                      <button type="button" disabled={teamsLocked} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px', cursor: teamsLocked ? 'not-allowed' : 'pointer', fontSize: '10px', opacity: teamsLocked ? 0.5 : 1 }} onClick={() => handleMove(p.id, 'B')}>+B</button>
                      <button type="button" disabled={teamsLocked} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px', cursor: teamsLocked ? 'not-allowed' : 'pointer', fontSize: '10px', opacity: teamsLocked ? 0.5 : 1 }} onClick={() => handleMove(p.id, 'C')}>+C</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    // Render Bidding Stage operations
    const renderBiddingSteward = () => {
      const highestBidderTeam = gameState.highestBidder ? (gameState.groups && gameState.groups[gameState.highestBidder]?.name) : 'None';
      return (
        <div style={{ background: 'rgba(255, 179, 0, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 179, 0, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '15px' }}>
                Traditional Bidding Active: {activeQuestion?.difficulty} Container
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Attached Items: {activeQuestion?.items ? activeQuestion.items.length : 0} Mystery boxes
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ACTIVE BID</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffb300' }}>{currentPrice} 🪙</div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
            <strong>Highest Bidder:</strong> <span style={{ color: 'var(--pitch-accent)', fontWeight: 'bold' }}>{highestBidderTeam}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #00b0ff 0%, #00e676 100%)', color: 'black', border: 'none' }} onClick={() => socket.emit('admin-confirm-bid-winner', { roomId, adminToken })} disabled={!gameState.highestBidder}>
              Confirm Bid Winner 🔨
            </button>
            <button type="button" className="btn-secondary" style={{ borderColor: 'var(--red-card)', color: 'var(--red-card)' }} onClick={handleCloseBidding}>
              Cancel Bidding
            </button>
          </div>
        </div>
      );
    };

    // Render Answering/Grading Stage operations
    const renderAnsweringSteward = () => {
      const winnerTeamName = gameState.groups && gameState.groups[gameState.auctionWinner]?.name;
      return (
        <div style={{ background: 'rgba(0, 230, 118, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid var(--pitch-accent-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <strong style={{ fontSize: '15px', display: 'block' }}>
                Winner: {winnerTeamName || 'Unknown'}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Won Bid: {currentPrice} tokens • Verbal Answering in Progress...
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
            <div><strong>Question:</strong> {activeQuestion?.text}</div>
            <div style={{ marginTop: '5px' }}><strong>Correct Answer:</strong> {activeQuestion?.correctAnswer}</div>
            {activeQuestion?.items && activeQuestion.items.length > 0 && (
              <div style={{ marginTop: '5px', color: 'var(--gold-trophy)' }}>
                <strong>Attached Items:</strong> {activeQuestion.items.join(', ')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-primary" style={{ flex: 1, background: 'var(--pitch-accent)', color: '#07170f' }} onClick={() => socket.emit('admin-reveal-auction-result', { roomId, adminToken, isCorrect: true })}>
              Correct (GOAL! ⚽)
            </button>
            <button type="button" className="btn-secondary" style={{ flex: 1, borderColor: 'var(--red-card)', color: 'var(--red-card)' }} onClick={() => socket.emit('admin-reveal-auction-result', { roomId, adminToken, isCorrect: false })}>
              Incorrect (MISS! ❌)
            </button>
          </div>
        </div>
      );
    };

    // Render Endgame Podium item-reveal controls
    const renderEndgamePodiumSteward = () => {
      const groups = gameState.groups || {
        "A": { id: "A", name: "Team A", playerIds: [], tokens: 100, itemsWon: [] },
        "B": { id: "B", name: "Team B", playerIds: [], tokens: 100, itemsWon: [] },
        "C": { id: "C", name: "Team C", playerIds: [], tokens: 100, itemsWon: [] }
      };

      const handleRevealItem = (tId, idx) => {
        socket.emit('admin-reveal-team-item', { roomId, adminToken, teamId: tId, itemIdx: idx });
      };

      return (
        <div className="glass-panel" style={{ padding: '20px', border: '2px solid var(--gold-trophy)', width: '100%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-trophy)', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            🏆 ENDGAME GRAND REVEAL PANEL
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Click on each team's unopened gift box to reveal their item and apply token modifiers in real-time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            {Object.values(groups).map(g => (
              <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <strong style={{ fontSize: '13px', display: 'block', color: '#fff', marginBottom: '8px' }}>{g.name} ({g.tokens} 🪙)</strong>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(g.itemsWon || []).map((itm, idx) => {
                    const isOpened = itm.startsWith('OPENED:');
                    const val = isOpened ? itm.split(':')[1] : itm;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="btn-secondary"
                        disabled={isOpened}
                        onClick={() => handleRevealItem(g.id, idx)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderColor: isOpened ? 'rgba(255,255,255,0.05)' : 'var(--gold-trophy)',
                          color: isOpened ? 'var(--text-muted)' : 'var(--gold-trophy)'
                        }}
                      >
                        {isOpened ? `Opened: ${val} tokens` : `🎁 Open Box #${idx + 1}`}
                      </button>
                    );
                  })}
                  {(g.itemsWon || []).length === 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No items collected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="app-container" style={{ maxWidth: '1200px', padding: '20px' }}>

        {/* Header HUD */}
        <header className="glass-panel" style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '28px' }}>🔨</span>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '950', textTransform: 'uppercase' }}>Auction Organizer Control</h1>
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>{roomName} • PIN: {gameState.pin || '1127'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }} onClick={triggerReset}>
              <RefreshCw size={14} /> Full Reset
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }} onClick={onBackToHub}>
              <ArrowLeft size={14} /> Return to Hub
            </button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          <div className="glass-panel" style={{ padding: '15px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL TEAMS</div>
            <div style={{ fontSize: '32px', fontWeight: '950', color: '#fff', marginTop: '5px' }}>{totalPlayers}</div>
          </div>
          <div className="glass-panel" style={{ padding: '15px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL TOKENS</div>
            <div style={{ fontSize: '32px', fontWeight: '950', color: '#f59e0b', marginTop: '5px' }}>{totalTokens} 🪙</div>
          </div>
          <div className="glass-panel" style={{ padding: '15px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ACTIVE GAME STATE</div>
            <div style={{ fontSize: '16px', fontWeight: '950', color: 'var(--pitch-accent)', marginTop: '12px', textTransform: 'uppercase' }}>
              {gameState.gameState}
            </div>
          </div>
        </div>

        {gameState.gameState === 'AUCTION_END' ? (
          renderEndgamePodiumSteward()
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '25px' }}>

            {/* Left panel: round control & question lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

              {/* Active Control Panel */}
              <div className="glass-panel" style={{ padding: '25px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '15px', color: '#f59e0b', textTransform: 'uppercase' }}>
                  Active Round Operations
                </h2>

                {gameState.gameState === 'LOBBY' && renderLobbyGroupsManager()}
                {gameState.gameState === 'AUCTION_BIDDING' && renderBiddingSteward()}
                {gameState.gameState === 'AUCTION_ANSWERING' && renderAnsweringSteward()}

                {gameState.gameState === 'OPEN_QUESTION_ACTIVE' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 176, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 176, 255, 0.2)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>Open MCQ Round Active: {activeQuestion?.text}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Submissions: {gameState.submissionsCount} / {totalPlayers}</span>
                    </div>
                    <button type="button" className="btn-primary" style={{ background: '#00b0ff', color: 'black' }} onClick={handleRevealOpenResults}>
                      Reveal Results
                    </button>
                  </div>
                )}

                {gameState.gameState === 'OPEN_QUESTION_REVEAL' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 176, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 176, 255, 0.2)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>Open Round Results revealed</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click next to clean up the lobby.</span>
                    </div>
                    <button type="button" className="btn-primary" style={{ background: '#00b0ff', color: 'black' }} onClick={handleNextAuctionMatch}>
                      Next / Back to Lobby
                    </button>
                  </div>
                )}

              </div>

              {/* Auction Question list */}
              <div className="glass-panel" style={{ padding: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800' }}>🔨CONTAINER AUCTION ROSTER</h3>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => { setEditingAqId(null); setAqText(''); setAqCorrect(''); setAqImg(null); setAqImgName(''); setAqItems([]); setShowAddAuctionQuestion(true); }}>
                    <Plus size={12} /> Add Custom Container
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(gameState.questions || []).map((q, idx) => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ flex: 1, marginRight: '15px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            CONTAINER {idx + 1}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            color: q.difficulty === 'EASY' ? '#00e676' : q.difficulty === 'MEDIUM' ? '#ffb300' : '#ff1744',
                            background: q.difficulty === 'EASY' ? 'rgba(0, 230, 118, 0.05)' : q.difficulty === 'MEDIUM' ? 'rgba(255, 179, 0, 0.05)' : 'rgba(255, 23, 68, 0.05)'
                          }}>
                            {q.difficulty}
                          </span>
                          {q.items && q.items.length > 0 && (
                            <span style={{ fontSize: '10px', background: 'rgba(255,215,0,0.1)', color: 'var(--gold-trophy)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              🎁 {q.items.length} items
                            </span>
                          )}
                        </div>
                        <strong style={{ fontSize: '13px', display: 'block', color: '#fff' }}>{q.text}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Correct Answer: {q.correctAnswer}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button type="button" className="btn-secondary" style={{ padding: '6px' }} onClick={() => editAuctionQuestion(q)}>
                          <Edit size={12} />
                        </button>
                        <button type="button" className="btn-secondary" style={{ padding: '6px', borderColor: 'rgba(255,23,68,0.2)' }} onClick={() => deleteAuctionQuestion(q.id)}>
                          <Trash2 size={12} className="red-card" />
                        </button>
                        {q.isPlayed ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              PLAYED 🔒
                            </span>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => unlockQuestion(q.id)}
                              style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--pitch-accent-glow)', color: 'var(--pitch-accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="Unlock Container"
                            >
                              <Unlock size={11} /> Unlock
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '11px', background: 'linear-gradient(135deg, #f59e0b 0%, #ff5252 100%)', color: '#170c00' }}
                            onClick={() => {
                              socket.emit('admin-start-container-auction', { roomId, adminToken, questionId: q.id }, (res) => {
                                if (res && !res.success) alert(res.error || 'Failed to start bidding.');
                              });
                            }}
                          >
                            START BIDDING 🔨
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(gameState.questions || []).length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
                      No containers preloaded. Click Add Custom Container to start.
                    </div>
                  )}
                </div>
              </div>

              {/* Open Questions List */}
              <div className="glass-panel" style={{ padding: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800' }}>📢 RECOVERY MCQ QUESTIONS</h3>
                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => { setEditingOqId(null); setOqText(''); setOqA(''); setOqB(''); setOqC(''); setOqD(''); setOqCorrect('A'); setShowAddOpenQuestion(true); }}>
                    <Plus size={12} /> Add MCQ
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(gameState.openQuestions || []).map((q, idx) => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ flex: 1, marginRight: '15px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            MCQ {idx + 1}
                          </span>
                        </div>
                        <strong style={{ fontSize: '13px', display: 'block', color: '#fff' }}>{q.text}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Options: {q.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(', ')} | Correct: {q.correctAnswer}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button type="button" className="btn-secondary" style={{ padding: '6px' }} onClick={() => editOpenQuestion(q)}>
                          <Edit size={12} />
                        </button>
                        <button type="button" className="btn-secondary" style={{ padding: '6px', borderColor: 'rgba(255,23,68,0.2)' }} onClick={() => deleteOpenQuestion(q.id)}>
                          <Trash2 size={12} className="red-card" />
                        </button>
                        {q.isPlayed ? (
                          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            PLAYED 🔒
                          </span>
                        ) : (
                          <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', background: '#00b0ff', color: 'black' }} onClick={() => handleLaunchOpenQuestion(q.id)}>
                            LAUNCH MCQ 📢
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right panel: team standings & token controls */}
            <div>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> TEAMS STANDINGS
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '700px', overflowY: 'auto' }}>
                  {Object.values(gameState.groups || {}).map((p) => (
                    <div key={p.id} style={{ padding: '10px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--glass-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '13px', display: 'block' }}>{p.name}</strong>
                        <span className="gold-token" style={{ fontSize: '12px', fontWeight: 'bold' }}>{p.tokens} 🪙</span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => socket.emit('admin-adjust-tokens', { roomId, playerId: p.id, amount: 5, adminToken })}>
                          +5
                        </button>
                        <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => socket.emit('admin-adjust-tokens', { roomId, playerId: p.id, amount: -5, adminToken })}>
                          -5
                        </button>
                      </div>
                    </div>
                  ))}
                  {Object.keys(gameState.groups || {}).length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '12px' }}>
                      No groups configured.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MODAL: ADD/EDIT AUCTION QUESTION */}
        {showAddAuctionQuestion && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '95vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px' }}>
                {editingAqId ? 'Edit Auction Question' : 'Add Auction Question'}
              </h3>
              <form onSubmit={saveAuctionQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Question Text</label>
                  <textarea className="text-input" style={{ minHeight: '80px', padding: '10px' }} value={aqText} onChange={(e) => setAqText(e.target.value)} required />
                </div>

                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Difficulty</label>
                  <select className="text-input" style={{ padding: '10px', background: 'var(--input-bg)', color: 'white' }} value={aqDiff} onChange={(e) => setAqDiff(e.target.value)}>
                    <option value="EASY">🟢 EASY</option>
                    <option value="MEDIUM">🟡 MEDIUM</option>
                    <option value="HARD">🔴 HARD</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Correct Answer String</label>
                  <input type="text" className="text-input" style={{ padding: '10px' }} value={aqCorrect} onChange={(e) => setAqCorrect(e.target.value)} required placeholder="e.g. len or [1,2,3]" />
                </div>

                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Meme Image (Optional)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setAqImgName(file.name);
                      const reader = new FileReader();
                      reader.onloadend = () => setAqImg(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Attach Container Items</label>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {['+10', '+20', '-10', '-20'].map(item => {
                      const isChecked = aqItems.includes(item);
                      return (
                        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', border: isChecked ? '1px solid var(--pitch-accent)' : '1px solid var(--glass-border)' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAqItems([...aqItems, item]);
                              } else {
                                setAqItems(aqItems.filter(x => x !== item));
                              }
                            }}
                          />
                          <span style={{ color: item.startsWith('+') ? 'var(--pitch-accent)' : 'var(--red-card)', fontWeight: 'bold' }}>{item} tokens</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Image Position</label>
                  <select className="text-input" style={{ padding: '10px', background: 'var(--input-bg)', color: 'white' }} value={aqAlign} onChange={(e) => setAqAlign(e.target.value)}>
                    <option value="TOP">Top</option>
                    <option value="BOTTOM">Bottom</option>
                    <option value="LEFT">Left</option>
                    <option value="RIGHT">Right</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddAuctionQuestion(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Question</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD/EDIT OPEN MCQ QUESTION */}
        {showAddOpenQuestion && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '95vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px' }}>
                {editingOqId ? 'Edit MCQ Open Question' : 'Add MCQ Open Question'}
              </h3>
              <form onSubmit={saveOpenQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Question Text</label>
                  <textarea className="text-input" style={{ minHeight: '60px', padding: '10px' }} value={oqText} onChange={(e) => setOqText(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Option A</label>
                    <input type="text" className="text-input" style={{ padding: '8px' }} value={oqA} onChange={(e) => setOqA(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Option B</label>
                    <input type="text" className="text-input" style={{ padding: '8px' }} value={oqB} onChange={(e) => setOqB(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Option C</label>
                    <input type="text" className="text-input" style={{ padding: '8px' }} value={oqC} onChange={(e) => setOqC(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Option D</label>
                    <input type="text" className="text-input" style={{ padding: '8px' }} value={oqD} onChange={(e) => setOqD(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Correct Option</label>
                  <select className="text-input" style={{ padding: '10px', background: 'var(--input-bg)', color: 'white' }} value={oqCorrect} onChange={(e) => setOqCorrect(e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddOpenQuestion(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save MCQ</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  };

  if (roomId === 'auction') {
    return renderAuctionMode();
  }

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
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-primary" onClick={() => revealResultsStyle('VAR')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #00b0ff 0%, #00e676 100%)', color: '#07170f', border: 'none' }}>
                        <Play size={16} /> Reveal via VAR 🖥️
                      </button>
                      <button className="btn-primary" onClick={() => revealResultsStyle('PENALTY')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #ff9100 0%, #ff3d00 100%)', color: 'white', border: 'none' }}>
                        <Play size={16} /> Reveal via Penalty ⚡
                      </button>
                    </div>
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
                    <button className="btn-danger" onClick={() => { if (confirm("Are you sure you want to cancel the round?")) { socket.emit('admin-cancel-round', { roomId }); } }} style={{ padding: '6px 12px', fontSize: '12px' }}>
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
            {[...standings].sort((a, b) => b.fanTokens - a.fanTokens).map((p) => {
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
