require 'faker'
require 'open-uri'
require 'cloudinary'
require 'ruby/openai'
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

# Méthode pour générer des paramètres de couverture aléatoires
def generer_parametres_couverture
  {
    columns: rand(1..50),
    rows: rand(1..50),
    hue: rand(0..360),
    filledSquares: rand(1..100),
    whiteSquares: rand(1..100),
    padding: rand(0..50),
    shape: ['square', 'ellipse', 'triangle', 'losange'].sample
    # Supprimez la ligne 'complementaryBg' car elle est maintenant toujours activée
  }
end

# Méthode pour générer un SVG à partir des paramètres de couverture
def generer_svg_couverture(params)
  width = 250
  height = 350
  columns = params[:columns]
  rows = params[:rows]
  hue = params[:hue]
  filled_squares = params[:filledSquares]
  white_squares = params[:whiteSquares]
  padding = params[:padding]
  shape = params[:shape]

  fill_color = "hsl(#{hue}, 80%, 70%)"
  complementary_color = "hsl(#{(hue + 180) % 360}, 80%, 70%)"

  pattern_cycle = filled_squares + white_squares
  svg_content = ""

  # Toujours ajouter le fond complémentaire
  svg_content += "<rect x='0' y='0' width='#{width}' height='#{height}' fill='#{complementary_color}' />"

  (0...rows).each do |row|
    (0...columns).each do |col|
      cell_index = row * columns + col
      pattern_index = cell_index % pattern_cycle
      is_filled = pattern_index < filled_squares
      cell_width = width / columns
      cell_height = height / rows
      x = col * cell_width
      y = row * cell_height

      padding_x = padding == 0 ? 0 : cell_width * (padding / 100.0) / 2
      padding_y = padding == 0 ? 0 : cell_height * (padding / 100.0) / 2

      svg_content += case shape
                     when 'square'
                       "<rect x='#{x + padding_x}' y='#{y + padding_y}' width='#{cell_width - 2 * padding_x}' height='#{cell_height - 2 * padding_y}' fill='#{is_filled ? fill_color : "none"}' />"
                     when 'ellipse'
                       "<ellipse cx='#{x + cell_width / 2}' cy='#{y + cell_height / 2}' rx='#{(cell_width - 2 * padding_x) / 2}' ry='#{(cell_height - 2 * padding_y) / 2}' fill='#{is_filled ? fill_color : "none"}' />"
                     when 'triangle'
                       "<polygon points='#{x + padding_x},#{y + cell_height - padding_y} #{x + cell_width / 2},#{y + padding_y} #{x + cell_width - padding_x},#{y + cell_height - padding_y}' fill='#{is_filled ? fill_color : "none"}' />"
                     when 'losange'
                       "<polygon points='#{x + cell_width / 2},#{y + padding_y} #{x + cell_width - padding_x},#{y + cell_height / 2} #{x + cell_width / 2},#{y + cell_height - padding_y} #{x + padding_x},#{y + cell_height / 2}' fill='#{is_filled ? fill_color : "none"}' />"
                     end
    end
  end

  "<svg xmlns='http://www.w3.org/2000/svg' shape-rendering='auto' viewBox='0 0 250 350' preserveAspectRatio='xMidYMid meet' data-coversize-target='svg'>#{svg_content}</svg>"
end

# Méthode pour générer un article avec une couverture aléatoire
def generer_article(client, user, theme)
  puts "Génération du contenu en français pour l'utilisateur #{user.username}..."

  # Générer le titre de l'article en utilisant le thème
  titre_prompt = "Génère un titre captivant en français pour un article sur le thème suivant : '#{theme}'."
  titre_article = generer_paragraphe_openai(client, titre_prompt)

  # Générer le corps de l'article
  article_prompt = "Écris un article détaillé en français sur le thème suivant : '#{theme}', sans inclure le titre ni de mention de l'introduction."
  body_text = Array.new(5) { generer_paragraphe_openai(client, article_prompt) }.join("\n\n")

  # Générer des paramètres de couverture aléatoires
  cover_params = generer_parametres_couverture
  puts "Paramètres de couverture générés : #{cover_params}"

  # Générer le SVG de la couverture
  svg_cover = generer_svg_couverture(cover_params)

  # Créer le post avec les paramètres de couverture
  post = Post.new(
    title: titre_article,
    user_id: user.id,
    image_rights: true,
    color: "hsl(#{cover_params[:hue]}, 100%, 50%)",
    body: body_text,
    pattern_settings: cover_params.to_json,
    cover: svg_cover
  )

  if post.save
    puts "Post créé avec succès : #{post.title}"
  else
    puts "Échec de la création du post : #{post.errors.full_messages.join(', ')}"
  end

  # Générer une date de création aléatoire (par exemple dans les 365 derniers jours)
  random_created_at = rand(1..365).days.ago
  post.update_columns(created_at: random_created_at, updated_at: random_created_at)

  # Générer des chapitres de manière aléatoire
  generer_chapitres_aleatoires(client, post, titre_article) if [true, false].sample  # 50% de chances d'avoir des chapitres

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
Bookmark.destroy_all
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

# Create 2 additional random users
users = 2.times.map do
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
