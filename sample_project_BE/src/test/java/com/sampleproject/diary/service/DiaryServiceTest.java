package com.sampleproject.diary.service;

import com.sampleproject.diary.dto.DiaryEntryRequest;
import com.sampleproject.diary.entity.DiaryEntry;
import com.sampleproject.diary.entity.User;
import com.sampleproject.diary.exception.ResourceNotFoundException;
import com.sampleproject.diary.repository.DiaryEntryRepository;
import com.sampleproject.diary.repository.UserRepository;
import com.sampleproject.diary.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DiaryServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ENTRY_ID = UUID.randomUUID();

    @Mock
    private DiaryEntryRepository diaryEntryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private DiaryService diaryService;

    private User owner;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(USER_ID).username("mihan").email("mihan@example.com").passwordHash("hash").build();
    }

    @Test
    @DisplayName("assigns the authenticated user as the owner of a new entry")
    void createAssignsAuthenticatedOwner() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);
        given(userRepository.findById(USER_ID)).willReturn(Optional.of(owner));
        given(diaryEntryRepository.save(any(DiaryEntry.class))).willAnswer(invocation -> invocation.getArgument(0));

        diaryService.create(new DiaryEntryRequest("Title", "Content", LocalDate.of(2026, 9, 18)));

        ArgumentCaptor<DiaryEntry> captor = ArgumentCaptor.forClass(DiaryEntry.class);
        verify(diaryEntryRepository).save(captor.capture());
        assertThat(captor.getValue().getUser().getId()).isEqualTo(USER_ID);
    }

    @Test
    @DisplayName("looks an entry up by id AND owner id")
    void findByIdIsScopedToOwner() {
        DiaryEntry entry = DiaryEntry.builder()
                .id(ENTRY_ID).user(owner).title("Title").content("Content")
                .entryDate(LocalDate.of(2026, 9, 18)).build();
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);
        given(diaryEntryRepository.findByIdAndUserId(ENTRY_ID, USER_ID)).willReturn(Optional.of(entry));

        assertThat(diaryService.findById(ENTRY_ID).id()).isEqualTo(ENTRY_ID);
        verify(diaryEntryRepository, never()).findById(any());
    }

    @Test
    @DisplayName("reports another user's entry as not found")
    void findByIdRejectsForeignEntry() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);
        given(diaryEntryRepository.findByIdAndUserId(ENTRY_ID, USER_ID)).willReturn(Optional.empty());

        assertThatThrownBy(() -> diaryService.findById(ENTRY_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Diary entry not found");
    }

    @Test
    @DisplayName("does not delete when the caller does not own the entry")
    void deleteRejectsForeignEntry() {
        given(currentUserProvider.requireCurrentUserId()).willReturn(USER_ID);
        given(diaryEntryRepository.existsByIdAndUserId(ENTRY_ID, USER_ID)).willReturn(false);

        assertThatThrownBy(() -> diaryService.delete(ENTRY_ID))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(diaryEntryRepository, never()).deleteByIdAndUserId(any(), any());
    }

    @Test
    @DisplayName("rejects a reversed date range")
    void findAllRejectsReversedRange() {
        assertThatThrownBy(() -> diaryService.findAll(
                LocalDate.of(2026, 9, 18), LocalDate.of(2026, 9, 1), 0, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
