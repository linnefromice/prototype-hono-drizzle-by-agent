-- 初期ユーザーデータ
-- Alice and Bob characters from cryptography and security protocols
-- Reference: https://en.wikipedia.org/wiki/Alice_and_Bob
-- Avatar images from PokeAPI sprites
INSERT INTO users (id, name, avatar_url, created_at) VALUES
  ('user-alice', 'Alice', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', datetime('now')),
  ('user-bob', 'Bob', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', datetime('now')),
  ('user-carol', 'Carol', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', datetime('now')),
  ('user-dave', 'Dave', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', datetime('now')),
  ('user-eve', 'Eve', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png', datetime('now')),
  ('user-frank', 'Frank', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png', datetime('now')),
  ('user-grace', 'Grace', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', datetime('now')),
  ('user-heidi', 'Heidi', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png', datetime('now')),
  ('user-ivan', 'Ivan', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', datetime('now')),
  ('user-judy', 'Judy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png', datetime('now'));

-- サンプル会話
INSERT INTO conversations (id, type, name, created_at) VALUES
  ('conv-1', 'direct', NULL, datetime('now')),
  ('conv-2', 'group', 'General Discussion', datetime('now'));

-- 参加者
INSERT INTO participants (id, conversation_id, user_id, role, joined_at, left_at) VALUES
  ('part-1', 'conv-1', 'user-alice', 'member', datetime('now'), NULL),
  ('part-2', 'conv-1', 'user-bob', 'member', datetime('now'), NULL),
  ('part-3', 'conv-2', 'user-alice', 'admin', datetime('now'), NULL),
  ('part-4', 'conv-2', 'user-bob', 'member', datetime('now'), NULL),
  ('part-5', 'conv-2', 'user-carol', 'member', datetime('now'), NULL);

-- サンプルメッセージ
INSERT INTO messages (id, conversation_id, sender_user_id, type, text, reply_to_message_id, system_event, created_at) VALUES
  ('msg-1', 'conv-1', 'user-alice', 'text', 'Hey Bob, how are you?', NULL, NULL, datetime('now', '-5 minutes')),
  ('msg-2', 'conv-1', 'user-bob', 'text', 'I''m doing great! Thanks for asking.', 'msg-1', NULL, datetime('now', '-3 minutes')),
  ('msg-3', 'conv-2', 'user-alice', 'system', NULL, NULL, 'join', datetime('now', '-10 minutes')),
  ('msg-4', 'conv-2', 'user-alice', 'text', 'Welcome to the general discussion!', NULL, NULL, datetime('now', '-9 minutes'));

-- リアクション
INSERT INTO reactions (id, message_id, user_id, emoji, created_at) VALUES
  ('react-1', 'msg-1', 'user-bob', '👍', datetime('now', '-4 minutes')),
  ('react-2', 'msg-4', 'user-bob', '🎉', datetime('now', '-8 minutes')),
  ('react-3', 'msg-4', 'user-carol', '👏', datetime('now', '-7 minutes'));

-- 既読管理
INSERT INTO conversation_reads (id, conversation_id, user_id, last_read_message_id, updated_at) VALUES
  ('read-1', 'conv-1', 'user-alice', 'msg-2', datetime('now', '-2 minutes')),
  ('read-2', 'conv-1', 'user-bob', 'msg-2', datetime('now', '-1 minute'));

-- ブックマーク
INSERT INTO message_bookmarks (id, message_id, user_id, created_at) VALUES
  ('bookmark-1', 'msg-1', 'user-bob', datetime('now', '-3 minutes'));
