package com.sampleproject.diary.service;

import com.sampleproject.diary.security.PasswordResetProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends the reset PIN by email.
 *
 * <p>When no mail app password is configured — the usual state on a dev machine,
 * because a Gmail App Password cannot be committed — the mailer switches to dev
 * mode: nothing is sent, the PIN is the fixed {@code app.password-reset.dev-pin}
 * and it is written to the server log so it can be copied into the UI.
 */
@Component
public class PasswordResetMailer {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final JavaMailSender mailSender;
    private final PasswordResetProperties properties;
    private final String mailUsername;
    private final String mailPassword;

    public PasswordResetMailer(JavaMailSender mailSender,
                               PasswordResetProperties properties,
                               @Value("${spring.mail.username:}") String mailUsername,
                               @Value("${spring.mail.password:}") String mailPassword) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.mailUsername = mailUsername;
        this.mailPassword = mailPassword;
    }

    /** True when a real Gmail App Password is available, so mail can actually go out. */
    public boolean isMailConfigured() {
        return !isBlank(mailUsername) && !isBlank(mailPassword);
    }

    /**
     * @return true if the PIN was emailed; false if it was only logged (dev mode,
     *         or the SMTP send failed and the reset should still be completable).
     */
    public boolean sendPin(String toEmail, String username, String pin, long ttlMinutes) {
        if (!isMailConfigured()) {
            log.warn("Mail app password not configured — dev mode. Reset PIN for {} is {} (valid {} minutes).",
                    toEmail, pin, ttlMinutes);
            return false;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(isBlank(properties.fromAddress()) ? mailUsername : properties.fromAddress());
        message.setTo(toEmail);
        message.setSubject("Your My Diary password reset PIN");
        message.setText("""
                Hi %s,

                Use this PIN to reset your My Diary password:

                    %s

                It expires in %d minutes and can be used once.

                If you did not ask for a password reset you can ignore this email —
                your password has not changed.
                """.formatted(username, pin, ttlMinutes));

        try {
            mailSender.send(message);
            log.info("Password reset PIN emailed to {}", toEmail);
            return true;
        } catch (RuntimeException ex) {
            // The PIN is already stored, so surface it in the log rather than
            // stranding the user behind a mail-server problem.
            log.error("Failed to email the reset PIN to {} — PIN is {} (valid {} minutes)",
                    toEmail, pin, ttlMinutes, ex);
            return false;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
