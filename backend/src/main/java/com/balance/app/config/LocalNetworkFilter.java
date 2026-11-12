package com.balance.app.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnProperty(name="balance.lan.enabled",havingValue="true")
public class LocalNetworkFilter extends OncePerRequestFilter {
  private final IpAddressMatcher allowed;
  private final int port;
  public LocalNetworkFilter(@Value("${balance.lan.address}") String address,@Value("${balance.lan.port:8443}") int port,@Value("${balance.lan.allowed-subnet}") String subnet){
    if(subnet==null||!subnet.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}"))throw new IllegalStateException("An explicit private IPv4 subnet is required");
    var prefix=Integer.parseInt(subnet.substring(subnet.indexOf('/')+1));
    int minimum=subnet.startsWith("10.")||subnet.startsWith("127.")?8:subnet.matches("172\\.(1[6-9]|2[0-9]|3[01])\\..*")?12:subnet.startsWith("192.168.")?16:33;
    if(prefix<minimum||prefix>32)throw new IllegalStateException("Local subnet must not include public IPv4 addresses");
    allowed=new IpAddressMatcher(subnet);this.port=port;
    if(!allowed.matches(address))throw new IllegalStateException("HTTPS address must be inside the allowed subnet");
  }
  @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws IOException,ServletException{
    // The actual peer address is used; client-supplied Forwarded/X-Forwarded-For are ignored.
    if(request.isSecure()&&request.getLocalPort()==port&&!allowed.matches(request.getRemoteAddr())){
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);response.setContentType("text/plain;charset=UTF-8");response.getWriter().write("Balance is available only on the configured home subnet.");return;
    }
    chain.doFilter(request,response);
  }
}
