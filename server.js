const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 정적 파일 제공
app.use(express.static('public'));

// 게임 룸 클래스
class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.projectiles = [];
    this.gameState = 'waiting';
  }

  addPlayer(socket, playerData) {
    if (this.players.size >= 2) return false;
    
    const playerId = this.players.size + 1;
    
    const newPlayer = {
      id: playerId,
      socket: socket,
      name: playerData.name,
      charType: playerData.charType,
      x: playerId === 1 ? 100 : 700,
      y: 300,
      direction: 'right', // up, down, left, right
      hp: 100,
      maxHp: 100
    };
    
    this.players.set(socket.id, newPlayer);
    console.log(`플레이어 ${playerId} 추가: ${newPlayer.name}`);

    socket.join(this.id);
    
    if (this.players.size === 2) {
      this.startGame();
    }

    return true;
  }

  startGame() {
    this.gameState = 'playing';
    console.log('게임 시작!');
    
    const playersArray = Array.from(this.players.values());
    io.to(this.id).emit('gameStart', {
      players: playersArray.map(p => ({
        id: p.id,
        name: p.name,
        charType: p.charType,
        x: p.x,
        y: p.y,
        direction: p.direction,
        hp: p.hp,
        maxHp: p.maxHp
      }))
    });

    // 게임 루프 시작
    this.gameLoop = setInterval(() => {
      this.update();
    }, 16); // 60fps
  }

  update() {
    if (this.gameState !== 'playing') return;

    // 투사체 업데이트
    this.projectiles = this.projectiles.filter(proj => {
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.life--;
      
      // 화면 밖으로 나가거나 수명이 다하면 제거
      return proj.life > 0 && proj.x > 0 && proj.x < 800 && proj.y > 0 && proj.y < 600;
    });

    // 게임 상태 전송
    this.broadcastGameState();
  }

  handlePlayerMove(socketId, direction) {
    const player = this.players.get(socketId);
    if (!player || this.gameState !== 'playing') return;

    const speed = 5;
    let newX = player.x;
    let newY = player.y;

    // 방향에 따른 이동
    switch(direction) {
      case 'up':
        newY -= speed;
        break;
      case 'down':
        newY += speed;
        break;
      case 'left':
        newX -= speed;
        break;
      case 'right':
        newX += speed;
        break;
    }

    // 경계 체크
    if (newX >= 20 && newX <= 780) player.x = newX;
    if (newY >= 20 && newY <= 580) player.y = newY;
    
    // 바라보는 방향 업데이트
    player.direction = direction;
    
    console.log(`플레이어 ${player.id} 이동: ${direction} -> (${player.x}, ${player.y})`);
  }

  handlePlayerAttack(socketId) {
    const player = this.players.get(socketId);
    if (!player || this.gameState !== 'playing') return;

    // 방향에 따른 투사체 속도
    let vx = 0, vy = 0;
    const speed = 8;

    switch(player.direction) {
      case 'up': vy = -speed; break;
      case 'down': vy = speed; break;
      case 'left': vx = -speed; break;
      case 'right': vx = speed; break;
    }

    // 투사체 생성
    const projectile = {
      id: Date.now() + Math.random(),
      ownerId: player.id,
      x: player.x,
      y: player.y,
      vx: vx,
      vy: vy,
      life: 120, // 2초
      damage: 20
    };

    this.projectiles.push(projectile);
    console.log(`플레이어 ${player.id} 공격! 방향: ${player.direction}`);
  }

  broadcastGameState() {
    const gameState = {
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        charType: p.charType,
        x: p.x,
        y: p.y,
        direction: p.direction,
        hp: p.hp,
        maxHp: p.maxHp
      })),
      projectiles: this.projectiles
    };

    io.to(this.id).emit('gameState', gameState);
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      this.players.delete(socketId);
      console.log(`플레이어 ${player.id} 제거`);
      
      if (this.gameLoop) {
        clearInterval(this.gameLoop);
      }
      
      return this.players.size === 0; // 룸이 비었으면 true 반환
    }
    return false;
  }
}

// 룸 관리
const rooms = new Map();
const waitingPlayers = [];

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log(`플레이어 연결: ${socket.id}`);

  socket.on('findMatch', (playerData) => {
    console.log(`매치 찾기: ${playerData.name}`);
    
    if (waitingPlayers.length > 0) {
      // 대기 중인 플레이어와 매치
      const opponent = waitingPlayers.shift();
      
      const roomId = `room_${Date.now()}`;
      const room = new GameRoom(roomId);
      rooms.set(roomId, room);
      
      room.addPlayer(opponent.socket, opponent.playerData);
      room.addPlayer(socket, playerData);
      
      console.log(`매치 성사: ${roomId}`);
    } else {
      // 대기열에 추가
      waitingPlayers.push({ socket, playerData });
      socket.emit('waitingForMatch');
      console.log(`대기열 추가: ${playerData.name}`);
    }
  });

  socket.on('playerMove', (direction) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if (room) {
      room.handlePlayerMove(socket.id, direction);
    }
  });

  socket.on('playerAttack', () => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if (room) {
      room.handlePlayerAttack(socket.id);
    }
  });

  socket.on('disconnect', () => {
    console.log(`플레이어 연결 해제: ${socket.id}`);
    
    // 대기열에서 제거
    const waitingIndex = waitingPlayers.findIndex(p => p.socket.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }
    
    // 룸에서 제거
    for (let [roomId, room] of rooms) {
      if (room.removePlayer(socket.id)) {
        rooms.delete(roomId);
        console.log(`룸 삭제: ${roomId}`);
        break;
      }
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
