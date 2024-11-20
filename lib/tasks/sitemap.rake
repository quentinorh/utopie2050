namespace :sitemap do
  desc 'Génère le sitemap'
  task generate: :environment do
    puts "Génération du sitemap..."
    
    # Supprime les anciens sitemaps
    FileUtils.rm_rf(Dir[File.join(Rails.root, 'public', 'sitemap*.xml.gz')])
    
    require Rails.root.join('config/sitemap.rb')
    SitemapGenerator::Sitemap.create
    
    puts "\nSitemap généré avec succès!"
    puts "Le sitemap est disponible dans public/sitemap.xml.gz"
  end
end