package com.plans.chat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    private final String rootPath;
    private final String[] allowedOrigins;

    public WebMvcConfig(
        @Value("${app.storage.root-path}") String rootPath,
        @Value("${app.cors.allowed-origins}") String allowedOrigins
    ) {
        this.rootPath = rootPath;
        this.allowedOrigins = parseAllowedOrigins(allowedOrigins);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/chat/**")
            .addResourceLocations(
                "file:" + rootPath + "/",
                "file:" + rootPath + "/chat/"
            );
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations("file:" + rootPath + "/");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("*")
            .allowedHeaders("*");
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
