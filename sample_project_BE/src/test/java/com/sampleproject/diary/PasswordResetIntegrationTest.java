package com.sampleproject.diary;

import com.sampleproject.diary.dto.ForgotPasswordRequest;
import com.sampleproject.diary.dto.LoginRequest;
import com.sampleproject.diary.dto.RegisterRequest;
import com.sampleproject.diary.dto.ResetPasswordRequest;
import com.sampleproject.diary.dto.VerifyResetPinRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the forgotten-password flow. The test profile has no mail app password,
 * so the backend issues the fixed dev PIN instead of emailing a random one.
 */
class PasswordResetIntegrationTest extends AbstractIntegrationTest {

    private static final String DEV_PIN = "1234";
    private static final String EMAIL = "resetter@example.com";
    private static final String USERNAME = "resetter";
    private static final String OLD_PASSWORD = "oldpassword123";
    private static final String NEW_PASSWORD = "newpassword456";

    private void registerUser() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RegisterRequest(USERNAME, EMAIL, OLD_PASSWORD))))
                .andExpect(status().isCreated());
    }

    private void requestPin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ForgotPasswordRequest(email))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a PIN resets the password and the new one signs in")
    void resetsPassword() throws Exception {
        registerUser();
        requestPin(EMAIL);

        mockMvc.perform(post("/api/auth/verify-reset-pin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new VerifyResetPinRequest(EMAIL, DEV_PIN))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, DEV_PIN, NEW_PASSWORD))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(USERNAME, NEW_PASSWORD))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(USERNAME, OLD_PASSWORD))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("an unknown email is accepted but issues no PIN")
    void unknownEmailLooksIdentical() throws Exception {
        registerUser();
        requestPin("nobody@example.com");

        assertThat(passwordResetTokenRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("the email lookup ignores case")
    void emailLookupIsCaseInsensitive() throws Exception {
        registerUser();
        requestPin(EMAIL.toUpperCase());

        assertThat(passwordResetTokenRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("a wrong PIN is rejected")
    void rejectsWrongPin() throws Exception {
        registerUser();
        requestPin(EMAIL);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, "9999", NEW_PASSWORD))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(USERNAME, OLD_PASSWORD))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a PIN works only once")
    void pinIsSingleUse() throws Exception {
        registerUser();
        requestPin(EMAIL);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, DEV_PIN, NEW_PASSWORD))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, DEV_PIN, "thirdpassword789"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("too many wrong PINs burn the token")
    void burnsTokenAfterTooManyAttempts() throws Exception {
        registerUser();
        requestPin(EMAIL);

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/auth/verify-reset-pin")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(new VerifyResetPinRequest(EMAIL, "9999"))))
                    .andExpect(status().isUnauthorized());
        }

        // The correct PIN no longer helps once the attempt budget is spent.
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, DEV_PIN, NEW_PASSWORD))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("requesting a new PIN supersedes the previous token")
    void newRequestReplacesPreviousToken() throws Exception {
        registerUser();
        requestPin(EMAIL);
        requestPin(EMAIL);

        assertThat(passwordResetTokenRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("malformed input is rejected before any lookup")
    void validatesInput() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ForgotPasswordRequest("not-an-email"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, "12ab", NEW_PASSWORD))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResetPasswordRequest(EMAIL, DEV_PIN, "short"))))
                .andExpect(status().isBadRequest());
    }
}
