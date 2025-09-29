package com.sesac.chatservicegpt;

public enum ParticipantStatus {
    ACTIVE,          // 활성 (현재 참여 중)
    TEMP_LEFT,       // 일시 퇴장 (다시 입장 가능)
    SELF_EXITED,     // 자발적 영구 탈퇴
    KICKED,          // 방장에 의해 강제 퇴출
    SYSTEM_REMOVED   // 시스템에 의해 자동 퇴출
}