package com.balance.app.config;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;

class LocalNetworkFilterTest {
  @Test void privatePeerIsAllowedButExternalPeerCannotSpoofForwardingHeaders()throws Exception{
    var filter=new LocalNetworkFilter("192.168.50.35",8443,"192.168.50.0/24");
    var request=new MockHttpServletRequest();request.setSecure(true);request.setLocalPort(8443);request.setRemoteAddr("192.168.50.44");var response=new MockHttpServletResponse();var chain=new MockFilterChain();filter.doFilter(request,response,chain);assertNotNull(chain.getRequest());
    var external=new MockHttpServletRequest();external.setSecure(true);external.setLocalPort(8443);external.setRemoteAddr("203.0.113.7");external.addHeader("X-Forwarded-For","192.168.50.44");external.addHeader("Forwarded","for=192.168.50.44;proto=https");var rejected=new MockHttpServletResponse();var blocked=new MockFilterChain();filter.doFilter(external,rejected,blocked);assertEquals(403,rejected.getStatus());assertNull(blocked.getRequest());
  }
  @Test void localDesktopConnectorKeepsItsExistingBehavior()throws Exception{
    var filter=new LocalNetworkFilter("192.168.50.35",8443,"192.168.50.0/24");var request=new MockHttpServletRequest();request.setLocalPort(8080);request.setRemoteAddr("127.0.0.1");var chain=new MockFilterChain();filter.doFilter(request,new MockHttpServletResponse(),chain);assertNotNull(chain.getRequest());
  }
  @Test void wildcardPublicAndWrongSubnetsAreRefused(){
    for(var subnet:new String[]{"0.0.0.0/0","192.0.0.0/8","192.168.50.0/8","10.0.0.0/8","*"})assertThrows(IllegalStateException.class,()->new LocalNetworkFilter("192.168.50.35",8443,subnet));
  }
}
