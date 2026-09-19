package com.sampleproject.diary.controller;

import com.sampleproject.diary.dto.AuthResponse;
import com.sampleproject.diary.dto.ErrorResponse;
import com.sampleproject.diary.dto.ForgotPasswordRequest;
import com.sampleproject.diary.dto.LoginRequest;
import com.sampleproject.diary.dto.MessageResponse;
import com.sampleproject.diary.dto.RegisterRequest;
import com.sampleproject.diary.dto.ResetPasswordRequest;
import com.sampleproject.diary.dto.UserResponse;
import com.sampleproject.diary.dto.VerifyResetPinRequest;
import com.sampleproject.diary.service.AuthService;
import com.sampleproject.diary.service.PasswordResetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Registration and JWT login")
@SecurityRequirements
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user",
            description = "Creates an account. The password is stored as a BCrypt hash and never returned.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User registered"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Username or email already exists",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Login and obtain a JWT",
            description = "Returns a bearer token to send as: Authorization: Bearer <token>")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authentication successful"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset PIN",
            description = "Emails a one-time PIN to the address if it belongs to an account. "
                    + "The response is identical for unknown addresses so the endpoint cannot "
                    + "be used to discover who is registered. When the server has no mail app "
                    + "password configured, the PIN is written to the server log instead of sent.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Request accepted"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request);
        return ResponseEntity.ok(MessageResponse.of(
                "If that email is registered, a reset PIN is on its way."));
    }

    @PostMapping("/verify-reset-pin")
    @Operation(summary = "Check a reset PIN",
            description = "Validates a PIN without spending it, so the UI can move to the "
                    + "new-password step. Repeated wrong PINs burn the PIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "PIN is valid"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "PIN is wrong, expired or already used",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<MessageResponse> verifyResetPin(@Valid @RequestBody VerifyResetPinRequest request) {
        passwordResetService.verifyPin(request);
        return ResponseEntity.ok(MessageResponse.of("PIN accepted."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Set a new password with a reset PIN",
            description = "Consumes the PIN and replaces the password. Sign in again afterwards.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password changed"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "PIN is wrong, expired or already used",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(MessageResponse.of("Your password has been changed. Please sign in."));
    }
}
