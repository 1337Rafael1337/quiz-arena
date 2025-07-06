-- Insert default categories
INSERT INTO question_categories (name, description, color) VALUES
('Geographie', 'Länder, Städte, Kontinente', '#e74c3c'),
('Geschichte', 'Historische Ereignisse', '#9b59b6'),
('Wissenschaft', 'Physik, Chemie, Biologie', '#3498db'),
('Sport', 'Fußball, Olympia, etc.', '#e67e22'),
('Unterhaltung', 'Filme, Musik, TV', '#f39c12'),
('Allgemeinwissen', 'Verschiedenes', '#27ae60')
ON CONFLICT DO NOTHING;