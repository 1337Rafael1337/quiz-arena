-- Antworten für die Beispiel-Fragen

-- Geographie Frage 1: Hauptstadt Australien
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(1, 'Sydney', false, 1),
(1, 'Melbourne', false, 2),
(1, 'Canberra', true, 3),
(1, 'Perth', false, 4)
ON CONFLICT DO NOTHING;

-- Geographie Frage 2: Längster Fluss
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(2, 'Amazonas', false, 1),
(2, 'Nil', true, 2),
(2, 'Mississippi', false, 3),
(2, 'Jangtse', false, 4)
ON CONFLICT DO NOTHING;

-- Geographie Frage 3: Sahara
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(3, 'Afrika', true, 1),
(3, 'Asien', false, 2),
(3, 'Australien', false, 3),
(3, 'Südamerika', false, 4)
ON CONFLICT DO NOTHING;

-- Geographie Frage 4: Meiste Zeitzonen
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(4, 'USA', false, 1),
(4, 'Russland', false, 2),
(4, 'Frankreich', true, 3),
(4, 'China', false, 4)
ON CONFLICT DO NOTHING;

-- Geographie Frage 5: Höchster Berg
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(5, 'K2', false, 1),
(5, 'Mount Everest', true, 2),
(5, 'Kangchendzönga', false, 3),
(5, 'Lhotse', false, 4)
ON CONFLICT DO NOTHING;

-- Geschichte Frage 6: Berliner Mauer
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(6, '1987', false, 1),
(6, '1989', true, 2),
(6, '1991', false, 3),
(6, '1990', false, 4)
ON CONFLICT DO NOTHING;

-- Geschichte Frage 7: Erster römischer Kaiser
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(7, 'Julius Caesar', false, 1),
(7, 'Augustus', true, 2),
(7, 'Nero', false, 3),
(7, 'Trajan', false, 4)
ON CONFLICT DO NOTHING;

-- Geschichte Frage 8: Erster Weltkrieg
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(8, 'Erster Weltkrieg', true, 1),
(8, 'Zweiter Weltkrieg', false, 2),
(8, 'Napoleonische Kriege', false, 3),
(8, 'Dreißigjähriger Krieg', false, 4)
ON CONFLICT DO NOTHING;

-- Geschichte Frage 9: Kolumbus
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(9, '1490', false, 1),
(9, '1492', true, 2),
(9, '1494', false, 3),
(9, '1496', false, 4)
ON CONFLICT DO NOTHING;

-- Geschichte Frage 10: Hundertjähriger Krieg
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(10, '100 Jahre', false, 1),
(10, '116 Jahre', true, 2),
(10, '99 Jahre', false, 3),
(10, '120 Jahre', false, 4)
ON CONFLICT DO NOTHING;

-- Wissenschaft Frage 11: Sauerstoff
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(11, 'Sauerstoff', true, 1),
(11, 'Osmium', false, 2),
(11, 'Gold', false, 3),
(11, 'Silber', false, 4)
ON CONFLICT DO NOTHING;

-- Wissenschaft Frage 12: Knochen
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(12, '206', true, 1),
(12, '208', false, 2),
(12, '204', false, 3),
(12, '210', false, 4)
ON CONFLICT DO NOTHING;

-- Wissenschaft Frage 13: Sonnennächster Planet
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(13, 'Venus', false, 1),
(13, 'Merkur', true, 2),
(13, 'Mars', false, 3),
(13, 'Erde', false, 4)
ON CONFLICT DO NOTHING;

-- Wissenschaft Frage 14: Lichtgeschwindigkeit
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(14, '299.792.458 m/s', true, 1),
(14, '300.000.000 m/s', false, 2),
(14, '299.000.000 m/s', false, 3),
(14, '298.792.458 m/s', false, 4)
ON CONFLICT DO NOTHING;

-- Wissenschaft Frage 15: Relativitätstheorie
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(15, 'Newton', false, 1),
(15, 'Einstein', true, 2),
(15, 'Galilei', false, 3),
(15, 'Hawking', false, 4)
ON CONFLICT DO NOTHING;

