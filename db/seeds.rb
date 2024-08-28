# Clear existing data
User.destroy_all
Post.destroy_all
Chapter.destroy_all

# Create a user
user = User.create!(
  email: "quentin.orhant@gmook.com",
  password: "azerty",
  username: "Quentin Orhant"
)

# Create a post with chapters
first_post_with_chapters = Post.create!(
  title: "Tout a changé : Capitalisme et changement climatique",
  user_id: user.id,
  unsplash_image_url: "https://images.unsplash.com/photo-1534081333815-ae5019106622?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHx2b3lhZ2V8ZW58MHx8fHwxNzIwNjE2NzAw&ixlib=rb-4.0.3&q=85",
  image_rights: false,
  color: "hsl(141, 100%, 50%)"
)

# Add chapters to the post
first_post_with_chapters.chapters.create!([
  { title: "Avant propos", body: "Naomi Klein, dans Tout peut changer : Capitalisme et changement climatique, propose des transformations radicales pour éviter les pires effets du changement climatique. Elle souligne l'urgence d'abandonner le capitalisme néolibéral, qu'elle considère incompatible avec un avenir durable, et suggère une transition vers une économie plus solidaire, équitable, et décarbonée. Cette nouvelle imagine un monde en 2050 où ces idées ont été appliquées.", position: 1 },
  { title: "Chapitre 1 : L’aube nouvelle", body: "La lumière douce de l’aube baignait la ville de Solaria, un modèle de durabilité qui s’étendait à perte de vue. Les gratte-ciels autrefois faits de verre et d’acier avaient été remplacés par des tours en bois et en matériaux recyclés, des structures végétalisées où poussaient plantes et arbres fruitiers. Les toits étaient tapissés de panneaux solaires, leurs surfaces iridescentes scintillant sous le soleil naissant. Partout, les rues étaient calmes, parcourues uniquement par des piétons, des cyclistes, et des véhicules électriques silencieux.

Le visage d’Alice se reflétait sur l’écran de son terminal personnel, un simple dispositif alimenté par l’énergie solaire. Elle sirotait son café produit localement, une saveur rare dans les années précédant la transition mondiale vers des chaînes d’approvisionnement courtes et équitables. Elle se souvenait encore des années de crise climatique, avant que le mouvement global inspiré par Klein ne balaye les anciennes structures de pouvoir.

« 2050… Nous y sommes enfin, » pensa-t-elle.

Il avait fallu des années de lutte, de manifestations massives et de décisions courageuses. Le monde avait vu la montée de réseaux de coopératives, de communautés autogérées, et la fin de l'hégémonie des multinationales. L'industrie pétrolière avait été démantelée par des lois internationales strictes, obligeant les entreprises à abandonner leurs pratiques destructrices au profit des énergies renouvelables. Ce qui semblait autrefois impossible était devenu la norme.

Alice, comme beaucoup de citoyens de Solaria, travaillait pour une coopérative d'énergie locale. Chaque citoyen jouait un rôle actif dans la production et la gestion de l'énergie propre. Le modèle de Klein avait pris forme ici : l'économie n'était plus dirigée par la croissance illimitée, mais par le bien-être collectif et l'harmonie avec la planète.", position: 2 },
  { title: "Chapitre 2 : Les nouveaux fondements de l’économie", body: "À l'époque de la transition, en 2025, des gouvernements autrefois influencés par les intérêts des grandes entreprises avaient pris des décisions historiques. Sous la pression des mouvements populaires, ils avaient imposé des taxes strictes sur le carbone, forcé les industries à se convertir à des modèles circulaires et mis fin aux subventions pour les énergies fossiles. Le pouvoir avait été redonné aux communautés locales. Les multinationales n'avaient pas survécu à ces changements. À leur place, des réseaux d'entreprises locales avaient émergé, basés sur les besoins des populations plutôt que sur le profit à tout prix.

En 2050, les « biovilles » comme Solaria s'étaient multipliées à travers le monde. Elles fonctionnaient grâce à des systèmes alimentaires locaux, des infrastructures régénératrices, et des pratiques économiques équitables. Les marchés agricoles regorgeaient de produits saisonniers, cultivés selon des pratiques agroécologiques qui imitaient les cycles naturels. Chaque quartier avait ses jardins communs, des espaces partagés où la biodiversité prospérait.

Alice regarda par la fenêtre de son appartement, situé au dixième étage d’une tour végétalisée. En bas, des enfants jouaient dans un parc où poussaient des cerisiers. Le béton était devenu rare dans ces espaces, remplacé par des matériaux organiques et renouvelables. Une douce brise parfumée aux fleurs sauvages remplissait l'air. Il n'y avait plus de gaz d'échappement, plus de smog.

L’économie de Solaria et d'autres villes similaires reposait sur des coopératives de production d'énergie renouvelable, sur des entreprises circulaires où tout déchet devenait une ressource. Le consumérisme, autrefois moteur de l'économie mondiale, avait été réorienté. Les produits étaient conçus pour durer, être réparés et partagés. Les citoyens avaient accès à des bibliothèques d’objets et d’outils. Le concept de propriété privée s'était transformé en gestion partagée des ressources.

Alice réfléchit à son rôle dans cette transition. En tant qu'ingénieure en énergies renouvelables, elle avait travaillé avec des communautés pour installer des panneaux solaires, construire des éoliennes locales, et améliorer les réseaux de stockage d'énergie. Les grandes entreprises d’énergie, qui avaient jadis dicté les politiques nationales, avaient été démantelées, remplacées par des réseaux communautaires qui permettaient aux gens de gérer eux-mêmes leur production énergétique.", position: 3 },
  { title: "Chapitre 3 : L’équilibre retrouvé", body: "En 2050, les écosystèmes de la planète, autrefois dévastés par des décennies de surexploitation, commençaient à se régénérer. Les océans, autrefois envahis par le plastique, avaient vu des efforts concertés pour nettoyer et restaurer la vie marine. Des zones protégées avaient été créées, et la pêche industrielle avait été interdite. Les pratiques agricoles intensives avaient été remplacées par des modèles plus doux, qui respectaient les cycles naturels.

Alice se souvenait encore des tempêtes dévastatrices des années 2020, des incendies qui avaient ravagé des continents entiers. Les communautés étaient alors terrorisées par des événements climatiques extrêmes de plus en plus fréquents. Cependant, en réduisant les émissions de gaz à effet de serre et en régénérant les écosystèmes, ces phénomènes avaient lentement commencé à diminuer en intensité. Les modèles climatiques étaient loin d’être parfaits, mais l'espoir renaissait.

Les forêts pluviales, autrefois en danger critique, avaient été protégées par des lois internationales fortes. Des projets de reforestation massifs avaient été lancés. Le respect des droits des peuples autochtones avait été rétabli et leurs savoirs ancestraux intégrés dans les pratiques de gestion des ressources naturelles. Les communautés locales avaient retrouvé leur pouvoir, et la planète, son équilibre.", position: 4 },
  { title: "Chapitre 4 : Un modèle de démocratie directe", body: "Le modèle politique qui avait émergé en 2050 était fondé sur la démocratie directe. Inspiré par les principes énoncés par Klein, ce système avait donné une voix à chaque citoyen dans la prise de décision. À Solaria, par exemple, chaque projet, chaque loi, était soumis à un processus de consultation citoyenne. Les habitants se réunissaient régulièrement dans des assemblées populaires pour discuter des enjeux de la ville.

Alice participa à une telle assemblée ce matin-là. La discussion portait sur l'extension d'un réseau de tramway pour relier les quartiers périphériques à la ville-centre. Tout le monde avait son mot à dire, du plus jeune au plus âgé. Ce processus, bien que parfois long, garantissait que les décisions servaient le bien commun et non des intérêts particuliers.

L'économie participative avait également réduit les inégalités. Les écarts de richesse, autrefois immenses, avaient été réduits grâce à des politiques de redistribution équitable des ressources. La sécurité alimentaire et énergétique était assurée pour tous. L'éducation et la santé étaient gratuites et accessibles à tous, financées par les revenus générés par les énergies renouvelables et les coopératives locales.", position: 5 },
  { title: "Chapitre 5 : L’avenir entre nos mains", body: "Le soir venu, Alice se promena au bord du lac proche de Solaria, un lieu paisible où la nature avait repris ses droits. Elle observa les cygnes glisser sur l'eau, les montagnes se reflétant dans le miroir limpide du lac. Ce monde, si différent de celui dans lequel elle avait grandi, incarnait une utopie devenue réalité. Mais elle savait que cette paix fragile devait être constamment protégée.

Le chemin parcouru avait été semé d’embûches. La résistance des anciens pouvoirs avait été violente par moments. Mais, grâce à l'organisation des communautés, à la persévérance des militants et à un engagement sans faille pour l'environnement, les sociétés avaient su faire un pas en arrière, redonner à la Terre ce qui lui appartenait et instaurer un modèle de vie qui respectait les limites planétaires.

« Nous avons réussi, » se dit-elle. « Naomi Klein avait raison. Nous pouvions tout changer. »

L’avenir n’était pas exempt de défis. Les cicatrices du passé étaient encore visibles, et la menace d’un retour en arrière pesait toujours. Mais Alice savait que l’humanité avait choisi une autre voie, celle de la résilience, de la coopération et du respect de la nature. Un monde nouveau, bâti sur les ruines du vieux capitalisme, prospérait enfin.

La nuit tomba doucement sur Solaria, et Alice rentra chez elle, le cœur empli d’espoir. La planète, autrefois au bord du gouffre, avait retrouvé un équilibre précaire, mais durable. Un monde où tout pouvait réellement changer était devenu réalité, grâce à des idées qui avaient semblé utopiques, mais qui avaient sauvé l'humanité de sa propre destruction.

Fin.", position: 6 }
])
