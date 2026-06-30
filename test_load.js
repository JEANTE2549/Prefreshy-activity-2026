import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';
const PLAYER_COUNT = 27;
const clients = [];

console.log(`Starting load simulation for ${PLAYER_COUNT} players...`);

// Helper to generate a random ID
const randomId = (prefix) => prefix + '-' + Math.random().toString(36).substring(2, 9);

async function startSimulation() {
  const promises = [];

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    promises.push(new Promise((resolve) => {
      const socket = io(SERVER_URL, {
        forceNew: true,
        transports: ['websocket']
      });

      const playerId = randomId(`p-sim-${i}`);
      const playerName = `PlayerSim_${i}`;

      socket.on('connect', () => {
        // Register player
        socket.emit('join-game', { id: playerId, name: playerName }, (res) => {
          if (res.success) {
            console.log(`[Joined] ${playerName} (Tokens: ${res.player.fanTokens})`);
            
            // Listen for active questions and submit automatically
            socket.on('state-sync', (state) => {
              if (state.gameState === 'ACTIVE_QUESTION') {
                const answer = Math.random() > 0.5 ? 'YES' : 'NO';
                const prediction = Math.random() > 0.5 ? 'HI' : 'LOW';
                const bets = [10, 20, 50];
                const betAmount = bets[Math.floor(Math.random() * bets.length)];

                console.log(`[Submitting] ${playerName} wagers ${betAmount} on prediction ${prediction} for answer ${answer}`);
                
                // Add a small staggered delay to simulate realistic player input pacing
                setTimeout(() => {
                  socket.emit('submit-prediction', {
                    playerId,
                    answer,
                    prediction,
                    betAmount
                  }, (submitRes) => {
                    if (submitRes.success) {
                      console.log(`[Success] ${playerName} wager locked!`);
                    } else {
                      console.error(`[Failed] ${playerName} bet error:`, submitRes.error);
                    }
                  });
                }, Math.random() * 2000);
              }
            });

            clients.push({ socket, id: playerId, name: playerName });
            resolve();
          } else {
            console.error(`[Error] ${playerName} join failed:`, res.error);
            socket.disconnect();
            resolve();
          }
        });
      });

      socket.on('connect_error', (err) => {
        console.error(`[Conn Error] Player ${i} failed to connect:`, err.message);
        resolve();
      });
    }));
  }

  await Promise.all(promises);
  console.log(`\nAll ${clients.length} simulated players connected and ready on pitch.`);
  console.log('Open Organizer Panel at http://localhost:3000/#/organizer and open a question to watch them bet!');
}

startSimulation().catch(console.error);

// Keep script alive to listen for events
process.on('SIGINT', () => {
  console.log('Disconnecting players...');
  clients.forEach(c => c.socket.disconnect());
  process.exit(0);
});
