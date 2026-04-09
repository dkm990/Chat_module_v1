package com.plans.chat.realtime;

import com.plans.auth.JwtService;
import io.jsonwebtoken.Claims;
import java.security.Principal;
import java.util.Map;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class WebSocketPrincipalChannelInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;

    public WebSocketPrincipalChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            Map<String, Object> attrs = accessor.getSessionAttributes();
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                Claims claims = jwtService.parse(authHeader.substring(7));
                accessor.setUser((Principal) claims::getSubject);
                return message;
            }
            if (attrs != null && attrs.get("userId") != null) {
                String userId = String.valueOf(attrs.get("userId"));
                accessor.setUser((Principal) () -> userId);
            }
        }
        return message;
    }
}
