package com.balance.app.config;

import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Only the public root certificate/profile can be downloaded, never a directory or key store. */
@RestController
@ConditionalOnProperty(name="balance.lan.enabled",havingValue="true")
public class LocalNetworkCertificateController {
  private final Path directory;
  public LocalNetworkCertificateController(@Value("${balance.lan.public-directory}") String directory){this.directory=Path.of(directory).toAbsolutePath().normalize();}
  @GetMapping("/assets/balance-local-ca.cer")
  public ResponseEntity<Resource> certificate(){return download("balance-local-ca.cer","application/x-x509-ca-cert");}
  @GetMapping("/assets/balance-iphone.mobileconfig")
  public ResponseEntity<Resource> profile(){return download("balance-iphone.mobileconfig","application/x-apple-aspen-config");}
  private ResponseEntity<Resource> download(String name,String type){
    Path file=directory.resolve(name);
    if(!Files.isRegularFile(file))return ResponseEntity.notFound().build();
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+name+"\"").contentType(MediaType.parseMediaType(type)).body(new FileSystemResource(file));
  }
}
