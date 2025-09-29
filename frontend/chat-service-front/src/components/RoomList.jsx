import { useState, useEffect } from 'react';

const RoomList = ({ user, stompClient, onJoinRoom }) => {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // 채팅방 목록 실시간 수신
    useEffect(() => {
        if (!stompClient || !stompClient.connected) return;

        // 채팅방 목록 구독
        const subscription = stompClient.subscribe('/topic/rooms', (message) => {
            const roomList = JSON.parse(message.body);
            setRooms(roomList);
        });

        // 초기 채팅방 목록 요청
        stompClient.send('/app/rooms.list', {}, JSON.stringify({
            userId: user.id
        }));

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [stompClient, user.id]);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!newRoomName.trim() || !stompClient) return;

        setIsCreating(true);
        stompClient.send('/app/rooms.create', {}, JSON.stringify({
            roomName: newRoomName.trim(),
            createdBy: user.nickname,
            userId: user.id
        }));

        setNewRoomName('');
        setIsCreating(false);
    };

    const handleJoinRoom = (room) => {
        if (!stompClient) return;

        // 채팅방 참가 알림
        stompClient.send('/app/rooms.join', {}, JSON.stringify({
            roomId: room.id,
            userId: user.id,
            nickname: user.nickname
        }));

        onJoinRoom(room);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2>채팅방 목록</h2>

            {/* 새 채팅방 생성 */}
            <div style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '20px',
                backgroundColor: '#f8f9fa'
            }}>
                <h3>새 채팅방 만들기</h3>
                <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="채팅방 이름을 입력하세요"
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                        required
                    />
                    <button
                        type="submit"
                        disabled={isCreating}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isCreating ? '생성 중...' : '생성'}
                    </button>
                </form>
            </div>

            {/* 채팅방 목록 */}
            <div>
                <h3>참여 가능한 채팅방</h3>
                {rooms.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                        생성된 채팅방이 없습니다.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                style={{
                                    padding: '15px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    backgroundColor: 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: '0 0 5px 0' }}>{room.name}</h4>
                                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                                        생성자: {room.createdBy} | 참여자: {room.participantCount || 0}명
                                    </p>
                                    {room.createdAt && (
                                        <p style={{ margin: '5px 0 0 0', color: '#999', fontSize: '12px' }}>
                                            생성일: {new Date(room.createdAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleJoinRoom(room)}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    참여하기
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomList;