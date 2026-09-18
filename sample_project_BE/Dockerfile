# ---- Stage 1: build the JAR ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Dependencies first so they stay cached while only sources change.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Stage 2: minimal runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build /build/target/*.jar app.jar
USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
