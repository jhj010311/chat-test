package com.sesac.chatservicegpt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final RoomParticipantRepository participantRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String ROOM_PARTICIPANTS_KEY = "room:participants:";

    public ChatRoom createRoom(String roomName, String createdBy, Long userId) {
        ChatRoom room = ChatRoom.builder()
                .name(roomName)
                .createdBy(createdBy)
                .createdByUserId(userId)
                .active(true)
                .build();

        return chatRoomRepository.save(room);
    }

    public List<ChatRoom> getAllActiveRooms() {
        List<ChatRoom> rooms = chatRoomRepository.findActiveRoomsOrderByCreatedAtDesc();

        // 각 채팅방의 현재 참여자 수 설정
        return rooms.stream().map(room -> {
            room.setParticipantCount(getParticipantCount(room.getId()));
            return room;
        }).collect(Collectors.toList());
    }

    public boolean addParticipant(Long roomId, Long userId, String nickname) {
        // 재입장 가능 여부 확인
        if (!canRejoin(roomId, userId)) {
            throw new RuntimeException("재입장이 불가능한 사용자입니다.");
        }

        // Redis에 추가 (실시간 세션)
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        redisTemplate.opsForHash().put(key, userId.toString(), nickname);

        // DB에 참여 기록
        var existingParticipant = participantRepository.findByRoomIdAndUserId(roomId, userId);

        if (existingParticipant.isPresent()) {
            // 재입장 시 상태 업데이트
            RoomParticipant participant = existingParticipant.get();
            participant.setStatus(ParticipantStatus.ACTIVE);
            participant.setLeftAt(null);
            participantRepository.save(participant);
            return false; // 재입장
        } else {
            // 최초 입장
            participantRepository.save(RoomParticipant.builder()
                    .roomId(roomId)
                    .userId(userId)
                    .nickname(nickname)
                    .status(ParticipantStatus.ACTIVE)
                    .build());
            return true; // 최초 입장
        }
    }

    // 이미 입장해 있는지 확인 (Redis 기준)
    public boolean isAlreadyInRoom(Long roomId, Long userId) {
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        return redisTemplate.opsForHash().hasKey(key, userId.toString());
    }

    // 일시 퇴장 처리 (Redis에서만 제거)
    public void temporaryLeave(Long roomId, Long userId) {
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        redisTemplate.opsForHash().delete(key, userId.toString());

        // DB 상태 업데이트 (선택적)
        participantRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(participant -> {
                    participant.setStatus(ParticipantStatus.TEMP_LEFT);
                    participantRepository.save(participant);
                });
    }

    // 영구 탈퇴 처리 (사용자 자발적)
    public void permanentExit(Long roomId, Long userId, String nickname) {
        // Redis에서 제거
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        redisTemplate.opsForHash().delete(key, userId.toString());

        // DB에 영구 탈퇴 기록
        participantRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(participant -> {
                    participant.setStatus(ParticipantStatus.SELF_EXITED);
                    participant.setLeftAt(LocalDateTime.now());
                    participant.setExitReason("사용자 자발적 탈퇴");
                    participantRepository.save(participant);
                });
    }

    // 강제 퇴출 (방장에 의해)
    public void kickParticipant(Long roomId, Long userId, Long kickedByUserId, String reason) {
        // Redis에서 제거
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        redisTemplate.opsForHash().delete(key, userId.toString());

        // DB에 강제 퇴출 기록
        participantRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(participant -> {
                    participant.setStatus(ParticipantStatus.KICKED);
                    participant.setLeftAt(LocalDateTime.now());
                    participant.setKickedBy(kickedByUserId);
                    participant.setExitReason(reason);
                    participantRepository.save(participant);
                });
    }

    // 시스템 자동 퇴출 (모집 마감 시 등)
    public void systemRemove(Long roomId, Long userId, String reason) {
        // Redis에서 제거
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        redisTemplate.opsForHash().delete(key, userId.toString());

        // DB에 시스템 퇴출 기록
        participantRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(participant -> {
                    participant.setStatus(ParticipantStatus.SYSTEM_REMOVED);
                    participant.setLeftAt(LocalDateTime.now());
                    participant.setExitReason(reason);
                    participantRepository.save(participant);
                });
    }

    // 재입장 가능 여부 확인
    public boolean canRejoin(Long roomId, Long userId) {
        // 영구 탈퇴/퇴출된 사용자는 재입장 불가
        List<ParticipantStatus> blockedStatuses = List.of(
                ParticipantStatus.SELF_EXITED,
                ParticipantStatus.KICKED,
                ParticipantStatus.SYSTEM_REMOVED
        );

        return !participantRepository.existsByRoomIdAndUserIdAndStatusIn(
                roomId, userId, blockedStatuses
        );
    }

    // 방장 여부 확인
    public boolean isRoomCreator(Long roomId, Long userId) {
        return chatRoomRepository.findById(roomId)
                .map(room -> room.getCreatedByUserId().equals(userId))
                .orElse(false);
    }

    public Set<Object> getParticipants(Long roomId) {
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        return redisTemplate.opsForHash().entries(key).entrySet().stream()
                .map(entry -> new RoomParticipant(
                        Long.parseLong(entry.getKey().toString()),
                        entry.getValue().toString()
                )).collect(Collectors.toSet());
    }

    public Integer getParticipantCount(Long roomId) {
        String key = ROOM_PARTICIPANTS_KEY + roomId;
        return redisTemplate.opsForHash().size(key).intValue();
    }

    public ChatRoom findById(Long roomId) {
        return chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
    }
}