package com.balance.app.config;

import com.balance.app.service.DomainException;
import jakarta.validation.ConstraintViolationException;
import java.util.*;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(DomainException.class)
  ResponseEntity<ProblemDetail> domain(DomainException e) {
    return problem(e.status(), e.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException e) {
    var body =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed");
    body.setProperty(
        "errors",
        e.getBindingResult().getFieldErrors().stream()
            .map(f ->
                Map.of(
                    "field",
                    f.getField(),
                    "message",
                    Objects.toString(f.getDefaultMessage(), "Invalid value")))
            .toList());
    return ResponseEntity.badRequest().body(body);
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
    MissingServletRequestParameterException.class,
    MissingRequestHeaderException.class,
    ConstraintViolationException.class,
    HandlerMethodValidationException.class
  })
  ResponseEntity<ProblemDetail> invalid(Exception e) {
    return problem(HttpStatus.BAD_REQUEST, "Invalid request parameters or JSON");
  }

  @ExceptionHandler({
    DataIntegrityViolationException.class,
    OptimisticLockingFailureException.class,
    ConcurrencyFailureException.class
  })
  ResponseEntity<ProblemDetail> conflict(Exception e) {
    return problem(HttpStatus.CONFLICT, "Resource conflict; reload and retry with current data");
  }

  private ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
    return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(status, detail));
  }
}
