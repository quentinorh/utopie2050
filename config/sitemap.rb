require 'aws-sdk-s3'

# Set the host name for URL creation
SitemapGenerator::Sitemap.default_host = "https://sp2050.org"
SitemapGenerator::Sitemap.public_path = 'tmp/'
SitemapGenerator::Sitemap.sitemaps_path = 'sitemaps/'
SitemapGenerator::Sitemap.compress = true

SitemapGenerator::Sitemap.adapter = SitemapGenerator::S3Adapter.new(
  aws_access_key_id: ENV["S3_ACCESS_KEY"],
  aws_secret_access_key: ENV["S3_SECRET_KEY"],
  fog_provider: 'AWS',
  fog_directory: ENV["S3_BUCKET_NAME"],
  fog_region: ENV["S3_REGION"]
  )

SitemapGenerator::Sitemap.sitemaps_host = "https://sp2050.s3.amazonaws.com"


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

# Upload du fichier compressé sur S3
Aws.config.update(
  region: ENV['AWS_REGION'],
  credentials: Aws::Credentials.new(ENV['AWS_ACCESS_KEY_ID'], ENV['AWS_SECRET_ACCESS_KEY'])
)

s3 = Aws::S3::Resource.new
bucket = s3.bucket(ENV['AWS_BUCKET'])

SitemapGenerator::Sitemap.sitemaps.each do |file|
  # Téléchargement du fichier compressé
  obj = bucket.object("sitemaps/#{File.basename(file.path)}")
  
  # Assurez-vous que le fichier .gz a le bon type MIME
  content_type = 'application/x-gzip'
  
  obj.upload_file(file.path, acl: 'public-read', content_type: content_type)
  puts "Uploaded #{file.path} to S3 as #{obj.public_url}"
end