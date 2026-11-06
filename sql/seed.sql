BEGIN;
INSERT INTO authors(name, email, bio) VALUES
 ('Ana Pérez', 'ana@example.com', 'Desarrolladora backend'),
 ('Juan López', 'juan@example.com', 'Estudiante de programación')
ON CONFLICT DO NOTHING;
INSERT INTO posts(author_id, title, content, published)
SELECT id, 'Bienvenidos a MiniBlog', 'Este es nuestro primer post.', TRUE FROM authors a
WHERE email = 'ana@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE author_id = a.id AND title = 'Bienvenidos a MiniBlog');
INSERT INTO comments(post_id, author_id, content)
SELECT p.id, a.id, '¡Muy buen comienzo!' FROM posts p CROSS JOIN authors a
WHERE p.title = 'Bienvenidos a MiniBlog' AND a.email = 'juan@example.com'
AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id=p.id AND c.author_id=a.id AND c.content='¡Muy buen comienzo!');
COMMIT;
