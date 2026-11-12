package com.balance.app.config;

import java.net.*;
import java.nio.file.*;
import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import org.apache.catalina.connector.Connector;
import org.apache.tomcat.util.net.SSLHostConfig;
import org.apache.tomcat.util.net.SSLHostConfigCertificate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.*;

/** Optional TLS listener on one explicit private interface; the default listener stays loopback. */
@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="balance.lan.enabled",havingValue="true")
public class LocalNetworkConfiguration {
  @Bean
  WebServerFactoryCustomizer<TomcatServletWebServerFactory> localNetworkConnector(
      @Value("${balance.lan.address}") String address,
      @Value("${balance.lan.port:8443}") int port,
      @Value("${balance.lan.key-store}") String store,
      @Value("${balance.lan.key-store-password}") String password) {
    var connector=createConnector(address,port,Path.of(store),password);
    return factory->factory.addAdditionalConnectors(connector);
  }

  static Connector createConnector(String address,int port,Path store,String password) {
    validateAddress(address);
    if(port!=0&&(port<1024||port>65535))throw new IllegalStateException("Invalid local HTTPS port");
    if(port==0&&!address.startsWith("127."))throw new IllegalStateException("An explicit local HTTPS port is required");
    if(password==null||password.length()<24)throw new IllegalStateException("Protected local TLS credentials are required");
    if(!Files.isRegularFile(store))throw new IllegalStateException("Local TLS key store is missing");
    char[] secret=password.toCharArray();
    try {
      var keys=KeyStore.getInstance("PKCS12");
      try(var input=Files.newInputStream(store)){keys.load(input,secret);}
      var certificate=(X509Certificate)keys.getCertificate("balance-server");
      if(certificate==null||!keys.isKeyEntry("balance-server"))throw new IllegalStateException("Local TLS server identity is missing");
      certificate.checkValidity();
      var names=certificate.getSubjectAlternativeNames();
      if(names==null||names.stream().noneMatch(n->Integer.valueOf(7).equals(n.getFirst())&&address.equals(n.get(1))))throw new IllegalStateException("Local TLS certificate does not match the selected IP address");
      var tls=new SSLHostConfig();tls.setProtocols("TLSv1.2,TLSv1.3");
      var identity=new SSLHostConfigCertificate(tls,SSLHostConfigCertificate.Type.RSA);
      identity.setCertificateKeystore(keys);identity.setCertificateKeyAlias("balance-server");identity.setCertificateKeyPassword(password);tls.addCertificate(identity);
      var connector=new Connector("org.apache.coyote.http11.Http11NioProtocol");
      connector.setPort(port);connector.setScheme("https");connector.setSecure(true);
      connector.setProperty("address",address);connector.setProperty("SSLEnabled","true");connector.addSslHostConfig(tls);
      return connector;
    } catch(Exception error) {
      // Do not include the underlying key-store exception or credentials in logs/API responses.
      throw new IllegalStateException("Cannot initialize local HTTPS. Check certificate, address and protected credentials.");
    } finally {Arrays.fill(secret,'\0');}
  }

  static void validateAddress(String value) {
    if(value==null||!value.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}"))throw new IllegalStateException("Use one explicit private IPv4 address");
    try {
      var address=InetAddress.getByName(value);
      if(!address.isLoopbackAddress()&&!address.isSiteLocalAddress()||NetworkInterface.getByInetAddress(address)==null)throw new IllegalStateException("HTTPS address must belong to this computer's private network");
    } catch(java.io.IOException error){throw new IllegalStateException("Private network interface is unavailable");}
  }
}
