-- Initial user data for D1 environments
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
