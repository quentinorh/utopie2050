require 'faker'
require 'open-uri'
require 'ruby/openai'

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

  # Retourner le texte généré ou un texte par défaut en cas d'échec
  response ? response['choices'].first['message']['content'].strip : "Contenu généré par défaut suite à une erreur."
end

# Méthode pour générer un article avec un thème spécifique
def generer_article(client, user, theme)
  puts "Génération du contenu en français pour l'utilisateur #{user.username}..."

  # Générer le titre de l'article en utilisant le thème
  titre_prompt = "Génère un titre captivant en français pour un article sur le thème suivant : '#{theme}'."
  titre_article = generer_paragraphe_openai(client, titre_prompt)

  # Générer le corps de l'article
  article_prompt = "Génère un article en français sur le thème suivant : '#{theme}', en détaillant les aspects positifs, les innovations, et la manière dont la société a évolué pour atteindre ce futur désirable."
  body_text = Array.new(5) { generer_paragraphe_openai(client, article_prompt) }.join("\n\n")

  # Récupérer une image aléatoire liée au thème
  unsplash_url = nil
  begin
    unsplash_url = Faker::LoremFlickr.image(size: "600x400", search_terms: ['nature', 'future', 'city', 'technology'])
    file = URI.open(unsplash_url)
  rescue OpenURI::HTTPError => e
    puts "Erreur lors de la récupération de l'image : #{e.message}"
  end

  # Créer l'article
  post = Post.create!(
    title: titre_article,
    user_id: user.id,
    unsplash_image_url: unsplash_url,
    image_rights: true,
    color: "hsl(#{rand(360)}, 100%, 50%)",
    body: body_text
  )

  puts "Article créé pour l'utilisateur #{user.username} : #{post.title}"

  # Générer des chapitres cohérents avec le contenu de l'article
  rand(2..5).times do |i|
    chapter_prompt = "Génère un paragraphe en français pour un chapitre d'un article sur le thème '#{theme}', basé sur l'article suivant : '#{body_text.split("\n\n").sample}'."
    chapter_body = Array.new(3) { generer_paragraphe_openai(client, chapter_prompt) }.join("\n\n")
    Chapter.create!(
      title: "Chapitre #{i + 1} - #{Faker::Lorem.sentence(word_count: 3, supplemental: true)}",
      body: chapter_body,
      post_id: post.id,
      position: i + 1
    )
  end
end

# Clear existing data
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
users = 9.times.map do
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

puts "10 utilisateurs créés"

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
  10.times do
    theme = themes.sample # Choisir un thème aléatoire pour chaque article
    generer_article(client, user, theme)
  end
end

puts "Données de seed créées avec succès !"
