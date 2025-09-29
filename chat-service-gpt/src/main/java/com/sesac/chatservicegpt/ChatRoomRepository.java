package com.sesac.chatservicegpt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    // 활성 채팅방만 조회
    List<ChatRoom> findByActiveTrue();

    // 생성일 기준 최신순 조회
    @Query("SELECT r FROM ChatRoom r WHERE r.active = true ORDER BY r.createdAt DESC")
    List<ChatRoom> findActiveRoomsOrderByCreatedAtDesc();

    // 특정 사용자가 생성한 채팅방 조회
    List<ChatRoom> findByCreatedByUserIdAndActiveTrue(Long userId);
}