package com.sampleproject.diary.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI diaryOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Diary API")
                        .version("v1")
                        .description("""
                                Personal diary REST API.

                                Register via POST /api/auth/register, obtain a JWT via POST /api/auth/login,
                                then click Authorize and paste the token to call the protected diary endpoints.
                                Every diary operation is scoped to the authenticated user.
                                """))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME))
                .components(new Components().addSecuritySchemes(SECURITY_SCHEME,
                        new SecurityScheme()
                                .name(SECURITY_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the token returned by /api/auth/login")));
    }
}
