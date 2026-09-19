package com.sampleproject.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A one-shot PIN that lets its owner choose a new password.
 *
 * <p>Only a BCrypt hash of the PIN is stored, so a database dump cannot be used
 * to take over accounts. A token dies when it is consumed, when it expires, or
 * when too many wrong PINs have been tried against it.
 */
@Entity
@Table(name = "password_reset_tokens", indexes = {
        @Index(name = "idx_password_reset_tokens_user", columnList = "user_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** BCrypt hash of the PIN — never logged, never returned. */
    @Column(name = "pin_hash", nullable = false, length = 100)
    private String pinHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public boolean isExpired(Instant now) {
        return expiresAt.isBefore(now);
    }

    public boolean isUsable(Instant now, int maxAttempts) {
        return !isConsumed() && !isExpired(now) && attempts < maxAttempts;
    }
}
