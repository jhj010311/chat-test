package com.sesac.chatservicegpt;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private Long createdByUserId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column
    private Integer maxParticipants;

    // 현재 참여자 수는 실시간으로 계산하거나 Redis에서 관리
    @Transient
    private Integer participantCount;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}