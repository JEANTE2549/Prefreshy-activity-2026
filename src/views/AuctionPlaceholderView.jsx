import React from 'react';
import { ArrowLeft, Play, Settings, ShieldAlert, Award, Gavel } from 'lucide-react';

function AuctionPlaceholderView({ roomId, roomName, onBackToHub }) {
  return (
    <div className="app-container" style={{ maxWidth: '1000px', padding: '40px 20px', minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center', background: 'rgba(20, 25, 45, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid #f59e0b',
          color: '#f59e0b',
          marginBottom: '25px',
          animation: 'pulse-glow 2s infinite'
        }}>
          <Gavel size={40} />
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: '950', marginBottom: '10px', color: '#fff' }}>
          Python Auction Room
        </h1>
        
        <span style={{ fontSize: '12px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', display: 'inline-block', marginBottom: '25px' }}>
          Game Workspace: {roomName} (PIN: 1127)
        </span>

        <p style={{ color: '#a0aec0', fontSize: '15px', maxWidth: '550px', margin: '0 auto 35px auto', lineHeight: '1.6' }}>
          This game workspace will be unlocked during the final live session. The python auction mechanics will consume player standings and Fan Tokens accumulated from the Prediction challenge.
        </p>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn-secondary" 
            onClick={onBackToHub}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '14px' }}
          >
            <ArrowLeft size={16} /> Return to Hub
          </button>
          
          <button 
            className="btn-primary" 
            disabled 
            style={{
              padding: '12px 24px', 
              fontSize: '14px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: 'rgba(255,255,255,0.3)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              cursor: 'not-allowed',
              boxShadow: 'none'
            }}
          >
            Launch Auction (Coming Soon)
          </button>
        </div>

      </div>

    </div>
  );
}

export default AuctionPlaceholderView;
