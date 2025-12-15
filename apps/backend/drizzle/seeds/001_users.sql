-- Initial user data for D1 environments
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
  ('550e8400-e29b-41d4-a716-446655440010', 'Judy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z');
