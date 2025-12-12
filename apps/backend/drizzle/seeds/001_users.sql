-- Initial user data for D1 environments
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
