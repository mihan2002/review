package com.sampleproject.diary;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sampleproject.diary.dto.LoginRequest;
import com.sampleproject.diary.dto.RegisterRequest;
import com.sampleproject.diary.repository.DiaryEntryRepository;
import com.sampleproject.diary.repository.PasswordResetTokenRepository;
import com.sampleproject.diary.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Boots the full application against an in-memory database. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class AbstractIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected DiaryEntryRepository diaryEntryRepository;

    @Autowired
    protected PasswordResetTokenRepository passwordResetTokenRepository;

    @BeforeEach
    void cleanDatabase() {
        diaryEntryRepository.deleteAll();
        // Reset tokens reference users, so they go first.
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    protected String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    /** Registers a user and returns their bearer token. */
    protected String registerAndLogin(String username, String password) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RegisterRequest(username, username + "@example.com", password))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated());

        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(username, password))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andReturn().getResponse().getContentAsString();

        return "Bearer " + JsonPath.read(body, "$.token");
    }
}
