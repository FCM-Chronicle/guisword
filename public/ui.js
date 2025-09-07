// UI 관리
function setupUI() {
    // 캐릭터 선택 버튼들
    document.querySelectorAll('.character-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const charType = btn.dataset.char;
            game.selectCharacter(charType);
            
            // 선택 표시
            document.querySelectorAll('.character-btn').forEach(b => {
                b.classList.remove('selected');
            });
            btn.classList.add('selected');
            
            document.getElementById('findMatchBtn').disabled = false;
        });
    });

    // 매치 찾기 버튼
    document.getElementById('findMatchBtn').addEventListener('click', () => {
        game.findMatch();
    });
}

// 화면 전환
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// 플레이어 정보 업데이트
function updatePlayersInfo(players) {
    const playersInfo = document.getElementById('playersInfo');
    if (playersInfo && players) {
        playersInfo.innerHTML = players.map(p => 
            `<div>
                <strong>${p.name}</strong><br>
                체력: ${p.hp}/${p.maxHp}<br>
                위치: (${Math.round(p.x)}, ${Math.round(p.y)})<br>
                방향: ${p.direction}
            </div>`
        ).join('');
    }
}

// 로그 추가
function addLog(message) {
    const log = document.getElementById('gameLog');
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    
    // 로그가 너무 많으면 오래된 것 제거
    if (log.children.length > 50) {
        log.removeChild(log.firstChild);
    }
}
