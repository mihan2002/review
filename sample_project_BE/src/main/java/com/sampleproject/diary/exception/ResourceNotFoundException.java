package com.sampleproject.diary.exception;

/** Thrown when a resource does not exist, or does not belong to the caller. */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
