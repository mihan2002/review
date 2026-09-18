package com.sampleproject.diary.dto;

import com.sampleproject.diary.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Public user representation (never contains credentials)")
public record UserResponse(UUID id, String username, String email, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getCreatedAt());
    }
}
