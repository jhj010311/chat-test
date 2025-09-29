import { useState, useEffect, useRef } from 'react';

const ChatRoom = ({ user, room, stompClient, onLeaveRoom }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [participants, setParticipants] = useState([]);
    const messagesEndRef = useRef(null);

    // 메시지 자동 스크롤
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 채팅방 메시지 및 참여자 정보 구독
    useEffect(() => {
        if (!stompClient || !stompClient.connected) return;

        // 채팅 메시지 구독
        const messageSubscription = stompClient.subscribe(`/topic/${room.id}`, (message) => {
            const chatMessage = JSON.parse(message.body);
            setMessages(prev => [...prev, {
                ...chatMessage,
                timestamp: new Date(chatMessage.timestamp)
            }]);
        });

        // 참여자 정보 구독
        const participantSubscription = stompClient.subscribe(`/topic/${room.id}/participants`, (message) => {
            const participantList = JSON.parse(message.body);
            setParticipants(participantList);
        });

        // 시스템 메시지 구독 (참여/퇴장 알림)
        const systemSubscription = stompClient.subscribe(`/topic/${room.id}/system`, (message) => {
            const systemMessage = JSON.parse(message.body);
            setMessages(prev => [...prev, {
                ...systemMessage,
                isSystem: true,
                timestamp: new Date()
            }]);
        });

        // 입장 알림 전송
        stompClient.send('/app/chat.join', {}, JSON.stringify({
            roomId: room.id,
            sender: user.nickname,
            userId: user.id
        }));

        return () => {
            // 퇴장 알림 전송
            if (stompClient.connected) {
                stompClient.send('/app/chat.leave', {}, JSON.stringify({
                    roomId: room.id,
                    sender: user.nickname,
                    userId: user.id
                }));
            }

            messageSubscription?.unsubscribe();
            participantSubscription?.unsubscribe();
            systemSubscription?.unsubscribe();
        };
    }, [stompClient, room.id, user]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !stompClient) return;

        stompClient.send('/app/chat.sendMessage', {}, JSON.stringify({
            roomId: room.id,
            sender: user.nickname,
            message: newMessage.trim(),
            userId: user.id
        }));

        setNewMessage('');
    };

    const handleLeaveRoom = () => {
        if (stompClient && stompClient.connected) {
            stompClient.send('/app/chat.leave', {}, JSON.stringify({
                roomId: room.id,
                sender: user.nickname,
                userId: user.id
            }));
        }
        onLeaveRoom();
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={{
            display: 'flex',
            height: '70vh',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: 'white'
        }}>
            {/* 채팅 영역 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* 헤더 */}
                <div style={{
                    padding: '15px',
                    borderBottom: '1px solid #eee',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0 }}>{room.name}</h3>
                    <button
                        onClick={handleLeaveRoom}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        나가기
                    </button>
                </div>

                {/* 메시지 영역 */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                flexDirection: msg.isSystem ? 'row' : (msg.sender === user.nickname ? 'row-reverse' : 'row'),
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}
                        >
                            {msg.isSystem ? (
                                <div style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    padding: '8px',
                                    backgroundColor: '#e9ecef',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: '#666'
                                }}>
                                    {msg.message}
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        maxWidth: '70%',
                                        padding: '10px 15px',
                                        borderRadius: '18px',
                                        backgroundColor: msg.sender === user.nickname ? '#007bff' : '#e9ecef',
                                        color: msg.sender === user.nickname ? 'white' : 'black'
                                    }}>
                                        {msg.sender !== user.nickname && (
                                            <div style={{
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                marginBottom: '4px',
                                                opacity: 0.8
                                            }}>
                                                {msg.sender}
                                            </div>
                                        )}
                                        <div>{msg.message}</div>
                                        <div style={{
                                            fontSize: '11px',
                                            opacity: 0.7,
                                            textAlign: msg.sender === user.nickname ? 'right' : 'left',
                                            marginTop: '4px'
                                        }}>
                                            {formatTime(msg.timestamp)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* 메시지 입력 영역 */}
                <div style={{
                    padding: '15px',
                    borderTop: '1px solid #eee'
                }}>
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="메시지를 입력하세요..."
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '20px',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer'
                            }}
                        >
                            전송
                        </button>
                    </form>
                </div>
            </div>

            {/* 참여자 목록 */}
            <div style={{
                width: '250px',
                borderLeft: '1px solid #eee',
                backgroundColor: '#f8f9fa'
            }}>
                <div style={{
                    padding: '15px',
                    borderBottom: '1px solid #eee',
                    fontWeight: 'bold'
                }}>
                    참여자 ({participants.length})
                </div>
                <div style={{ padding: '10px' }}>
                    {participants.map((participant, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '8px 12px',
                                margin: '5px 0',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #ddd'
                            }}
                        >
                            {participant.nickname}
                            {participant.userId === user.id && <span style={{ color: '#007bff' }}> (나)</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;