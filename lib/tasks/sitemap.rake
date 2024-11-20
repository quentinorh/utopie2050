namespace :sitemap do
    desc "Generate the sitemap"
    task :refresh => :environment do
      SitemapGenerator::Interpreter.run
    end
  end