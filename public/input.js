// 입력 처리
class InputManager {
    constructor() {
        this.keys = {};
        this.lastDirection = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        if (game.gameState !== 'playing') return;
        
        this.keys[e.code] = true;
        
        // 이동 키 처리
        let direction = null;
        if (e.code === 'KeyW') direction = 'up';
        else if (e.code === 'KeyS') direction = 'down';
        else if (e.code === 'KeyA') direction = 'left';
        else if (e.code === 'KeyD') direction = 'right';
        
        if (direction && direction !== this.lastDirection) {
            game.movePlayer(direction);
            this.lastDirection = direction;
        }
        
        // 공격 키
        if (e.code === 'Space') {
            e.preventDefault();
            game.attackPlayer();
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
        
        // 모든 이동 키가 떼어졌는지 확인
        if (!this.keys['KeyW'] && !this.keys['KeyS'] && 
            !this.keys['KeyA'] && !this.keys['KeyD']) {
            this.lastDirection = null;
        }
    }
}

// 전역 입력 매니저 인스턴스
const inputManager = new InputManager();
