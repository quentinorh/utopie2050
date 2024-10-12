require 'faker'
require 'open-uri'
require 'cloudinary'
require 'ruby/openai'
# require 'dotenv/load'
require 'uri'
require 'erb'

# Afficher l'URL Cloudinary pour vérifier le chargement
puts "CLOUDINARY_URL: #{ENV['CLOUDINARY_URL']}"

# Configurer Cloudinary à partir de l'URL
Cloudinary.config_from_url(ENV['CLOUDINARY_URL'])

# Configure Faker to use French locale
Faker::Config.locale = 'fr'

# Setup OpenAI client
openai_api_key = ENV['OPENAI_API_KEY']
client = OpenAI::Client.new(access_token: openai_api_key)

# Méthode pour générer un paragraphe en français avec OpenAI
def generer_paragraphe_openai(client, prompt, retries = 3)
  response = nil

  retries.times do |attempt|
    begin
      response = client.chat(
        parameters: {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
          temperature: 0.7
        }
      )
      break if response && response['choices'] && response['choices'].first['message']['content']
    rescue StandardError => e
      puts "Erreur lors de la requête OpenAI (essai #{attempt + 1}) : #{e.message}"
      sleep(2) # Pause avant de réessayer
    end
  end

  response ? response['choices'].first['message']['content'].strip : "Contenu généré par défaut suite à une erreur."
end

