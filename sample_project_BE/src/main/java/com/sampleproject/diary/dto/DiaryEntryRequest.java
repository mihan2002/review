package com.sampleproject.diary.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

@Schema(description = "Diary entry payload; the owner is always taken from the JWT")
public record DiaryEntryRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        @Schema(example = "A Productive Day")
        String title,

        @NotBlank(message = "Content is required")
        @Size(max = 20000, message = "Content must not exceed 20000 characters")
        @Schema(example = "Today I worked on my backend project and learned about JWT authentication.")
        String content,

        @NotNull(message = "Entry date is required")
        @Schema(example = "2026-09-18")
        LocalDate entryDate) {
}
