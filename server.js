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

  handlePlayerSkill(socketId, skillType) {
    const player = this.players.get(socketId);
    if (!player || this.gameState !== 'playing') return;

    // 쿨다운 체크
    if (player.cooldowns[skillType] > 0) {
      console.log(`플레이어 ${player.id} 스킬 ${skillType} 쿨다운 중`);
      return;
    }

    // 캐릭터별 스킬 데이터
    const skills = this.getCharacterSkills(player.charType);
    const skill = skills[skillType];
    
    if (!skill) return;

    // 쿨다운 설정
    player.cooldowns[skillType] = skill.cooldown;

    // 스킬 실행
    this.executeSkill(player, skill, skillType);
    
    console.log(`플레이어 ${player.id}가 ${skill.name} 사용!`);
  }

  getCharacterSkills(charType) {
    const skillData = {
      tanjiro: {
        skill1: { name: '물방아', damage: 40, cooldown: 8000, type: 'dash' },
        skill2: { name: '비틀린 소용돌이', damage: 30, cooldown: 6000, type: 'projectile' },
        ultimate: { name: '해의 호흡 13형', damage: 80, cooldown: 60000, type: 'multi-hit' }
      },
      zenitsu: {
        skill1: { name: '벽력일섬 육연', damage: 25, cooldown: 12000, type: 'multi-dash' },
        skill2: { name: '벽력일섬 신속', damage: 60, cooldown: 15000, type: 'dash' },
        ultimate: { name: '화뢰신', damage: 100, cooldown: 60000, type: 'dash' }
      },
      akaza: {
        skill1: { name: '파괴살 공식', damage: 35, cooldown: 7000, type: 'projectile' },
        skill2: { name: '파괴살 난식', damage: 50, cooldown: 10000, type: 'area' },
        ultimate: { name: '파괴살 멸식', damage: 120, cooldown: 70000, type: 'explosion' }
      },
      doma: {
        skill1: { name: '흩날리는 연꽃', damage: 30, cooldown: 8000, type: 'cone' },
        skill2: { name: '겨울철 고드름', damage: 45, cooldown: 12000, type: 'targeted' },
        ultimate: { name: '혹한의 겨울 여신', damage: 25, cooldown: 60000, type: 'area-persistent' }
      }
    };
    
    return skillData[charType] || {};
  }

  executeSkill(player, skill, skillType) {
    switch(skill.type) {
      case 'projectile':
        this.createSkillProjectile(player, skill, 1);
        break;
      case 'multi-hit':
        this.createSkillProjectile(player, skill, 3);
        break;
      case 'dash':
        this.createDashAttack(player, skill);
        break;
      case 'multi-dash':
        this.createSkillProjectile(player, skill, 6);
        break;
      case 'area':
        this.createAreaAttack(player, skill);
        break;
      case 'cone':
        this.createConeAttack(player, skill);
        break;
      case 'targeted':
        this.createTargetedAttack(player, skill);
        break;
      case 'explosion':
        this.createExplosionAttack(player, skill);
        break;
    }
  }

  createSkillProjectile(player, skill, count) {
    let vx = 0, vy = 0;
    const speed = 10;

    switch(player.direction) {
      case 'up': vy = -speed; break;
      case 'down': vy = speed; break;
      case 'left': vx = -speed; break;
      case 'right': vx = speed; break;
    }

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const projectile = {
          id: Date.now() + Math.random(),
          ownerId: player.id,
          x: player.x,
          y: player.y,
          vx: vx,
          vy: vy,
          life: 180,
          damage: skill.damage,
          type: 'skill'
        };
        this.projectiles.push(projectile);
      }, i * 200);
    }
  }

  createDashAttack(player, skill) {
    // 대시 공격 (즉시 피해)
    const dashDistance = 100;
    let targetX = player.x, targetY = player.y;
    
    switch(player.direction) {
      case 'up': targetY -= dashDistance; break;
      case 'down': targetY += dashDistance; break;
      case 'left': targetX -= dashDistance; break;
      case 'right': targetX += dashDistance; break;
    }
    
    // 대시 경로상의 적에게 피해
    const players = Array.from(this.players.values());
    for (let otherPlayer of players) {
      if (otherPlayer.id !== player.id) {
        const distance = Math.hypot(otherPlayer.x - player.x, otherPlayer.y - player.y);
        if (distance < dashDistance) {
          this.damagePlayer(otherPlayer, skill.damage, player.id);
        }
      }
    }
  }

  createAreaAttack(player, skill) {
    // 주변 지역 공격
    const players = Array.from(this.players.values());
    for (let otherPlayer of players) {
      if (otherPlayer.id !== player.id) {
        const distance = Math.hypot(otherPlayer.x - player.x, otherPlayer.y - player.y);
        if (distance < 80) {
          this.damagePlayer(otherPlayer, skill.damage, player.id);
        }
      }
    }
  }

  createConeAttack(player, skill) {
    // 부채꼴 공격 (3개의 투사체)
    const angles = [-0.3, 0, 0.3];
    const speed = 12;
    
    angles.forEach((angleOffset, index) => {
      setTimeout(() => {
        let vx = 0, vy = 0;
        
        switch(player.direction) {
          case 'up': 
            vx = Math.sin(angleOffset) * speed;
            vy = -Math.cos(angleOffset) * speed;
            break;
          case 'down':
            vx = -Math.sin(angleOffset) * speed;
            vy = Math.cos(angleOffset) * speed;
            break;
          case 'left':
            vx = -Math.cos(angleOffset) * speed;
            vy = Math.sin(angleOffset) * speed;
            break;
          case 'right':
            vx = Math.cos(angleOffset) * speed;
            vy = -Math.sin(angleOffset) * speed;
            break;
        }
        
        const projectile = {
          id: Date.now() + Math.random(),
          ownerId: player.id,
          x: player.x,
          y: player.y,
          vx: vx,
          vy: vy,
          life: 120,
          damage: skill.damage,
          type: 'skill'
        };
        this.projectiles.push(projectile);
      }, index * 100);
    });
  }

  createTargetedAttack(player, skill) {
    // 상대방 위치에 공격
    const players = Array.from(this.players.values());
    const target = players.find(p => p.id !== player.id);
    
    if (target) {
      setTimeout(() => {
        const distance = Math.hypot(target.x - player.x, target.y - player.y);
        if (distance < 300) { // 사거리 내에 있으면
          this.damagePlayer(target, skill.damage, player.id);
        }
      }, 1500); // 1.5초 후 공격
    }
  }

  createExplosionAttack(player, skill) {
    // 폭발 공격 (넓은 범위)
    const players = Array.from(this.players.values());
    for (let otherPlayer of players) {
      if (otherPlayer.id !== player.id) {
        const distance = Math.hypot(otherPlayer.x - player.x, otherPlayer.y - player.y);
        if (distance < 150) {
          this.damagePlayer(otherPlayer, skill.damage, player.id);
        }
      }
    }
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
