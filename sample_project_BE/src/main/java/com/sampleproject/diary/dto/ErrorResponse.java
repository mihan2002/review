package com.sampleproject.diary.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.Map;

@Schema(description = "Consistent error payload returned by every failing request")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        @Schema(example = "400") int status,
        @Schema(example = "Validation failed") String message,
        @Schema(description = "Field-level validation errors, present only for validation failures")
        Map<String, String> errors,
        String path,
        Instant timestamp) {

    public static ErrorResponse of(int status, String message, String path) {
        return new ErrorResponse(status, message, null, path, Instant.now());
    }

    public static ErrorResponse validation(int status, String message, Map<String, String> errors, String path) {
        return new ErrorResponse(status, message, errors, path, Instant.now());
    }
}
