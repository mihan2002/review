package com.sampleproject.diary.repository;

import com.sampleproject.diary.entity.PasswordResetToken;
import com.sampleproject.diary.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    /** The most recent token for a user; older ones are superseded, not reused. */
    Optional<PasswordResetToken> findFirstByUserOrderByCreatedAtDesc(User user);

    @Modifying
    @Query("delete from PasswordResetToken t where t.user = :user")
    void deleteAllByUser(@Param("user") User user);

    @Modifying
    @Query("delete from PasswordResetToken t where t.expiresAt < :cutoff")
    int deleteExpired(@Param("cutoff") Instant cutoff);
}
