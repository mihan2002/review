package com.sampleproject.diary.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Plain confirmation message")
public record MessageResponse(
        @Schema(example = "If that email is registered, a reset PIN has been sent.") String message) {

    public static MessageResponse of(String message) {
        return new MessageResponse(message);
    }
}
