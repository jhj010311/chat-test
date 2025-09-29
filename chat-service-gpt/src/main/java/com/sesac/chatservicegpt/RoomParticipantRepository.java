package com.sesac.chatservicegpt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {

    // 특정 채팅방의 특정 사용자 조회
    Optional<RoomParticipant> findByRoomIdAndUserId(Long roomId, Long userId);

    // 특정 채팅방의 모든 참여자 조회
    List<RoomParticipant> findByRoomId(Long roomId);

    // 특정 채팅방의 활성 참여자만 조회
    List<RoomParticipant> findByRoomIdAndStatus(Long roomId, ParticipantStatus status);

    // 영구 탈퇴/퇴출된 사용자인지 확인
    boolean existsByRoomIdAndUserIdAndStatusIn(
            Long roomId,
            Long userId,
            List<ParticipantStatus> statuses
    );

    // 특정 사용자가 참여 중인 모든 채팅방
    List<RoomParticipant> findByUserIdAndStatus(Long userId, ParticipantStatus status);
}