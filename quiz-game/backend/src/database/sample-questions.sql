-- Beispiel-Fragen für Quiz Arena

-- Geographie (Kategorie ID: 1)
INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko) VALUES
(1, 'Welches ist die Hauptstadt von Australien?', 100, 30, false),
(1, 'Welcher ist der längste Fluss der Welt?', 200, 30, false),
(1, 'Auf welchem Kontinent liegt die Sahara?', 300, 25, false),
(1, 'Welches Land hat die meisten Zeitzonen?', 400, 25, true),
(1, 'Wie heißt der höchste Berg der Welt?', 500, 20, true);

-- Geschichte (Kategorie ID: 2)
INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko) VALUES
(2, 'In welchem Jahr fiel die Berliner Mauer?', 100, 30, false),
(2, 'Wer war der erste Kaiser des Römischen Reichs?', 200, 30, false),
(2, 'Welcher Krieg dauerte von 1914 bis 1918?', 300, 25, false),
(2, 'In welchem Jahr entdeckte Kolumbus Amerika?', 400, 25, true),
(2, 'Wie lange dauerte der Hundertjährige Krieg?', 500, 20, true);

-- Wissenschaft (Kategorie ID: 3)
INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko) VALUES
(3, 'Welches chemische Element hat das Symbol "O"?', 100, 30, false),
(3, 'Wie viele Knochen hat ein erwachsener Mensch?', 200, 30, false),
(3, 'Welcher Planet ist der Sonne am nächsten?', 300, 25, false),
(3, 'Was ist die Lichtgeschwindigkeit im Vakuum?', 400, 25, true),
(3, 'Wer entwickelte die Relativitätstheorie?', 500, 20, true);

-- Sport (Kategorie ID: 4)
INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko) VALUES
(4, 'Alle wieviele Jahre finden die Olympischen Spiele statt?', 100, 30, false),
(4, 'Welcher Verein gewann die Fußball-WM 2018?', 200, 30, false),
(4, 'Wie heißt der berühmteste Tennisplatz in Wimbledon?', 300, 25, false),
(4, 'Welcher Boxer war als "The Greatest" bekannt?', 400, 25, true),
(4, 'In welcher Stadt fanden die ersten modernen Olympischen Spiele statt?', 500, 20, true);

-- Unterhaltung (Kategorie ID: 5)
INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko) VALUES
(5, 'Welcher Film gewann 2020 den Oscar für den besten Film?', 100, 30, false),
(5, 'Wie heißt der Zauberer in "Der Herr der Ringe"?', 200, 30, false),
(5, 'Welche Band sang "Bohemian Rhapsody"?', 300, 25, false),
(5, 'Welcher Regisseur drehte "Pulp Fiction"?', 400, 25, true),
(5, 'Wie heißt der erste Star Wars Film chronologisch?', 500, 20, true);

-- Allgemeinwissen (Kategorie ID: 6)
INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko) VALUES
(6, 'Welche Farbe entsteht beim Mischen von Rot und Gelb?', 100, 30, false),
(6, 'Wie viele Minuten hat eine Stunde?', 200, 30, false),
(6, 'Was ist das häufigste Gas in der Erdatmosphäre?', 300, 25, false),
(6, 'Welches Tier ist das schnellste an Land?', 400, 25, true),
(6, 'Wie viele Herzen hat ein Oktopus?', 500, 20, true);
