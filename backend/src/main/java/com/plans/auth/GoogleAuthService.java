package com.plans.auth;

import com.plans.auth.entity.AuthIdentity;
import com.plans.auth.entity.AuthProvider;
import com.plans.auth.entity.User;
import com.plans.auth.repo.AuthIdentityRepository;
import com.plans.auth.repo.UserRepository;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class GoogleAuthService {
    private final AuthIdentityRepository identityRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final WebClient webClient;
    private final String clientId;
    private final String jwkUri;

    public GoogleAuthService(
        AuthIdentityRepository identityRepository,
        UserRepository userRepository,
        JwtService jwtService,
        @Value("${app.auth.google.client-id:}") String clientId,
        @Value("${app.auth.google.jwk-uri:https://www.googleapis.com/oauth2/v3/certs}") String jwkUri
    ) {
        this.identityRepository = identityRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.webClient = WebClient.builder().build();
        this.clientId = clientId;
        this.jwkUri = jwkUri;
    }

    public String authenticate(String idToken) {
        JWTClaimsSet claims = verifyIdToken(idToken);
        String sub = claims.getSubject();
        String aud = claims.getAudience() == null || claims.getAudience().isEmpty() ? null : claims.getAudience().get(0);
        String iss = claims.getIssuer();
        Date expAt = claims.getExpirationTime();

        if (sub == null || sub.isBlank()) {
            throw new IllegalArgumentException("Missing subject");
        }
        if (!clientId.isBlank() && !clientId.equals(aud)) {
            throw new IllegalArgumentException("Invalid audience");
        }
        if (!("accounts.google.com".equals(iss) || "https://accounts.google.com".equals(iss))) {
            throw new IllegalArgumentException("Invalid issuer");
        }
        if (expAt == null || Instant.now().isAfter(expAt.toInstant())) {
            throw new IllegalArgumentException("Token expired");
        }

        AuthIdentity identity = identityRepository.findByProviderAndProviderUserId(AuthProvider.GOOGLE, sub)
            .orElseGet(() -> {
                User user = new User();
                user.setId(UUID.randomUUID());
                user.setDisplayName(asString(claims.getClaim("name")));
                user.setAvatarUrl(asString(claims.getClaim("picture")));
                user.setCreatedAt(Instant.now());
                userRepository.save(user);

                AuthIdentity created = new AuthIdentity();
                created.setId(UUID.randomUUID());
                created.setUserId(user.getId());
                created.setProvider(AuthProvider.GOOGLE);
                created.setProviderUserId(sub);
                created.setEmail(asString(claims.getClaim("email")));
                created.setCreatedAt(Instant.now());
                return identityRepository.save(created);
            });

        User user = userRepository.findById(identity.getUserId()).orElseThrow();
        return jwtService.issue(user.getId(), user.getDisplayName());
    }

    private JWTClaimsSet verifyIdToken(String idToken) {
        try {
            SignedJWT jwt = SignedJWT.parse(idToken);
            if (!JWSAlgorithm.RS256.equals(jwt.getHeader().getAlgorithm())) {
                throw new IllegalArgumentException("Unsupported google token algorithm");
            }
            String kid = jwt.getHeader().getKeyID();
            if (kid == null || kid.isBlank()) {
                throw new IllegalArgumentException("Missing key id");
            }
            String jwkJson = webClient.get().uri(jwkUri).retrieve().bodyToMono(String.class).block();
            JWKSet jwkSet = JWKSet.parse(jwkJson);
            JWK key = jwkSet.getKeyByKeyId(kid);
            if (!(key instanceof RSAKey rsaKey)) {
                throw new IllegalArgumentException("Signing key not found");
            }
            if (!jwt.verify(new RSASSAVerifier(rsaKey.toRSAPublicKey()))) {
                throw new IllegalArgumentException("Invalid Google token signature");
            }
            return jwt.getJWTClaimsSet();
        } catch (JOSEException | java.text.ParseException ex) {
            throw new IllegalArgumentException("Invalid Google token", ex);
        }
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
