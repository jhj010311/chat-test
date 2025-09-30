package com.sesac.chatservicegpt;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // 특정 채팅방의 최근 메시지 조회 (페이징)
    List<ChatMessage> findByRoomIdOrderByTimestampDesc(String roomId, Pageable pageable);

    // 특정 채팅방의 모든 메시지 개수
    long countByRoomId(String roomId);
}
