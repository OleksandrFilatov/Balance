package com.balance.app.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.nio.file.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LocalNetworkCertificateControllerTest {
  @Test void exposesOnlyTheTwoPublicEnrollmentFiles()throws Exception{
    var directory=Files.createDirectories(Path.of("target","public-certificate-tests",UUID.randomUUID().toString()));Files.writeString(directory.resolve("balance-local-ca.cer"),"public-certificate");Files.writeString(directory.resolve("balance-iphone.mobileconfig"),"public-profile");Files.writeString(directory.resolve("balance-server.p12"),"must-never-be-published");
    var mvc=MockMvcBuilders.standaloneSetup(new LocalNetworkCertificateController(directory.toString())).build();
    mvc.perform(get("/assets/balance-local-ca.cer")).andExpect(status().isOk()).andExpect(content().string("public-certificate")).andExpect(header().string("Cache-Control","no-store"));
    mvc.perform(get("/assets/balance-iphone.mobileconfig")).andExpect(status().isOk()).andExpect(content().contentType("application/x-apple-aspen-config"));
    mvc.perform(get("/assets/balance-server.p12")).andExpect(status().isNotFound());
  }
  @Test void missingPublicFileIsReportedWithoutServingOtherPaths()throws Exception{
    var mvc=MockMvcBuilders.standaloneSetup(new LocalNetworkCertificateController(Path.of("target","absent-public-certificates-"+UUID.randomUUID()).toString())).build();
    mvc.perform(get("/assets/balance-local-ca.cer")).andExpect(status().isNotFound());
  }
}
