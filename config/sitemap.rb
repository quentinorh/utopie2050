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
  region: ENV['S3_REGION'],
  credentials: Aws::Credentials.new(ENV['S3_ACCESS_KEY'], ENV['S3_SECRET_KEY'])
)

s3 = Aws::S3::Resource.new
bucket = s3.bucket(ENV['S3_BUCKET_NAME'])

sitemap_file = File.join(SitemapGenerator::Sitemap.public_path, 
                        SitemapGenerator::Sitemap.sitemaps_path, 
                        'sitemap.xml.gz')

if File.exist?(sitemap_file)
  obj = bucket.object("sitemaps/sitemap.xml.gz")
  obj.upload_file(sitemap_file, 
                 acl: 'public-read', 
                 content_type: 'application/x-gzip')
                 
  puts "Uploaded sitemap to S3: #{obj.public_url}"
end