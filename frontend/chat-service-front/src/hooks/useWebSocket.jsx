import { useState, useCallback, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const stompClientRef = useRef(null);

    const connect = useCallback(() => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            return; // 이미 연결됨
        }

        // STOMP 클라이언트 생성
        const client = new Client({
            // SockJS를 WebSocket 팩토리로 사용
            webSocketFactory: () => new SockJS('http://localhost:8080/ws-chat'),

            // 연결 성공 시 콜백
            onConnect: (frame) => {
                console.log('Connected: ' + frame);
                setIsConnected(true);
            },

            // 연결 오류 시 콜백
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
                setIsConnected(false);
            },

            // WebSocket 오류 시 콜백
            onWebSocketError: (error) => {
                console.error('WebSocket error: ', error);
                setIsConnected(false);
            },

            // 연결 끊김 시 콜백
            onDisconnect: () => {
                console.log('Disconnected');
                setIsConnected(false);
            },

            // 자동 재연결 설정
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        // 연결 시작
        client.activate();
        stompClientRef.current = client;
    }, []);

    const disconnect = useCallback(() => {
        if (stompClientRef.current) {
            stompClientRef.current.deactivate();
            console.log('Disconnected');
            setIsConnected(false);
            stompClientRef.current = null;
        }
    }, []);

    const sendMessage = useCallback((destination, message) => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.publish({
                destination: destination,
                body: JSON.stringify(message)
            });
        }
    }, []);

    const subscribe = useCallback((destination, callback) => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            return stompClientRef.current.subscribe(destination, callback);
        }
    }, []);

    return {
        stompClient: stompClientRef.current,
        isConnected,
        connect,
        disconnect,
        sendMessage,
        subscribe
    };
};