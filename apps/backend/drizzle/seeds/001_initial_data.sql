-- 初期ユーザーデータ
-- Alice and Bob characters from cryptography and security protocols
-- Reference: https://en.wikipedia.org/wiki/Alice_and_Bob
-- Avatar images from PokeAPI sprites
INSERT INTO users (id, name, avatar_url, created_at) VALUES
  ('user-alice', 'Alice', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-bob', 'Bob', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-carol', 'Carol', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-dave', 'Dave', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-eve', 'Eve', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-frank', 'Frank', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-grace', 'Grace', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-heidi', 'Heidi', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-ivan', 'Ivan', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('user-judy', 'Judy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z');

-- サンプル会話
INSERT INTO conversations (id, type, name, created_at) VALUES
  ('conv-1', 'direct', NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('conv-2', 'group', 'General Discussion', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z');

-- 参加者
INSERT INTO participants (id, conversation_id, user_id, role, joined_at, left_at) VALUES
  ('part-1', 'conv-1', 'user-alice', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('part-2', 'conv-1', 'user-bob', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('part-3', 'conv-2', 'user-alice', 'admin', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('part-4', 'conv-2', 'user-bob', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL),
  ('part-5', 'conv-2', 'user-carol', 'member', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z', NULL);

-- サンプルメッセージ
INSERT INTO messages (id, conversation_id, sender_user_id, type, text, reply_to_message_id, system_event, created_at) VALUES
  ('msg-1', 'conv-1', 'user-alice', 'text', 'Hey Bob, how are you?', NULL, NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now', '-5 minutes') || 'Z'),
  ('msg-2', 'conv-1', 'user-bob', 'text', 'I''m doing great! Thanks for asking.', 'msg-1', NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now', '-3 minutes') || 'Z'),
  ('msg-3', 'conv-2', 'user-alice', 'system', NULL, NULL, 'join', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-10 minutes') || 'Z'),
  ('msg-4', 'conv-2', 'user-alice', 'text', 'Welcome to the general discussion!', NULL, NULL, strftime('%Y-%m-%dT%H:%M:%S', 'now', '-9 minutes') || 'Z');

-- リアクション
INSERT INTO reactions (id, message_id, user_id, emoji, created_at) VALUES
  ('react-1', 'msg-1', 'user-bob', '👍', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-4 minutes') || 'Z'),
  ('react-2', 'msg-4', 'user-bob', '🎉', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-8 minutes') || 'Z'),
  ('react-3', 'msg-4', 'user-carol', '👏', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-7 minutes') || 'Z');

-- 既読管理
INSERT INTO conversation_reads (id, conversation_id, user_id, last_read_message_id, updated_at) VALUES
  ('read-1', 'conv-1', 'user-alice', 'msg-2', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-2 minutes') || 'Z'),
  ('read-2', 'conv-1', 'user-bob', 'msg-2', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-1 minute') || 'Z');

-- ブックマーク
INSERT INTO message_bookmarks (id, message_id, user_id, created_at) VALUES
  ('bookmark-1', 'msg-1', 'user-bob', strftime('%Y-%m-%dT%H:%M:%S', 'now', '-3 minutes') || 'Z');
