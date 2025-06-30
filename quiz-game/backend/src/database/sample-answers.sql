-- Antworten für die Beispiel-Fragen

-- Geographie Frage 1: Hauptstadt Australien
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(1, 'Sydney', false, 1),
(1, 'Melbourne', false, 2),
(1, 'Canberra', true, 3),
(1, 'Perth', false, 4);

-- Geographie Frage 2: Längster Fluss
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(2, 'Amazonas', false, 1),
(2, 'Nil', true, 2),
(2, 'Mississippi', false, 3),
(2, 'Jangtse', false, 4);

-- Geographie Frage 3: Sahara
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(3, 'Asien', false, 1),
(3, 'Afrika', true, 2),
(3, 'Australien', false, 3),
(3, 'Südamerika', false, 4);

-- Geographie Frage 4: Meiste Zeitzonen
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(4, 'USA', false, 1),
(4, 'Russland', true, 2),
(4, 'China', false, 3),
(4, 'Kanada', false, 4);

-- Geographie Frage 5: Höchster Berg
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(5, 'K2', false, 1),
(5, 'Mount Everest', true, 2),
(5, 'Makalu', false, 3),
(5, 'Lhotse', false, 4);

-- Geschichte Frage 1: Berliner Mauer
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(6, '1987', false, 1),
(6, '1989', true, 2),
(6, '1991', false, 3),
(6, '1990', false, 4);

-- Geschichte Frage 2: Erster römischer Kaiser
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(7, 'Julius Caesar', false, 1),
(7, 'Augustus', true, 2),
(7, 'Nero', false, 3),
(7, 'Claudius', false, 4);

-- Geschichte Frage 3: Erster Weltkrieg
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(8, 'Erster Weltkrieg', true, 1),
(8, 'Zweiter Weltkrieg', false, 2),
(8, 'Dreißigjähriger Krieg', false, 3),
(8, 'Siebenjähriger Krieg', false, 4);

-- Geschichte Frage 4: Kolumbus
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(9, '1490', false, 1),
(9, '1492', true, 2),
(9, '1494', false, 3),
(9, '1488', false, 4);

-- Geschichte Frage 5: Hundertjähriger Krieg
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(10, '100 Jahre', false, 1),
(10, '116 Jahre', true, 2),
(10, '99 Jahre', false, 3),
(10, '120 Jahre', false, 4);

-- Wissenschaft Frage 1: Sauerstoff
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(11, 'Sauerstoff', true, 1),
(11, 'Wasserstoff', false, 2),
(11, 'Kohlenstoff', false, 3),
(11, 'Stickstoff', false, 4);

-- Wissenschaft Frage 2: Knochen
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(12, '198', false, 1),
(12, '206', true, 2),
(12, '215', false, 3),
(12, '189', false, 4);

-- Wissenschaft Frage 3: Nächster Planet
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(13, 'Venus', false, 1),
(13, 'Merkur', true, 2),
(13, 'Mars', false, 3),
(13, 'Erde', false, 4);

-- Wissenschaft Frage 4: Lichtgeschwindigkeit
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(14, '299.792.458 m/s', true, 1),
(14, '300.000.000 m/s', false, 2),
(14, '299.000.000 m/s', false, 3),
(14, '298.792.458 m/s', false, 4);

-- Wissenschaft Frage 5: Relativitätstheorie
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(15, 'Newton', false, 1),
(15, 'Einstein', true, 2),
(15, 'Hawking', false, 3),
(15, 'Galilei', false, 4);

-- Sport Frage 1: Olympische Spiele
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(16, '2 Jahre', false, 1),
(16, '4 Jahre', true, 2),
(16, '3 Jahre', false, 3),
(16, '5 Jahre', false, 4);

-- Sport Frage 2: WM 2018
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(17, 'Deutschland', false, 1),
(17, 'Frankreich', true, 2),
(17, 'Brasilien', false, 3),
(17, 'Argentinien', false, 4);

-- Sport Frage 3: Wimbledon
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(18, 'Centre Court', true, 1),
(18, 'Court No. 1', false, 2),
(18, 'Arthur Ashe Stadium', false, 3),
(18, 'Philippe Chatrier', false, 4);

-- Sport Frage 4: The Greatest
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(19, 'Mike Tyson', false, 1),
(19, 'Muhammad Ali', true, 2),
(19, 'George Foreman', false, 3),
(19, 'Joe Frazier', false, 4);

-- Sport Frage 5: Erste Olympiade
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(20, 'Paris', false, 1),
(20, 'Athen', true, 2),
(20, 'London', false, 3),
(20, 'Rom', false, 4);

-- Unterhaltung Frage 1: Oscar 2020
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(21, '1917', false, 1),
(21, 'Parasite', true, 2),
(21, 'Joker', false, 3),
(21, 'Once Upon a Time in Hollywood', false, 4);

-- Unterhaltung Frage 2: Zauberer Herr der Ringe
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(22, 'Saruman', false, 1),
(22, 'Gandalf', true, 2),
(22, 'Merlin', false, 3),
(22, 'Radagast', false, 4);

-- Unterhaltung Frage 3: Bohemian Rhapsody
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(23, 'The Beatles', false, 1),
(23, 'Queen', true, 2),
(23, 'Led Zeppelin', false, 3),
(23, 'The Rolling Stones', false, 4);

-- Unterhaltung Frage 4: Pulp Fiction
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(24, 'Martin Scorsese', false, 1),
(24, 'Quentin Tarantino', true, 2),
(24, 'Steven Spielberg', false, 3),
(24, 'Francis Ford Coppola', false, 4);

-- Unterhaltung Frage 5: Erster Star Wars
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(25, 'Eine neue Hoffnung', false, 1),
(25, 'Die dunkle Bedrohung', true, 2),
(25, 'Das Imperium schlägt zurück', false, 3),
(25, 'Die Rückkehr der Jedi-Ritter', false, 4);

-- Allgemeinwissen Frage 1: Rot + Gelb
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(26, 'Grün', false, 1),
(26, 'Orange', true, 2),
(26, 'Lila', false, 3),
(26, 'Braun', false, 4);

-- Allgemeinwissen Frage 2: Minuten pro Stunde
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(27, '50', false, 1),
(27, '60', true, 2),
(27, '70', false, 3),
(27, '100', false, 4);

-- Allgemeinwissen Frage 3: Häufigstes Gas
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(28, 'Sauerstoff', false, 1),
(28, 'Stickstoff', true, 2),
(28, 'Kohlendioxid', false, 3),
(28, 'Wasserstoff', false, 4);

-- Allgemeinwissen Frage 4: Schnellstes Landtier
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(29, 'Löwe', false, 1),
(29, 'Gepard', true, 2),
(29, 'Antilope', false, 3),
(29, 'Pferd', false, 4);

-- Allgemeinwissen Frage 5: Oktopus Herzen
INSERT INTO question_options (question_id, option_text, is_correct, sort_order) VALUES
(30, '1', false, 1),
(30, '3', true, 2),
(30, '2', false, 3),
(30, '4', false, 4);
