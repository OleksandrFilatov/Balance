package com.balance.app.category;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
  private final CategoryService service;

  public CategoryController(CategoryService service) {
    this.service = service;
  }

  @GetMapping
  public List<CategoryDto.View> list() {
    return service.list();
  }

  @GetMapping("/{id}")
  public CategoryDto.View get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  public ResponseEntity<CategoryDto.View> create(@Valid @RequestBody CategoryDto.Create request) {
    var result = service.create(request);
    return ResponseEntity.created(URI.create("/api/categories/" + result.id())).body(result);
  }

  @PutMapping("/{id}")
  public CategoryDto.View update(
      @PathVariable UUID id, @Valid @RequestBody CategoryDto.Update request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}
