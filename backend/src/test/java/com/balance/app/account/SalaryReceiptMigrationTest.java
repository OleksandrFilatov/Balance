package com.balance.app.account;

import static org.junit.jupiter.api.Assertions.*;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.*;
import java.sql.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class SalaryReceiptMigrationTest {
 @Test void upgradeFrom17PreservesExistingWagesAndAppliedMigrations() throws Exception{
  var root=Files.createDirectories(Path.of("target","salary-upgrade-postgres"));
  try(var pg=EmbeddedPostgres.builder().setOverrideWorkingDirectory(root.toFile()).setDataDirectory(root.resolve("data-"+java.util.UUID.randomUUID())).setServerConfig("listen_addresses","127.0.0.1").setLocaleConfig("locale","C").start()){
   String url;
   try(var c=pg.getPostgresDatabase().getConnection();var s=c.createStatement()){
    s.execute("CREATE DATABASE salary_upgrade");url=c.getMetaData().getURL().replace("/postgres","/salary_upgrade");
   }
   var old=Flyway.configure().dataSource(url,"postgres","").target("17").load();old.migrate();String oldChecksums;
   try(var c=DriverManager.getConnection(url,"postgres","");var s=c.createStatement()){
    s.executeUpdate("insert into household_monthly_income(month,mine,ira,version) values('2026-12-01',1900,2000,4)");
    try(var r=s.executeQuery("select string_agg(version||':'||checksum::text,',' order by installed_rank) from flyway_schema_history")){r.next();oldChecksums=r.getString(1);}
   }
   var updated=Flyway.configure().dataSource(url,"postgres","").target("18").load();updated.migrate();updated.validate();assertEquals(18,updated.info().applied().length);
   try(var c=DriverManager.getConnection(url,"postgres","");var s=c.createStatement()){
    try(var r=s.executeQuery("select mine,ira,version,mine_receipt_date from household_monthly_income where month='2026-12-01'")){assertTrue(r.next());assertEquals("1900.00",r.getBigDecimal(1).toPlainString());assertEquals("2000.00",r.getBigDecimal(2).toPlainString());assertEquals(4,r.getLong(3));assertNull(r.getObject(4));}
    try(var r=s.executeQuery("select string_agg(version||':'||checksum::text,',' order by installed_rank) from flyway_schema_history where version::int<=17")){r.next();assertEquals(oldChecksums,r.getString(1));}
   }
  }
 }
}