-- Sport Frage 16: Olympische Spiele
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(16, '4 Jahre', true, 1),
(16, '2 Jahre', false, 2),
(16, '6 Jahre', false, 3),
(16, '8 Jahre', false, 4)
ON CONFLICT DO NOTHING;

-- Sport Frage 17: WM 2018
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(17, 'Deutschland', false, 1),
(17, 'Frankreich', true, 2),
(17, 'Kroatien', false, 3),
(17, 'Belgien', false, 4)
ON CONFLICT DO NOTHING;

-- Sport Frage 18: Wimbledon
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(18, 'Centre Court', true, 1),
(18, 'Court One', false, 2),
(18, 'Arthur Ashe Stadium', false, 3),
(18, 'Philippe Chatrier', false, 4)
ON CONFLICT DO NOTHING;

-- Sport Frage 19: The Greatest
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(19, 'Mike Tyson', false, 1),
(19, 'Muhammad Ali', true, 2),
(19, 'Joe Frazier', false, 3),
(19, 'George Foreman', false, 4)
ON CONFLICT DO NOTHING;

-- Sport Frage 20: Erste moderne Olympische Spiele
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(20, 'Paris', false, 1),
(20, 'Athen', true, 2),
(20, 'London', false, 3),
(20, 'Rom', false, 4)
ON CONFLICT DO NOTHING;

-- Unterhaltung Frage 21: Oscar 2020
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(21, 'Parasite', true, 1),
(21, '1917', false, 2),
(21, 'Joker', false, 3),
(21, 'Once Upon a Time in Hollywood', false, 4)
ON CONFLICT DO NOTHING;

-- Unterhaltung Frage 22: Herr der Ringe Zauberer
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(22, 'Gandalf', true, 1),
(22, 'Saruman', false, 2),
(22, 'Radagast', false, 3),
(22, 'Merlin', false, 4)
ON CONFLICT DO NOTHING;

-- Unterhaltung Frage 23: Bohemian Rhapsody
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(23, 'Queen', true, 1),
(23, 'The Beatles', false, 2),
(23, 'Led Zeppelin', false, 3),
(23, 'Pink Floyd', false, 4)
ON CONFLICT DO NOTHING;

-- Unterhaltung Frage 24: Pulp Fiction
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(24, 'Quentin Tarantino', true, 1),
(24, 'Martin Scorsese', false, 2),
(24, 'Steven Spielberg', false, 3),
(24, 'Christopher Nolan', false, 4)
ON CONFLICT DO NOTHING;

-- Unterhaltung Frage 25: Erster Star Wars Film
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(25, 'Episode I: Die dunkle Bedrohung', true, 1),
(25, 'Episode IV: Eine neue Hoffnung', false, 2),
(25, 'Rogue One', false, 3),
(25, 'Episode VII: Das Erwachen der Macht', false, 4)
ON CONFLICT DO NOTHING;

-- Allgemeinwissen Frage 26: Rot + Gelb
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(26, 'Orange', true, 1),
(26, 'Grün', false, 2),
(26, 'Lila', false, 3),
(26, 'Braun', false, 4)
ON CONFLICT DO NOTHING;

-- Allgemeinwissen Frage 27: Minuten pro Stunde
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(27, '60', true, 1),
(27, '50', false, 2),
(27, '100', false, 3),
(27, '70', false, 4)
ON CONFLICT DO NOTHING;

-- Allgemeinwissen Frage 28: Häufigstes Gas
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(28, 'Stickstoff', true, 1),
(28, 'Sauerstoff', false, 2),
(28, 'Kohlendioxid', false, 3),
(28, 'Argon', false, 4)
ON CONFLICT DO NOTHING;

-- Allgemeinwissen Frage 29: Schnellstes Landtier
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(29, 'Gepard', true, 1),
(29, 'Löwe', false, 2),
(29, 'Antilope', false, 3),
(29, 'Pferd', false, 4)
ON CONFLICT DO NOTHING;

-- Allgemeinwissen Frage 30: Oktopus Herzen
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(30, '3', true, 1),
(30, '1', false, 2),
(30, '2', false, 3),
(30, '4', false, 4)
ON CONFLICT DO NOTHING;