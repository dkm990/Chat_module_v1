create table if not exists chat_room (
    id uuid primary key,
    type varchar(16) not null,
    title varchar(255) not null,
    event_id uuid null,
    venue_id uuid null,
    direct_user_low uuid null,
    direct_user_high uuid null,
    last_message_id uuid null,
    last_message_at timestamp null,
    type_version smallint not null default 1,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table if not exists chat_room_member (
    chat_id uuid not null references chat_room(id),
    user_id uuid not null,
    role varchar(16) not null,
    joined_at timestamp not null,
    left_at timestamp null,
    active boolean not null default true,
    last_seen_at timestamp null,
    primary key (chat_id, user_id)
);

create table if not exists message (
    id uuid primary key,
    chat_id uuid not null references chat_room(id),
    sender_id uuid null,
    type varchar(16) not null,
    body_json jsonb not null,
    client_generated_id uuid null,
    deleted_at timestamp null,
    edited_at timestamp null,
    created_at timestamp not null
);

create table if not exists message_attachment (
    id uuid primary key,
    message_id uuid not null references message(id),
    kind varchar(16) not null,
    storage_key varchar(500) not null,
    public_url varchar(1000) null,
    mime_type varchar(255) not null,
    size_bytes bigint not null,
    width integer null,
    height integer null,
    duration_sec integer null
);

create table if not exists message_read_state (
    chat_id uuid not null references chat_room(id),
    user_id uuid not null,
    last_read_message_id uuid null,
    updated_at timestamp not null,
    primary key (chat_id, user_id),
    unique (chat_id, user_id)
);

create table if not exists invitation (
    id uuid primary key,
    chat_id uuid not null references chat_room(id),
    invited_user_id uuid not null,
    invited_by uuid not null,
    status varchar(16) not null,
    created_at timestamp not null
);
comment on table invitation is 'reserved for future invitations feature';

create table if not exists auth_user (
    id uuid primary key,
    display_name varchar(255) null,
    avatar_url varchar(1000) null,
    created_at timestamp not null
);

create table if not exists auth_identity (
    id uuid primary key,
    user_id uuid not null references auth_user(id),
    provider varchar(16) not null,
    provider_user_id varchar(255) not null,
    email varchar(320) null,
    telegram_username varchar(255) null,
    created_at timestamp not null,
    unique (provider, provider_user_id)
);

create index if not exists idx_message_chat_created_id_desc
    on message(chat_id, created_at desc, id desc);
create index if not exists idx_message_chat_id_desc
    on message(chat_id, id desc);
create index if not exists idx_chat_room_last_message_at_desc
    on chat_room(last_message_at desc);
create index if not exists idx_chat_room_member_user_active
    on chat_room_member(user_id, active);
create index if not exists idx_message_read_state_chat_user
    on message_read_state(chat_id, user_id);

create unique index if not exists uq_direct_chat_pair
    on chat_room(direct_user_low, direct_user_high)
    where type = 'DIRECT' and direct_user_low is not null and direct_user_high is not null;

create unique index if not exists uq_event_chat_per_event
    on chat_room(event_id) where type = 'EVENT' and event_id is not null;

create unique index if not exists uq_venue_chat_per_venue
    on chat_room(venue_id) where type = 'VENUE' and venue_id is not null;
