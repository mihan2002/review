package com.sampleproject.diary.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Login credentials")
public record LoginRequest(

        @NotBlank(message = "Username is required")
        @Schema(example = "mihan")
        String username,

        @NotBlank(message = "Password is required")
        @Schema(example = "password123")
        String password) {
}
