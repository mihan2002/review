package com.sampleproject.diary;

import com.jayway.jsonpath.JsonPath;
import com.sampleproject.diary.dto.DiaryEntryRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DiaryControllerIntegrationTest extends AbstractIntegrationTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 18);

    private String createEntry(String token, String title, String content, LocalDate date) throws Exception {
        String body = mockMvc.perform(post("/api/diaries")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DiaryEntryRequest(title, content, date))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    @DisplayName("creates an entry owned by the authenticated user")
    void createsEntry() throws Exception {
        String token = registerAndLogin("mihan", "password123");

        mockMvc.perform(post("/api/diaries")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DiaryEntryRequest("A Productive Day", "Learned about JWT.", TODAY))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("A Productive Day"))
                .andExpect(jsonPath("$.entryDate").value("2026-09-18"))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.userId").doesNotExist());
    }

    @Test
    @DisplayName("rejects an unauthenticated request with 401")
    void rejectsAnonymousAccess() throws Exception {
        mockMvc.perform(get("/api/diaries"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        mockMvc.perform(get("/api/diaries").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("lists only own entries, newest diary date first, paginated")
    void listsOwnEntriesSortedAndPaged() throws Exception {
        String mihan = registerAndLogin("mihan", "password123");
        String other = registerAndLogin("other", "password123");

        createEntry(mihan, "Older", "older content", TODAY.minusDays(5));
        createEntry(mihan, "Newer", "newer content", TODAY);
        createEntry(other, "Foreign", "not mine", TODAY);

        mockMvc.perform(get("/api/diaries?page=0&size=10").header(HttpHeaders.AUTHORIZATION, mihan))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].title").value("Newer"))
                .andExpect(jsonPath("$.content[1].title").value("Older"));

        mockMvc.perform(get("/api/diaries?page=0&size=1").header(HttpHeaders.AUTHORIZATION, mihan))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.last").value(false));
    }

    @Test
    @DisplayName("filters own entries by date range")
    void filtersByDateRange() throws Exception {
        String token = registerAndLogin("mihan", "password123");
        createEntry(token, "In range", "content", LocalDate.of(2026, 9, 10));
        createEntry(token, "Out of range", "content", LocalDate.of(2026, 8, 1));

        mockMvc.perform(get("/api/diaries?from=2026-09-01&to=2026-09-18")
                        .header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("In range"));
    }

    @Test
    @DisplayName("searches own title and content, case-insensitively")
    void searchesOwnEntries() throws Exception {
        String mihan = registerAndLogin("mihan", "password123");
        String other = registerAndLogin("other", "password123");

        createEntry(mihan, "Backend PROJECT", "planning notes", TODAY);
        createEntry(mihan, "Groceries", "milk and bread", TODAY);
        createEntry(other, "Their project", "secret notes", TODAY);

        mockMvc.perform(get("/api/diaries/search?keyword=project").header(HttpHeaders.AUTHORIZATION, mihan))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Backend PROJECT"));

        mockMvc.perform(get("/api/diaries/search?keyword=milk").header(HttpHeaders.AUTHORIZATION, mihan))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Groceries"));
    }

    @Test
    @DisplayName("gets, updates and deletes an own entry")
    void fullCrudOnOwnEntry() throws Exception {
        String token = registerAndLogin("mihan", "password123");
        String id = createEntry(token, "Original", "original content", TODAY);

        mockMvc.perform(get("/api/diaries/" + id).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Original"));

        mockMvc.perform(put("/api/diaries/" + id)
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DiaryEntryRequest("Updated", "updated content", TODAY.minusDays(1)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Updated"))
                .andExpect(jsonPath("$.entryDate").value("2026-09-17"));

        mockMvc.perform(delete("/api/diaries/" + id).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/diaries/" + id).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("never exposes another user's entry through read, update or delete")
    void cannotTouchAnotherUsersEntry() throws Exception {
        String owner = registerAndLogin("mihan", "password123");
        String intruder = registerAndLogin("intruder", "password123");
        String id = createEntry(owner, "Private", "private content", TODAY);

        mockMvc.perform(get("/api/diaries/" + id).header(HttpHeaders.AUTHORIZATION, intruder))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Diary entry not found"));

        mockMvc.perform(put("/api/diaries/" + id)
                        .header(HttpHeaders.AUTHORIZATION, intruder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DiaryEntryRequest("Hacked", "hacked", TODAY))))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/diaries/" + id).header(HttpHeaders.AUTHORIZATION, intruder))
                .andExpect(status().isNotFound());

        // The entry is untouched for its real owner.
        mockMvc.perform(get("/api/diaries/" + id).header(HttpHeaders.AUTHORIZATION, owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Private"));
    }

    @Test
    @DisplayName("returns field errors for an invalid diary payload")
    void rejectsInvalidDiaryRequest() throws Exception {
        String token = registerAndLogin("mihan", "password123");

        mockMvc.perform(post("/api/diaries")
                        .header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DiaryEntryRequest("", "", null))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.title").value("Title is required"))
                .andExpect(jsonPath("$.errors.content").value("Content is required"))
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date is required"));
    }
}
