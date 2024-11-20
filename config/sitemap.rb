require 'aws-sdk-s3'

SitemapGenerator::Sitemap.default_host = 'https://sp2050.org'

# Utiliser un chemin temporaire pour stocker le sitemap localement avant de l'envoyer sur S3
SitemapGenerator::Sitemap.public_path = 'tmp/'

# Nom du fichier sitemap
SitemapGenerator::Sitemap.sitemaps_path = 'sitemaps/'

# Nom du fichier sitemap
SitemapGenerator::Sitemap.filename = "sitemap"

# Génération du sitemap
SitemapGenerator::Sitemap.create do
  # Page d'accueil
  add root_path, changefreq: 'weekly', priority: 1.0
  puts "Ajout de la page d'accueil"
  
  # Liste des récits
  add posts_path, changefreq: 'daily', priority: 0.9
  puts "Ajout de la liste des récits"
  
  # Récits individuels
  Post.where("draft IS NULL OR draft = ?", false)
      .find_each do |post|
    puts "Ajout du post: #{post.title}"
    add post_path(post), 
        lastmod: post.updated_at,
        changefreq: 'weekly',
        priority: 0.8
  end
end

Aws.config.update(
  region: ENV['AWS_REGION'],
  credentials: Aws::Credentials.new(ENV['AWS_ACCESS_KEY_ID'], ENV['AWS_SECRET_ACCESS_KEY'])
)

s3 = Aws::S3::Resource.new
bucket = s3.bucket(ENV['AWS_BUCKET'])

# Parcours des fichiers générés et upload sur S3
SitemapGenerator::Sitemap.sitemaps.each do |file|
  obj = bucket.object("sitemaps/#{File.basename(file.path)}")
  obj.upload_file(file.path, acl: 'public-read')
  puts "Uploaded #{file.path} to S3 as #{obj.public_url}"
end