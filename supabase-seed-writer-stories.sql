-- =====================================================
-- Seed the 8 default writer stories as REAL posts.
-- Run once in Supabase Dashboard -> SQL Editor.
--
-- They are owned by the OLDEST account on the site
-- (the first profile ever created - i.e. you).
-- Safe to re-run: skips any story whose title already exists.
-- =====================================================

DO $$
DECLARE
  owner_id UUID;
BEGIN
  -- The site owner = first registered profile
  SELECT id INTO owner_id FROM profiles ORDER BY created_at ASC LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE NOTICE 'No profiles found - sign up first, then re-run this script.';
    RETURN;
  END IF;

  -- 1. Luffy as Lil Bro of Goku
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Luffy as Lil Bro of Goku', 'The bond of two brothers across two seas.', 'Fan Fiction', ARRAY['luffy','goku','crossover'], 'assets/images/writer/writer-pic-1.jpg',
  'In a small, peaceful village on Earth, Goku''s younger brother, Luffy, was born. Unlike Goku, Luffy''s personality was fiery and impulsive, often getting himself into trouble with his mischievous adventures. Growing up under the same roof, the two brothers formed a bond like no other, each pushing the other to grow stronger.

Luffy, always eager to fight, would often challenge Goku to sparring matches, only to be defeated effortlessly. But Luffy didn''t mind; every loss made him stronger, and every challenge gave him more fire. "One day, I''ll be as strong as you!" he''d shout with a grin, despite his bruises.

As they grew, the two adventurers set off on separate journeys. Goku pursued his dreams of becoming the world''s greatest martial artist, while Luffy set his sights on the Grand Line, declaring himself the future Pirate King. Their paths were different, but both had the same unyielding drive.

Goku would often send Luffy letters with encouragement, but Luffy''s only reply would be a laughing message: "I''m already on my way to being the King of the Sea, big bro!"

Years later, Luffy''s name became known across the seas, just as Goku''s became known across the universe. And though they fought different battles, the bond of family and adventure would always keep them connected.'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Luffy as Lil Bro of Goku');

  -- 2. Goats as a Trio
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Goats as a Trio', 'Three legends, one unbreakable friendship.', 'Adventure', ARRAY['naruto','luffy','goku'], 'assets/images/writer/writer-pic-2.jpg',
  'Naruto, Luffy, and Goku were three young adventurers brought together by fate in a world where ninjas, pirates, and martial artists lived side by side. Though their personalities were completely different, they quickly became inseparable. Goku was calm and fearless, Luffy was wild and cheerful, while Naruto was determined and never willing to give up.

They would often train together, turning every practice session into a friendly competition. Goku challenged them to test their strength, Luffy rushed into every fight with a huge grin, and Naruto refused to let either of them get ahead. Even when they lost, they would laugh, learn, and promise to become stronger together.

As they grew older, each of them began chasing their own dream. Goku wanted to become the greatest martial artist, Luffy dreamed of becoming the Pirate King, and Naruto wanted to become Hokage and earn the respect of everyone around him.

Years later, their names became legends across the world. No matter how far their journeys took them, the three friends always found their way back to each other.'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Goats as a Trio');

  -- 3. Ramen Lovers Together
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Ramen Lovers Together', 'A warm bowl brings the greatest heroes together.', 'Slice of Life', ARRAY['ramen','friends'], 'assets/images/writer/writer-pic-3.jpg',
  'There was something magical about a warm bowl of ramen that brought even the greatest warriors together. Every Sunday evening, Naruto, Goku, and Luffy would gather at Ichiraku Ramen, the only place in the world where a Hokage, a Saiyan, and a Pirate King could sit side by side and simply enjoy a meal.

Naruto always ordered the same thing - miso ramen with extra pork. Goku, being Goku, ordered ten bowls of everything. Luffy would eat until the entire shop ran out of ingredients, laughing the whole time.

"You know," Naruto said between slurps, "this is the best part of my day." Goku nodded, his mouth full of noodles. Luffy grinned, sauce on his face. "Better than treasure!" he declared.

They talked about their adventures, their dreams, and their friends. In those quiet moments over steaming bowls of ramen, they weren''t legends or heroes - they were just three friends, sharing a meal and a bond that would last forever.'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Ramen Lovers Together');

  -- 4. The Last Battle
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'The Last Battle', 'The final stand of the three legends.', 'Action', ARRAY['battle','trio'], 'assets/images/writer/writer-pic-4.jpg',
  'The sky turned dark as the ultimate threat emerged - a villain so powerful that even the gods trembled. Naruto, Goku, and Luffy stood side by side, facing the enemy that threatened to destroy everything they had ever loved.

"Ready?" Goku asked, his voice calm despite the chaos around them. Naruto grinned, his eyes blazing with determination. "Always." Luffy cracked his knuckles, his hat pulled low. "Let''s do this."

