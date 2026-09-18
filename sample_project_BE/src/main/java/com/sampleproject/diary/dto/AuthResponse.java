package com.sampleproject.diary.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Issued JWT access token")
public record AuthResponse(
        @Schema(example = "eyJhbGciOiJIUzI1NiJ9...") String token,
        @Schema(example = "Bearer") String tokenType,
        @Schema(description = "Token lifetime in seconds", example = "86400") long expiresIn) {

    public static AuthResponse bearer(String token, long expiresInSeconds) {
        return new AuthResponse(token, "Bearer", expiresInSeconds);
    }
}
