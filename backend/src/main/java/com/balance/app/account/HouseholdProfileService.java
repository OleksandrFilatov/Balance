package com.balance.app.account;

import com.balance.app.service.DomainException;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class HouseholdProfileService {
  private final JdbcTemplate jdbc;

  public HouseholdProfileService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  public record Profile(String firstName, String partnerName, long version) {}
  public record Save(@Size(max = 60) String firstName, @Size(max = 60) String partnerName,
                     @NotNull @PositiveOrZero Long version) {}

  public Profile get() {
    return jdbc.queryForObject("select first_name,partner_name,version from household_profile where id",
        (rs, row) -> new Profile(rs.getString(1), rs.getString(2), rs.getLong(3)));
  }

  @Transactional
  public Profile save(Save input) {
    var first = name(input.firstName());
    var partner = name(input.partnerName());
    int changed = jdbc.update("update household_profile set first_name=?,partner_name=?,version=version+1 where id and version=?",
        first, partner, input.version());
    if (changed != 1) throw DomainException.conflict("Household names changed. Reload before saving.");
    return get();
  }

  private String name(String value) {
    if (value == null || value.isBlank()) return null;
    var stripped = value.strip();
    if (stripped.codePoints().anyMatch(Character::isISOControl))
      throw DomainException.invalid("Names cannot contain control characters.");
    return stripped;
  }
}
