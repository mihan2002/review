package com.sampleproject.diary.service;

import com.sampleproject.diary.dto.DiaryEntryRequest;
import com.sampleproject.diary.dto.DiaryEntryResponse;
import com.sampleproject.diary.dto.PageResponse;
import com.sampleproject.diary.entity.DiaryEntry;
import com.sampleproject.diary.entity.User;
import com.sampleproject.diary.exception.ResourceNotFoundException;
import com.sampleproject.diary.exception.UnauthorizedException;
import com.sampleproject.diary.repository.DiaryEntryRepository;
import com.sampleproject.diary.repository.UserRepository;
import com.sampleproject.diary.security.CurrentUserProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * All diary operations resolve the owner from the security context and query by
 * (entryId, userId), so one user can never reach another user's entries.
 */
@Service
public class DiaryService {

    /** Newest diary date first, with the creation instant as a stable tie-breaker. */
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("entryDate"), Sort.Order.desc("createdAt"));

    private final DiaryEntryRepository diaryEntryRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public DiaryService(DiaryEntryRepository diaryEntryRepository,
                        UserRepository userRepository,
                        CurrentUserProvider currentUserProvider) {
        this.diaryEntryRepository = diaryEntryRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public DiaryEntryResponse create(DiaryEntryRequest request) {
        UUID userId = currentUserProvider.requireCurrentUserId();
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user no longer exists"));

        DiaryEntry entry = DiaryEntry.builder()
                .user(owner)
                .title(request.title())
                .content(request.content())
                .entryDate(request.entryDate())
                .build();

        return DiaryEntryResponse.from(diaryEntryRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public PageResponse<DiaryEntryResponse> findAll(LocalDate from, LocalDate to, int page, int size) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must not be after 'to'");
        }
        UUID userId = currentUserProvider.requireCurrentUserId();
        Page<DiaryEntry> entries = findInRange(userId, from, to, pageable(page, size));
        return PageResponse.of(entries, DiaryEntryResponse::from);
    }

    @Transactional(readOnly = true)
    public PageResponse<DiaryEntryResponse> search(String keyword, int page, int size) {
        UUID userId = currentUserProvider.requireCurrentUserId();
        Page<DiaryEntry> entries =
                diaryEntryRepository.searchByUserAndKeyword(userId, keyword.trim(), pageable(page, size));
        return PageResponse.of(entries, DiaryEntryResponse::from);
    }

    @Transactional(readOnly = true)
    public DiaryEntryResponse findById(UUID id) {
        return DiaryEntryResponse.from(requireOwnedEntry(id));
    }

    @Transactional
    public DiaryEntryResponse update(UUID id, DiaryEntryRequest request) {
        DiaryEntry entry = requireOwnedEntry(id);
        entry.setTitle(request.title());
        entry.setContent(request.content());
        entry.setEntryDate(request.entryDate());
        return DiaryEntryResponse.from(diaryEntryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id) {
        UUID userId = currentUserProvider.requireCurrentUserId();
        if (!diaryEntryRepository.existsByIdAndUserId(id, userId)) {
            throw new ResourceNotFoundException("Diary entry not found");
        }
        diaryEntryRepository.deleteByIdAndUserId(id, userId);
    }

    /**
     * An entry owned by somebody else is reported as "not found" so the API does not
     * reveal that the id exists.
     */
    private DiaryEntry requireOwnedEntry(UUID id) {
        UUID userId = currentUserProvider.requireCurrentUserId();
        return diaryEntryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Diary entry not found"));
    }

    /** Picks the query matching which bounds were supplied; see the repository for why. */
    private Page<DiaryEntry> findInRange(UUID userId, LocalDate from, LocalDate to, Pageable pageable) {
        if (from != null && to != null) {
            return diaryEntryRepository.findByUserIdAndEntryDateBetween(userId, from, to, pageable);
        }
        if (from != null) {
            return diaryEntryRepository.findByUserIdAndEntryDateGreaterThanEqual(userId, from, pageable);
        }
        if (to != null) {
            return diaryEntryRepository.findByUserIdAndEntryDateLessThanEqual(userId, to, pageable);
        }
        return diaryEntryRepository.findByUserId(userId, pageable);
    }

    private Pageable pageable(int page, int size) {
        return PageRequest.of(page, size, DEFAULT_SORT);
    }
}
