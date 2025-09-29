import { useState, useCallback, useRef } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const stompClientRef = useRef(null);

    const connect = useCallback(() => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            return; // 이미 연결됨
        }

        const socket = new SockJS('http://localhost:8080/ws-chat');
        const client = Stomp.over(socket);

        // 연결 설정
        client.connect({},
            (frame) => {
                console.log('Connected: ' + frame);
                setIsConnected(true);
            },
            (error) => {
                console.error('Connection error: ', error);
                setIsConnected(false);
            }
        );

        stompClientRef.current = client;
    }, []);

    const disconnect = useCallback(() => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.disconnect(() => {
                console.log('Disconnected');
                setIsConnected(false);
            });
        }
        stompClientRef.current = null;
    }, []);

    const sendMessage = useCallback((destination, message) => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.send(destination, {}, JSON.stringify(message));
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