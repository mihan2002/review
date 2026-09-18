package com.sampleproject.diary.dto;

import com.sampleproject.diary.entity.DiaryEntry;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Schema(description = "Diary entry representation")
public record DiaryEntryResponse(
        UUID id,
        String title,
        String content,
        LocalDate entryDate,
        Instant createdAt,
        Instant updatedAt) {

    public static DiaryEntryResponse from(DiaryEntry entry) {
        return new DiaryEntryResponse(
                entry.getId(),
                entry.getTitle(),
                entry.getContent(),
                entry.getEntryDate(),
                entry.getCreatedAt(),
                entry.getUpdatedAt());
    }
}