The battle was unlike anything the world had ever seen. Goku transformed through his forms, his power reaching new heights with every blow. Naruto unleashed the full force of the Nine-Tails, his chakra painting the sky in golden light. Luffy activated Gear 5, his body bending reality itself.

Together, they were unstoppable. When the final blow landed, the darkness shattered like glass, and the sun broke through the clouds.

Breathing heavily, the three warriors looked at each other and smiled. They had won - not alone, but together. That was the power of friendship, the power of three legends who refused to give up.'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'The Last Battle');

  -- 5. Team Goats
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Team Goats', 'The Greatest Of All Time, still friends at heart.', 'Adventure', ARRAY['goats','legends'], 'assets/images/writer/writer-pic-5.jpg',
  'In a world where power meant everything, three names echoed across every land, every sea, every universe - Goku, Naruto, and Luffy. They were known as the GOATs, the Greatest Of All Time.

But fame never changed them. Goku still trained every morning with a smile. Naruto still visited his friends in the Hidden Leaf Village. Luffy still gathered his crew, laughing and dreaming of new adventures on the Grand Line.

They met once a year at a secret location - a small island in the middle of the ocean. There, they would train, fight, eat, and share stories. No cameras, no fans, no titles. Just three friends being themselves.

"You know what I love most?" Luffy said one evening, watching the sunset. "This. Just us." Goku nodded, stretching his arms behind his head. Naruto smiled. "Me too. This is what it''s all about."'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Team Goats');

  -- 6. Jack Luffy
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Jack Luffy', 'A treasure hunt with a heartwarming twist.', 'Adventure', ARRAY['luffy','pirates'], 'assets/images/writer/writer-pic-6.jpg',
  'Monkey D. Luffy had always been fearless, but when he discovered the legendary treasure of Gol D. Roger, everything changed. The treasure wasn''t gold or jewels - it was a map to a hidden island where the greatest pirates in history had left their legacy.

Luffy gathered his crew and set sail immediately. "We''re going to find this treasure!" he declared. The journey was filled with challenges - treacherous storms, powerful enemies, and impossible obstacles.

When they finally reached the island, Luffy found something unexpected - a letter from Gol D. Roger himself. "The real treasure isn''t on this island," it read. "It''s the journey you took to get here, and the friends who traveled with you."

Luffy laughed, holding the letter to his chest. "He''s right!" he said, looking at his crew. "You guys are my treasure!"'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Jack Luffy');

  -- 7. Pirate Slayer
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Pirate Slayer', 'The road of the world''s greatest swordsman.', 'Action', ARRAY['zoro','swordsman'], 'assets/images/writer/writer-pic-7.jpg',
  'They called him the Pirate Slayer, but that wasn''t quite right. Roronoa Zoro didn''t slay pirates for money or fame - he did it because it was the right thing to do. With his three swords and an unbreakable will, he had earned a reputation as the most feared swordsman in the world.

His journey began in a small village where he trained under a master swordsman. "To become truly strong," his master told him, "you must fight for something more than yourself."

Along the way, he met friends who changed his life. He joined Luffy''s crew, finding brothers in the Straw Hat Pirates. He trained with Mihawk, his rival and inspiration. He faced death more times than he could count, but each time he rose stronger.

"The world will know my name," Zoro once said, "as the greatest swordsman who ever lived."'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Pirate Slayer');

  -- 8. Unbeatable Combo
  INSERT INTO creations (user_id, type, title, description, genre, tags, cover_image_url, story_content)
  SELECT owner_id, 'writer', 'Unbeatable Combo', 'The combo no enemy in the multiverse could break.', 'Action', ARRAY['trio','combo'], 'assets/images/writer/writer-pic-8.jpg',
  'In the entire multiverse, there was one combination that no enemy could defeat - the Unbeatable Combo of Goku, Naruto, and Luffy. Together, they had faced gods, aliens, demons, and pirates, and they had never lost.

The secret to their power wasn''t just their individual strength - it was how they worked together. Goku''s raw power, Naruto''s strategic mind, and Luffy''s unpredictable fighting style created a combination that was impossible to counter.

When Goku attacked with a Kamehameha, Naruto would follow with a Rasenshuriken, and Luffy would finish with a Gear 5 punch that bent reality itself.

"We''re unstoppable!" Luffy would shout after every victory. Goku would laugh, rubbing the back of his head. Naruto would grin, crossing his arms. "Believe it!"

The Unbeatable Combo wasn''t just a fighting team - it was a family, bound by friendship, loyalty, and the shared dream of protecting the world they loved.'
  WHERE NOT EXISTS (SELECT 1 FROM creations WHERE type = 'writer' AND title = 'Unbeatable Combo');

  RAISE NOTICE 'Default writer stories seeded for user %', owner_id;
END
$$;