# Méthode pour générer un titre basé sur le contenu du chapitre avec OpenAI
def generer_titre_chapitre(client, contenu)
  prompt = "Génère un titre court et captivant en français pour le chapitre suivant : '#{contenu}'. Le titre doit refléter le contenu de manière concise."
  titre = generer_paragraphe_openai(client, prompt)
  titre.gsub(/(^["']|["']$)/, '').strip # Supprimer les guillemets en début et fin de chaîne
end

# Méthode pour nettoyer les répétitions de titres ou mentions indésirables dans le contenu
def nettoyer_contenu(contenu, titre)
  # Supprimer les occurrences du titre et des mots comme "Titre :" ou "Contenu :"
  contenu.gsub(/#{Regexp.escape(titre)}/i, '').gsub(/(Titre\s*:\s*|Contenu\s*:\s*)/i, '').strip
end

# Méthode pour générer un mot-clé en anglais pour la recherche d'image
def generer_mot_cle_openai(client, titre)
  prompt = "Provide a single keyword in English that best represents the following article title: '#{titre}'"
  keyword = generer_paragraphe_openai(client, prompt)
  keyword.downcase.strip.gsub(/[^0-9a-z ]/i, '') # Nettoyer le mot-clé généré
end

# Méthode pour générer un article avec des images différentes et en lien avec le titre
def generer_article(client, user, theme)
  puts "Génération du contenu en français pour l'utilisateur #{user.username}..."

  # Générer le titre de l'article en utilisant le thème
  titre_prompt = "Génère un titre captivant en français pour un article sur le thème suivant : '#{theme}'."
  titre_article = generer_paragraphe_openai(client, titre_prompt)

  # Générer le corps de l'article
  article_prompt = "Écris un article détaillé en français sur le thème suivant : '#{theme}', sans inclure le titre ni de mention de l'introduction."
  body_text = Array.new(5) { generer_paragraphe_openai(client, article_prompt) }.join("\n\n")

  # Générer un mot-clé en anglais pour la recherche d'image
  mot_cle = generer_mot_cle_openai(client, titre_article)
  puts "Mot-clé généré pour la recherche d'image : #{mot_cle}"

  # Séparer les mots-clés avec des virgules et encoder l'URL correctement
  encoded_keywords = ERB::Util.url_encode(mot_cle.split.join(',')) # Remplace les espaces par des virgules et encode l'URI
  puts "Mots-clés encodés pour l'URL : #{encoded_keywords}"

  # Récupérer une image liée aux mots-clés encodés
  unsplash_url = Faker::LoremFlickr.image(size: "600x400", search_terms: encoded_keywords.split(','))
  file = URI.open(unsplash_url)

  # Créer le post avec le drapeau `skip_photo_validation` à true
  post = Post.new(
    title: titre_article,
    user_id: user.id,
    image_rights: true,
    color: "hsl(#{rand(360)}, 100%, 50%)",
    body: body_text,
    skip_photo_validation: true  # Ignore la validation de la photo
  )

  post.save!(validate: false) # Sauvegarde sans validation initiale

  # Attacher l'image
  post.photo.attach(io: file, filename: "image_#{post.id}.jpg")

  # Générer une date de création aléatoire (par exemple dans les 365 derniers jours)
  random_created_at = rand(1..365).days.ago
  post.update_columns(created_at: random_created_at, updated_at: random_created_at)

  # Générer des chapitres de manière aléatoire
  generer_chapitres_aleatoires(client, post, titre_article) if [true, false].sample  # 50% de chances d'avoir des chapitres

  # Réactive la validation en supprimant le drapeau, puis valide à nouveau
  post.skip_photo_validation = false
  post.save! # Sauvegarde avec validation cette fois-ci

  puts "Themes: #{post.themes.pluck(:name).join(', ')}"

  puts "Article créé pour l'utilisateur #{user.username} : #{titre_article}, Date de création : #{random_created_at}"
end

# Méthode pour générer des chapitres aléatoires pour un post
def generer_chapitres_aleatoires(client, post, titre_article)
  # Choisir un nombre aléatoire de chapitres (entre 1 et 5)
  nb_chapitres = rand(1..5)

  puts "Génération de #{nb_chapitres} chapitres pour l'article '#{post.title}'..."

  nb_chapitres.times do |i|
    # Générer le contenu du chapitre sans mention de titre
    chapitre_prompt = "Écris le contenu d'un chapitre de l'article intitulé '#{post.title}' sans mentionner le titre de l'article."
    chapitre_contenu = generer_paragraphe_openai(client, chapitre_prompt)

    # Nettoyer le contenu pour supprimer les mentions indésirables
    chapitre_contenu_propre = nettoyer_contenu(chapitre_contenu, titre_article)

    # Générer un titre basé sur le contenu du chapitre
    titre_chapitre = generer_titre_chapitre(client, chapitre_contenu_propre)

    # Créer le chapitre avec un contenu généré et un titre sans guillemets
    Chapter.create!(
      title: titre_chapitre,
      body: chapitre_contenu_propre,
      post: post,
      position: i + 1
    )

    puts "Chapitre #{i + 1} créé : #{titre_chapitre}"
  end

  puts "Chapitres générés avec succès pour l'article '#{post.title}'."
end

# Supprimer les données existantes et générer de nouvelles
User.destroy_all
Post.destroy_all
Chapter.destroy_all

# Create a specific user with provided parameters
quentin_user = User.create!(
  email: "quentin.orhant@mailo.fr",
  password: "azertyuiop",
  username: "Quentin Orhant",
  age: 62
)
# Bypass Devise email confirmation
quentin_user.skip_confirmation!
quentin_user.save!

# Create 9 additional random users
users = 4.times.map do
  user = User.create!(
    email: Faker::Internet.unique.email,
    password: "password",
    username: Faker::Name.name,
    age: rand(18..70)
  )
  user.skip_confirmation!
  user.save!
  user
end

# Add the specific user to the users array
users << quentin_user

puts "5 utilisateurs créés"

# Liste de thèmes autour des futurs désirables pour 2050
themes = [
  "L'urbanisme régénératif : les villes qui cultivent la nature",
  "La transition énergétique vers les énergies 100% renouvelables",
  "La cohabitation harmonieuse avec les espèces réintroduites dans nos écosystèmes",
  "Les communautés résilientes et solidaires face aux changements climatiques",
  "La réinvention de l'éducation pour un monde inclusif et créatif",
  "Le retour à l'agriculture locale et les fermes verticales en ville",
  "Les villes sans voitures : piétonisation et transports verts",
  "L'émergence des villages intergénérationnels et solidaires",
  "L'évolution des pratiques artistiques vers des expressions éco-responsables",
  "La généralisation de l'économie circulaire et la fin de l'obsolescence programmée",
  "Les habitats bio-climatiques et la co-construction collaborative",
  "L'invention de nouvelles relations avec le vivant : éthique et droits des animaux",
  "La révolution des matériaux biosourcés et sans impact carbone",
  "L'intégration de l'intelligence artificielle dans la gestion des ressources naturelles",
  "Les innovations dans le domaine de la santé et de la longévité humaine",
  "Les villes flottantes et les architectures adaptatives face à la montée des eaux",
  "La renaissance des métiers manuels et artisanaux dans un monde technologique",
  "L'humanité augmentée par des biotechnologies éthiques",
  "Le bien-être collectif et les nouveaux modèles de gouvernance",
  "L'accès universel à la culture et au savoir grâce au numérique éthique",
  "La gestion locale des ressources et la fin des dépendances économiques globales",
  "Les entreprises à impact social positif et les coopératives de demain",
  "L'émergence d'une économie régénérative respectueuse des écosystèmes",
  "Les nouvelles formes de mobilité douce et partagée",
  "La valorisation des savoirs indigènes et des pratiques ancestrales"
]

# Créer des articles pour chaque utilisateur en utilisant les thèmes disponibles
users.each do |user|
  2.times do
    theme = themes.sample # Choisir un thème aléatoire pour chaque article
    generer_article(client, user, theme)
  end
end

puts "Données de seed créées avec succès !"
