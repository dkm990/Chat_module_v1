package com.plans.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.plans.chat", "com.plans.auth"})
@EntityScan(basePackages = {"com.plans.chat.entity", "com.plans.auth.entity"})
@EnableJpaRepositories(basePackages = {"com.plans.chat.repo", "com.plans.auth.repo"})
public class ChatApplication {
    public static void main(String[] args) {
        SpringApplication.run(ChatApplication.class, args);
    }
}
