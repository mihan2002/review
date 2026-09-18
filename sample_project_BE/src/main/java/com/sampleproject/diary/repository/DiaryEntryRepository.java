package com.sampleproject.diary.repository;

import com.sampleproject.diary.entity.DiaryEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Every query is scoped by the owning user id, so a caller can never reach
 * another user's entry even when it knows the entry id (IDOR/BOLA protection).
 */
public interface DiaryEntryRepository extends JpaRepository<DiaryEntry, UUID> {

    Optional<DiaryEntry> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select d from DiaryEntry d
            where d.user.id = :userId
              and (:from is null or d.entryDate >= :from)
              and (:to is null or d.entryDate <= :to)
            """)
    Page<DiaryEntry> findByUserAndDateRange(@Param("userId") UUID userId,
                                            @Param("from") LocalDate from,
                                            @Param("to") LocalDate to,
                                            Pageable pageable);

    @Query("""
            select d from DiaryEntry d
            where d.user.id = :userId
              and (lower(d.title) like lower(concat('%', :keyword, '%'))
                   or lower(d.content) like lower(concat('%', :keyword, '%')))
            """)
    Page<DiaryEntry> searchByUserAndKeyword(@Param("userId") UUID userId,
                                            @Param("keyword") String keyword,
                                            Pageable pageable);
}
