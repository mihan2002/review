package com.sampleproject.diary.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Password-reset settings; values come from the environment (see .env.example).
 *
 * @param ttlMinutes  how long a PIN stays valid
 * @param maxAttempts wrong-PIN tries allowed before the PIN is burned
 * @param devPin      the fixed PIN used when no mail app password is configured
 * @param fromAddress the From: header on the reset email
 */
@ConfigurationProperties(prefix = "app.password-reset")
public record PasswordResetProperties(long ttlMinutes, int maxAttempts, String devPin, String fromAddress) {
}
