package com.sampleproject.diary.controller;

import com.sampleproject.diary.dto.DiaryEntryRequest;
import com.sampleproject.diary.dto.DiaryEntryResponse;
import com.sampleproject.diary.dto.ErrorResponse;
import com.sampleproject.diary.dto.PageResponse;
import com.sampleproject.diary.service.DiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/diaries")
@Validated
@Tag(name = "Diary", description = "CRUD, search and date filtering over the caller's own diary entries")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "404", description = "Entry not found for the authenticated user",
                content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
})
public class DiaryController {

    private final DiaryService diaryService;

    public DiaryController(DiaryService diaryService) {
        this.diaryService = diaryService;
    }

    @PostMapping
    @Operation(summary = "Create a diary entry",
            description = "The authenticated user automatically becomes the owner; userId cannot be supplied.")
    @ApiResponse(responseCode = "201", description = "Entry created")
    public ResponseEntity<DiaryEntryResponse> create(@Valid @RequestBody DiaryEntryRequest request) {
        DiaryEntryResponse created = diaryService.create(request);
        return ResponseEntity.created(URI.create("/api/diaries/" + created.id())).body(created);
    }

    @GetMapping
    @Operation(summary = "List own diary entries",
            description = "Paginated, newest entry date first. Optionally filtered by an inclusive date range.")
    @ApiResponse(responseCode = "200", description = "Page of entries")
    public PageResponse<DiaryEntryResponse> findAll(
            @Parameter(description = "Inclusive lower bound of entryDate", example = "2026-09-01")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "Inclusive upper bound of entryDate", example = "2026-09-18")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "Page must not be negative") int page,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "Size must be at least 1")
            @Max(value = 100, message = "Size must not exceed 100") int size) {
        return diaryService.findAll(from, to, page, size);
    }

    @GetMapping("/search")
    @Operation(summary = "Search own diary entries",
            description = "Case-insensitive match against title and content.")
    @ApiResponse(responseCode = "200", description = "Page of matching entries")
    public PageResponse<DiaryEntryResponse> search(
            @RequestParam @NotBlank(message = "Keyword is required") String keyword,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "Page must not be negative") int page,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "Size must be at least 1")
            @Max(value = 100, message = "Size must not exceed 100") int size) {
        return diaryService.search(keyword, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one diary entry",
            description = "Returns 404 when the entry does not exist or belongs to another user.")
    @ApiResponse(responseCode = "200", description = "The entry")
    public DiaryEntryResponse findById(@PathVariable UUID id) {
        return diaryService.findById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an own diary entry",
            description = "Only title, content and entryDate can change; id, owner and createdAt are immutable.")
    @ApiResponse(responseCode = "200", description = "Updated entry")
    public DiaryEntryResponse update(@PathVariable UUID id, @Valid @RequestBody DiaryEntryRequest request) {
        return diaryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an own diary entry")
    @ApiResponse(responseCode = "204", description = "Entry deleted")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        diaryService.delete(id);
    }
}
