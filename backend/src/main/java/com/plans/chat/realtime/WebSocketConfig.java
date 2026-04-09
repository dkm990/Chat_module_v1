package com.plans.chat.realtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketAuthHandshakeInterceptor authInterceptor;
    private final WebSocketPrincipalChannelInterceptor principalChannelInterceptor;
    private final String[] allowedOrigins;

    public WebSocketConfig(
        WebSocketAuthHandshakeInterceptor authInterceptor,
        WebSocketPrincipalChannelInterceptor principalChannelInterceptor,
        @Value("${app.websocket.allowed-origins}") String allowedOrigins
    ) {
        this.authInterceptor = authInterceptor;
        this.principalChannelInterceptor = principalChannelInterceptor;
        this.allowedOrigins = parseAllowedOrigins(allowedOrigins);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").addInterceptors(authInterceptor).setAllowedOrigins(allowedOrigins);
        registry.addEndpoint("/ws").addInterceptors(authInterceptor).setAllowedOrigins(allowedOrigins).withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(principalChannelInterceptor);
    }

    private static String[] parseAllowedOrigins(String rawOrigins) {
        return rawOrigins == null
            ? new String[0]
            : rawOrigins.lines()
                .flatMap(line -> java.util.Arrays.stream(line.split(",")))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .distinct()
                .toArray(String[]::new);
    }
}
