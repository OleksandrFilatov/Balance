package com.balance.app.config;

import static org.junit.jupiter.api.Assertions.*;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.security.*;
import java.time.Duration;
import javax.net.ssl.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServer;

class LocalNetworkConfigurationTest {
  static final String PASSWORD="isolated-local-https-tests-only-12345";
  static Path directory,store;
  static WebServer server;
  static org.apache.catalina.connector.Connector connector;
  static HttpClient trusted;

  @BeforeAll static void start() throws Exception {
    directory=Files.createDirectories(Path.of("target","local-https-tests",java.util.UUID.randomUUID().toString()));store=directory.resolve("server.p12");
    String keytool=Path.of(System.getProperty("java.home"),"bin",System.getProperty("os.name").startsWith("Windows")?"keytool.exe":"keytool").toString();
    var generator=new ProcessBuilder(keytool,"-genkeypair","-alias","balance-server","-keyalg","RSA","-keysize","2048","-validity","2","-dname","CN=Isolated Balance Test","-ext","SAN=IP:127.0.0.1","-ext","EKU=serverAuth","-keystore",store.toString(),"-storetype","PKCS12","-storepass:env","BALANCE_TEST_TLS_PASSWORD");
    generator.environment().put("BALANCE_TEST_TLS_PASSWORD",PASSWORD);generator.redirectErrorStream(true);var process=generator.start();process.getInputStream().transferTo(java.io.OutputStream.nullOutputStream());assertEquals(0,process.waitFor());
    connector=LocalNetworkConfiguration.createConnector("127.0.0.1",0,store,PASSWORD);
    var factory=new TomcatServletWebServerFactory(0);factory.setAddress(InetAddress.getByName("127.0.0.1"));factory.setBaseDirectory(directory.resolve("tomcat").toFile());factory.addAdditionalConnectors(connector);
    server=factory.getWebServer(context->context.addServlet("secure-test",new jakarta.servlet.http.HttpServlet(){
      @Override protected void doGet(jakarta.servlet.http.HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response)throws java.io.IOException{response.setContentType("application/json");response.getWriter().write("{\"secure\":"+request.isSecure()+"}");}
    }).addMapping("/*"));server.start();
    var keys=KeyStore.getInstance("PKCS12");try(var input=Files.newInputStream(store)){keys.load(input,PASSWORD.toCharArray());}
    var manager=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());manager.init(keys);var ssl=SSLContext.getInstance("TLS");ssl.init(null,manager.getTrustManagers(),null);
    trusted=HttpClient.newBuilder().sslContext(ssl).connectTimeout(Duration.ofSeconds(5)).build();
  }
  @AfterAll static void stop(){if(server!=null)server.stop();}

  @Test void validHttpsUsesRealCertificateValidationAndPreservesLocalHttp()throws Exception{
    var tls=trusted.send(HttpRequest.newBuilder(URI.create("https://127.0.0.1:"+connector.getLocalPort()+"/")).GET().build(),HttpResponse.BodyHandlers.ofString());assertEquals(200,tls.statusCode());assertEquals("{\"secure\":true}",tls.body());assertTrue(tls.sslSession().orElseThrow().getProtocol().startsWith("TLSv1."));
    var local=trusted.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+server.getPort()+"/")).GET().build(),HttpResponse.BodyHandlers.ofString());assertEquals("{\"secure\":false}",local.body());
  }
  @Test void untrustedCertificateIsRejected() {
    assertThrows(SSLHandshakeException.class,()->HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("https://127.0.0.1:"+connector.getLocalPort()+"/")).GET().build(),HttpResponse.BodyHandlers.ofString()));
  }
  @Test void cannotOpenWildcardPublicOrUnassignedAddresses(){
    for(var address:new String[]{"0.0.0.0","::","8.8.8.8","example.com","192.0.2.1"})assertThrows(IllegalStateException.class,()->LocalNetworkConfiguration.validateAddress(address));
  }
  @Test void missingOrWrongCredentialsNeverFallBackToPlainHttp(){
    assertThrows(IllegalStateException.class,()->LocalNetworkConfiguration.createConnector("127.0.0.1",0,store,"short"));
    var error=assertThrows(IllegalStateException.class,()->LocalNetworkConfiguration.createConnector("127.0.0.1",0,store,PASSWORD+"-wrong"));assertFalse(error.getMessage().contains(PASSWORD));
    assertThrows(IllegalStateException.class,()->LocalNetworkConfiguration.createConnector("127.0.0.1",0,directory.resolve("missing.p12"),PASSWORD));
  }
  @Test void onlyModernTlsIsConfigured(){
    var protocols=connector.findSslHostConfigs()[0].getProtocols();assertTrue(protocols.contains("TLSv1.2"));assertTrue(protocols.contains("TLSv1.3"));assertFalse(protocols.contains("TLSv1"));assertFalse(protocols.contains("TLSv1.1"));assertTrue(connector.getSecure());assertEquals("https",connector.getScheme());
  }
}
