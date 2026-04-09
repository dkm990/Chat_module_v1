package com.plans.chat.realtime;

import com.plans.auth.JwtService;
import io.jsonwebtoken.Claims;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
public class WebSocketAuthHandshakeInterceptor implements HandshakeInterceptor {
    private final JwtService jwtService;

    public WebSocketAuthHandshakeInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean beforeHandshake(
        ServerHttpRequest request,
        ServerHttpResponse response,
        WebSocketHandler wsHandler,
        Map<String, Object> attributes
    ) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String auth = servletRequest.getServletRequest().getHeader("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                Claims claims = jwtService.parse(auth.substring(7));
                attributes.put("userId", claims.getSubject());
            }
        }
        return true;
    }

    @Override
    public void afterHandshake(
        ServerHttpRequest request,
        ServerHttpResponse response,
        WebSocketHandler wsHandler,
        Exception exception
    ) {
    }
}
