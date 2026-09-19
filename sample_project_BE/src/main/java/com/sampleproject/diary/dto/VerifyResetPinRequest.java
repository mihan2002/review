package com.sampleproject.diary.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Schema(description = "Check a reset PIN before showing the new-password step")
public record VerifyResetPinRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Schema(example = "mihan@example.com")
        String email,

        @NotBlank(message = "PIN is required")
        @Pattern(regexp = "[0-9]{4,8}", message = "PIN must be 4 to 8 digits")
        @Schema(example = "482913")
        String pin) {
}
