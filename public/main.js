// 메인 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('게임 초기화 시작');
    
    // UI 설정
    setupUI();
    
    // 게임 연결
    game.connectSocket();
    
    // 환영 메시지
    addLog('귀멸의 칼날 PvP 게임에 오신 것을 환영합니다!');
    addLog('캐릭터를 선택하고 매치를 시작하세요.');
    
    console.log('게임 초기화 완료');
});
