package com.sampleproject.diary.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Set a new password using a reset PIN")
public record ResetPasswordRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Schema(example = "mihan@example.com")
        String email,

        @NotBlank(message = "PIN is required")
        @Pattern(regexp = "[0-9]{4,8}", message = "PIN must be 4 to 8 digits")
        @Schema(example = "482913")
        String pin,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        @Schema(example = "newpassword123")
        String newPassword) {
}
