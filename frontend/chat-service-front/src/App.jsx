import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import RoomList from './components/RoomList';
import ChatRoom from './components/ChatRoom';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);

  // 웹소켓 연결 관리
  const { stompClient, isConnected, connect, disconnect } = useWebSocket();

  // 로그인 상태 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 로그인 시 웹소켓 연결
  useEffect(() => {
    if (user && !isConnected) {
      connect();
    } else if (!user && isConnected) {
      disconnect();
      setCurrentRoom(null);
    }
  }, [user, isConnected, connect, disconnect]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setCurrentRoom(null);
  };

  const handleJoinRoom = (room) => {
    setCurrentRoom(room);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
      <Router>
        <div className="App">
          <header style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>공동구매 채팅</h1>
              {user && (
                  <div>
                    <span>환영합니다, {user.nickname}님!</span>
                    <button onClick={handleLogout} style={{ marginLeft: '10px' }}>로그아웃</button>
                  </div>
              )}
            </div>
          </header>

          <main style={{ padding: '20px' }}>
            <Routes>
              <Route
                  path="/login"
                  element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/rooms" />}
              />
              <Route
                  path="/rooms"
                  element={
                    user && !currentRoom ?
                        <RoomList
                            user={user}
                            stompClient={stompClient}
                            onJoinRoom={handleJoinRoom}
                        /> :
                        currentRoom ? <Navigate to={`/chat/${currentRoom.id}`} /> :
                            <Navigate to="/login" />
                  }
              />
              <Route
                  path="/chat/:roomId"
                  element={
                    user && currentRoom ?
                        <ChatRoom
                            user={user}
                            room={currentRoom}
                            stompClient={stompClient}
                            onLeaveRoom={handleLeaveRoom}
                        /> :
                        <Navigate to="/rooms" />
                  }
              />
              <Route path="/" element={<Navigate to={user ? "/rooms" : "/login"} />} />
            </Routes>
          </main>
        </div>
      </Router>
  );
}

export default App;