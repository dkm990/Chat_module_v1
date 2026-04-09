package com.plans.auth.repo;

import com.plans.auth.entity.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    @Query("""
        select u
        from User u
        where u.id <> :excludeId
          and (
            :q = ''
            or lower(coalesce(u.displayName, '')) like lower(concat('%', :q, '%'))
            or str(u.id) like concat('%', :q, '%')
          )
        order by u.displayName asc, u.createdAt desc
        """)
    List<User> searchUsers(@Param("q") String q, @Param("excludeId") UUID excludeId, Pageable pageable);
}
