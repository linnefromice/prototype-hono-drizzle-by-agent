-- Initial user data for D1 environments
-- Alice and Bob characters from cryptography and security protocols
-- Reference: https://en.wikipedia.org/wiki/Alice_and_Bob
-- Avatar images from PokeAPI sprites

INSERT INTO users (id, id_alias, name, avatar_url, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'alice', 'Alice', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440002', 'bob', 'Bob', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440003', 'carol', 'Carol', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440004', 'dave', 'Dave', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440005', 'eve', 'Eve', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440006', 'frank', 'Frank', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440007', 'grace', 'Grace', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440008', 'heidi', 'Heidi', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440009', 'ivan', 'Ivan', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440010', 'judy', 'Judy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440011', 'kevin', 'Kevin', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440012', 'laura', 'Laura', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440013', 'michael', 'Michael', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440014', 'nancy', 'Nancy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/35.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440015', 'oscar', 'Oscar', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440016', 'peggy', 'Peggy', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/113.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440017', 'quinn', 'Quinn', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440018', 'rachel', 'Rachel', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/148.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440019', 'steve', 'Steve', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
  ('550e8400-e29b-41d4-a716-446655440020', 'tina', 'Tina', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/196.png', strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z');
