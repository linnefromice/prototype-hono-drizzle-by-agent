-- 初期ユーザーデータ
-- Alice and Bob characters from cryptography and security protocols
-- Reference: https://en.wikipedia.org/wiki/Alice_and_Bob
-- Avatar images from PokeAPI sprites
INSERT INTO users (id, name, avatar_url, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Alice', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bob', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Carol', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Dave', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Eve', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Frank', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Grace', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Heidi', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Ivan', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Judy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Kevin', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Laura', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Michael', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440014', 'Nancy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/35.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440015', 'Oscar', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440016', 'Peggy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/113.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440017', 'Quinn', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440018', 'Rachel', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/148.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440019', 'Steve', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440020', 'Tina', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/196.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z');

-- サンプル会話
INSERT INTO conversations (id, type, name, created_at) VALUES
  ('6ba7b810-9dad-11d1-80b4-00c04fd43001', 'direct', NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('6ba7b810-9dad-11d1-80b4-00c04fd43002', 'group', 'General Discussion', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z');

-- 参加者
INSERT INTO participants (id, conversation_id, user_id, role, joined_at, left_at) VALUES
  ('7c9e6679-7425-40de-944b-e07fc1f90001', '6ba7b810-9dad-11d1-80b4-00c04fd43001', '550e8400-e29b-41d4-a716-446655440001', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('7c9e6679-7425-40de-944b-e07fc1f90002', '6ba7b810-9dad-11d1-80b4-00c04fd43001', '550e8400-e29b-41d4-a716-446655440002', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('7c9e6679-7425-40de-944b-e07fc1f90003', '6ba7b810-9dad-11d1-80b4-00c04fd43002', '550e8400-e29b-41d4-a716-446655440001', 'admin', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('7c9e6679-7425-40de-944b-e07fc1f90004', '6ba7b810-9dad-11d1-80b4-00c04fd43002', '550e8400-e29b-41d4-a716-446655440002', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('7c9e6679-7425-40de-944b-e07fc1f90005', '6ba7b810-9dad-11d1-80b4-00c04fd43002', '550e8400-e29b-41d4-a716-446655440003', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL);

-- サンプルメッセージ
INSERT INTO messages (id, conversation_id, sender_user_id, type, text, reply_to_message_id, system_event, created_at) VALUES
  ('8f14e45f-ceea-467a-9b87-9090dcbf0001', '6ba7b810-9dad-11d1-80b4-00c04fd43001', '550e8400-e29b-41d4-a716-446655440001', 'text', 'Hey Bob, how are you?', NULL, NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now', '-5 minutes') || 'Z'),
  ('8f14e45f-ceea-467a-9b87-9090dcbf0002', '6ba7b810-9dad-11d1-80b4-00c04fd43001', '550e8400-e29b-41d4-a716-446655440002', 'text', 'I''m doing great! Thanks for asking.', '8f14e45f-ceea-467a-9b87-9090dcbf0001', NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now', '-3 minutes') || 'Z'),
  ('8f14e45f-ceea-467a-9b87-9090dcbf0003', '6ba7b810-9dad-11d1-80b4-00c04fd43002', '550e8400-e29b-41d4-a716-446655440001', 'system', NULL, NULL, 'join', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-10 minutes') || 'Z'),
  ('8f14e45f-ceea-467a-9b87-9090dcbf0004', '6ba7b810-9dad-11d1-80b4-00c04fd43002', '550e8400-e29b-41d4-a716-446655440001', 'text', 'Welcome to the general discussion!', NULL, NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now', '-9 minutes') || 'Z');

-- リアクション
INSERT INTO reactions (id, message_id, user_id, emoji, created_at) VALUES
  ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dc001', '8f14e45f-ceea-467a-9b87-9090dcbf0001', '550e8400-e29b-41d4-a716-446655440002', '👍', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-4 minutes') || 'Z'),
  ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dc002', '8f14e45f-ceea-467a-9b87-9090dcbf0004', '550e8400-e29b-41d4-a716-446655440002', '🎉', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-8 minutes') || 'Z'),
  ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dc003', '8f14e45f-ceea-467a-9b87-9090dcbf0004', '550e8400-e29b-41d4-a716-446655440003', '👏', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-7 minutes') || 'Z');

-- 既読管理
INSERT INTO conversation_reads (id, conversation_id, user_id, last_read_message_id, updated_at) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c01', '6ba7b810-9dad-11d1-80b4-00c04fd43001', '550e8400-e29b-41d4-a716-446655440001', '8f14e45f-ceea-467a-9b87-9090dcbf0002', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-2 minutes') || 'Z'),
  ('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c02', '6ba7b810-9dad-11d1-80b4-00c04fd43001', '550e8400-e29b-41d4-a716-446655440002', '8f14e45f-ceea-467a-9b87-9090dcbf0002', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-1 minute') || 'Z');

-- ブックマーク
INSERT INTO message_bookmarks (id, message_id, user_id, created_at) VALUES
  ('b2c3d4e5-f6a7-5b6c-9d8e-0f1a2b3c4d01', '8f14e45f-ceea-467a-9b87-9090dcbf0001', '550e8400-e29b-41d4-a716-446655440002', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-3 minutes') || 'Z');
