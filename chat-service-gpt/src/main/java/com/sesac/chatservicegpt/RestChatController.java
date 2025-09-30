package com.sesac.chatservicegpt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class RestChatController {

    private final ChatMessageRepository chatMessageRepository;

    /**
     * 특정 채팅방의 과거 메시지 조회
     * @param roomId 채팅방 ID
     * @param limit 가져올 메시지 수 (기본 50개)
     * @return 최근 메시지 목록 (오래된 순)
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessage>> getRoomMessages(
            @PathVariable String roomId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        // 최근 메시지를 최신순으로 가져온 후 역순으로 정렬 (오래된 메시지가 위로)
        List<ChatMessage> messages = chatMessageRepository
                .findByRoomIdOrderByTimestampDesc(
                        roomId,
                        PageRequest.of(0, limit)
                );

        // 오래된 순으로 뒤집기 (채팅방에서 위에서 아래로 표시)
        java.util.Collections.reverse(messages);

        return ResponseEntity.ok(messages);
    }
}