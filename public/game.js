// 게임 상태 관리
class Game {
    constructor() {
        this.socket = null;
        this.gameState = 'menu'; // menu, waiting, playing
        this.players = [];
        this.projectiles = [];
        this.myPlayerId = null;
        this.selectedCharacter = null;
        
        // 캐릭터 색상
        this.characterColors = {
            tanjiro: '#FF4444',
            zenitsu: '#FFFF00', 
            akaza: '#FF0000',
            doma: '#F5F5DC'
        };
    }

    // 소켓 연결
    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('서버 연결됨');
            addLog('서버에 연결되었습니다.');
        });

        this.socket.on('disconnect', () => {
            console.log('서버 연결 해제');
            addLog('서버와의 연결이 끊어졌습니다.');
        });

        this.socket.on('waitingForMatch', () => {
            this.gameState = 'waiting';
            showScreen('waitingScreen');
            addLog('상대방을 기다리는 중...');
        });

        this.socket.on('gameStart', (data) => {
            this.gameState = 'playing';
            this.players = data.players;
            
            // 내 플레이어 ID 찾기 (첫번째가 나)
            this.myPlayerId = this.players[0].id;
            
            showScreen('gameScreen');
            addLog('게임 시작!');
            addLog(`플레이어들: ${this.players.map(p => p.name).join(' vs ')}`);
            
            // 게임 루프 시작
            this.startGameLoop();
        });

        this.socket.on('gameState', (data) => {
            this.players = data.players;
            this.projectiles = data.projectiles;
            updatePlayersInfo(this.players);
        });

        this.socket.on('playerDamaged', (data) => {
            addLog(`플레이어가 ${data.damage} 피해를 받음! (${data.hp}/${data.maxHp})`);
        });

        this.socket.on('gameEnd', (data) => {
            this.gameState = 'ended';
            addLog(`게임 종료! 플레이어 ${data.winnerId} 승리!`);
        });
    }

    // 매치 찾기
    findMatch() {
        if (!this.selectedCharacter) {
            addLog('캐릭터를 선택해주세요!');
            return;
        }
        
        const playerData = {
            name: this.selectedCharacter,
            charType: this.selectedCharacter
        };
        
        this.socket.emit('findMatch', playerData);
        addLog('매치를 찾는 중...');
    }

    // 플레이어 이동
    movePlayer(direction) {
        if (this.gameState !== 'playing') return;
        this.socket.emit('playerMove', direction);
    }

    // 플레이어 공격
    attackPlayer() {
        if (this.gameState !== 'playing') return;
        this.socket.emit('playerAttack');
    }

    // 게임 루프 시작
    startGameLoop() {
        const gameLoop = () => {
            if (this.gameState !== 'playing') return;
            
            render(this.players, this.projectiles, this.myPlayerId, this.characterColors);
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }

    // 캐릭터 선택
    selectCharacter(charType) {
        this.selectedCharacter = charType;
        addLog(`${charType} 선택됨`);
    }
}

// 전역 게임 인스턴스
const game = new Game();
