// 렌더링 관련 함수들
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 메인 렌더링 함수
function render(players, projectiles, myPlayerId, characterColors) {
    // 배경 클리어
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 플레이어들 그리기
    players.forEach(player => {
        drawPlayer(player, myPlayerId, characterColors);
    });
    
    // 투사체들 그리기
    projectiles.forEach(projectile => {
        drawProjectile(projectile);
    });
    
    // 디버그 정보
    drawDebugInfo(players.length);
}

// 플레이어 그리기
function drawPlayer(player, myPlayerId, characterColors) {
    const color = characterColors[player.charType] || '#FFFFFF';
    const isMe = player.id === myPlayerId;
    const radius = 15;
    
    // 플레이어 원
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 테두리 (내 캐릭터는 굵게)
    ctx.strokeStyle = isMe ? '#FFFFFF' : '#000000';
    ctx.lineWidth = isMe ? 3 : 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 방향 표시
    drawDirection(player.x, player.y, player.direction);
    
    // 이름
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(player.name, player.x, player.y - 25);
    ctx.fillText(player.name, player.x, player.y - 25);
    
    // 체력
    ctx.font = '10px Arial';
    const hpText = `${player.hp}/${player.maxHp}`;
    ctx.strokeText(hpText, player.x, player.y + 35);
    ctx.fillText(hpText, player.x, player.y + 35);
    
    // 체력바
    drawHealthBar(player.x, player.y - 35, player.hp, player.maxHp);
}

// 방향 표시
function drawDirection(x, y, direction) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    let endX = x, endY = y;
    const length = 20;
    
    switch(direction) {
        case 'up': endY -= length; break;
        case 'down': endY += length; break;
        case 'left': endX -= length; break;
        case 'right': endX += length; break;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // 화살표 끝
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fill();
}

// 체력바 그리기
function drawHealthBar(x, y, hp, maxHp) {
    const barWidth = 30;
    const barHeight = 4;
    const hpPercent = hp / maxHp;
    
    // 배경
    ctx.fillStyle = '#333333';
    ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
    
    // 체력
    ctx.fillStyle = hpPercent > 0.5 ? '#00FF00' : hpPercent > 0.2 ? '#FFAA00' : '#FF0000';
    ctx.fillRect(x - barWidth/2, y, barWidth * hpPercent, barHeight);
    
    // 테두리
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barWidth/2, y, barWidth, barHeight);
}

// 투사체 그리기
function drawProjectile(projectile) {
    ctx.fillStyle = '#FFFF00';
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// 디버그 정보
function drawDebugInfo(playerCount) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`플레이어: ${playerCount}`, 10, 20);
    ctx.fillText(`FPS: ${Math.round(1000/16)}`, 10, 35);
}
