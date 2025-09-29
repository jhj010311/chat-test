package com.sesac.chatservicegpt;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomService chatRoomService;

    // 기존 채팅 메시지 전송
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(Map<String, Object> payload) {
        String roomId = payload.get("roomId").toString();
        String sender = payload.get("sender").toString();
        String message = payload.get("message").toString();

        // DB 저장
        ChatMessage saved = chatMessageRepository.save(ChatMessage.builder()
                .roomId(roomId)
                .sender(sender)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build());

        // 구독자에게 브로드캐스트
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/messages", saved);

        // 채팅방 목록 화면에 알림 전송
        messagingTemplate.convertAndSend("/topic/rooms/notifications", Map.of(
                "roomId", roomId,
                "lastMessage", message,
                "sender", sender,
                "timestamp", saved.getTimestamp()
        ));
    }

    // 채팅방 입장
    @MessageMapping("/chat.join")
    public void joinRoom(Map<String, Object> payload) {
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        String sender = payload.get("sender").toString();
        Long userId = Long.parseLong(payload.get("userId").toString());

        // 재입장 가능 여부 확인
        if (!chatRoomService.canRejoin(roomId, userId)) {
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/errors",
                    Map.of("message", "이 채팅방에 입장할 수 없습니다.")
            );
            return;
        }

        // Redis에 참여자 추가 + DB 기록
        try {
            chatRoomService.addParticipant(roomId, userId, sender);
        } catch (RuntimeException e) {
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/errors",
                    Map.of("message", e.getMessage())
            );
            return;
        }

        // 시스템 메시지 전송
        String systemMessage = sender + "님이 입장하셨습니다.";
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/system",
                Map.of("message", systemMessage, "type", "JOIN"));

        // 참여자 목록 업데이트 브로드캐스트
        broadcastParticipants(roomId);
    }

    // 채팅방 퇴장 (일시 퇴장)
    @MessageMapping("/chat.leave")
    public void leaveRoom(Map<String, Object> payload) {
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        String sender = payload.get("sender").toString();
        Long userId = Long.parseLong(payload.get("userId").toString());

        // Redis에서 참여자 제거 (일시 퇴장)
        chatRoomService.temporaryLeave(roomId, userId);

        // 시스템 메시지 전송
        String systemMessage = sender + "님이 퇴장하셨습니다.";
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/system",
                Map.of("message", systemMessage, "type", "LEAVE"));

        // 참여자 목록 업데이트 브로드캐스트
        broadcastParticipants(roomId);
    }

    // 채팅방 영구 탈퇴 (자발적)
    @MessageMapping("/chat.exit")
    public void exitRoom(Map<String, Object> payload) {
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        String sender = payload.get("sender").toString();
        Long userId = Long.parseLong(payload.get("userId").toString());

        // 영구 탈퇴 처리
        chatRoomService.permanentExit(roomId, userId, sender);

        // 시스템 메시지 전송
        String systemMessage = sender + "님이 채팅방을 탈퇴했습니다.";
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/system",
                Map.of("message", systemMessage, "type", "EXIT"));

        // 참여자 목록 업데이트
        broadcastParticipants(roomId);
    }

    // 강제 퇴출 (방장 전용)
    @MessageMapping("/chat.kick")
    public void kickParticipant(Map<String, Object> payload) {
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        Long targetUserId = Long.parseLong(payload.get("targetUserId").toString());
        String targetNickname = payload.get("targetNickname").toString();
        Long kickedBy = Long.parseLong(payload.get("kickedBy").toString());
        String reason = payload.getOrDefault("reason", "방장에 의해 퇴출").toString();

        // 방장 권한 확인
        if (!chatRoomService.isRoomCreator(roomId, kickedBy)) {
            messagingTemplate.convertAndSendToUser(
                    kickedBy.toString(),
                    "/queue/errors",
                    Map.of("message", "방장만 퇴출할 수 있습니다.")
            );
            return;
        }

        // 강제 퇴출 처리
        chatRoomService.kickParticipant(roomId, targetUserId, kickedBy, reason);

        // 퇴출된 사용자에게 개인 알림
        messagingTemplate.convertAndSendToUser(
                targetUserId.toString(),
                "/queue/kicked",
                Map.of(
                        "roomId", roomId,
                        "reason", reason,
                        "message", "채팅방에서 퇴출되었습니다."
                )
        );

        // 채팅방 전체에 시스템 메시지
        String systemMessage = targetNickname + "님이 채팅방에서 퇴출되었습니다.";
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/system",
                Map.of("message", systemMessage, "type", "KICK", "reason", reason));

        // 참여자 목록 업데이트
        broadcastParticipants(roomId);
    }

    // 채팅방 생성
    @MessageMapping("/rooms.create")
    public void createRoom(Map<String, Object> payload) {
        String roomName = payload.get("roomName").toString();
        String createdBy = payload.get("createdBy").toString();
        Long userId = Long.parseLong(payload.get("userId").toString());

        // 채팅방 생성
        ChatRoom newRoom = chatRoomService.createRoom(roomName, createdBy, userId);

        // 모든 사용자에게 채팅방 목록 업데이트 브로드캐스트
        broadcastRoomList();
    }

    // 채팅방 목록 요청
    @MessageMapping("/rooms.list")
    public void listRooms(Map<String, Object> payload) {
        broadcastRoomList();
    }

    // 채팅방 참여 (목록에서)
    @MessageMapping("/rooms.join")
    public void joinRoomFromList(Map<String, Object> payload) {
        Long roomId = Long.parseLong(payload.get("roomId").toString());
        Long userId = Long.parseLong(payload.get("userId").toString());
        String nickname = payload.get("nickname").toString();

        // 참여자 추가는 실제 채팅방 입장 시 처리됨
        // 여기서는 참여 의사만 표시
    }

    private void broadcastRoomList() {
        List<ChatRoom> rooms = chatRoomService.getAllActiveRooms();
        messagingTemplate.convertAndSend("/topic/rooms", rooms);
    }

    private void broadcastParticipants(Long roomId) {
        var participants = chatRoomService.getParticipants(roomId);
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/participants", participants);
    }
}