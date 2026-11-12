package com.balance.app.service;

import org.springframework.http.HttpStatus;

public class DomainException extends RuntimeException {
  private final HttpStatus status;

  public DomainException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public HttpStatus status() {
    return status;
  }

  public static DomainException invalid(String message) {
    return new DomainException(HttpStatus.BAD_REQUEST, message);
  }

  public static DomainException missing(String resource) {
    return new DomainException(HttpStatus.NOT_FOUND, resource + " not found");
  }

  public static DomainException conflict(String message) {
    return new DomainException(HttpStatus.CONFLICT, message);
  }
}
