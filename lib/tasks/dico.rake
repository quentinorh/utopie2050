# frozen_string_literal: true

require_relative "../dico_word_filter"

namespace :dico do
  desc "Réduit les fichiers JSON du dictionnaire aux mots courants (fréquence OpenSubtitles)"
  task filter: :environment do
    DicoWordFilter.ensure_frequency_cache!
    stats = DicoWordFilter.filter_all!

    puts "Filtrage terminé (correspondance exacte, top #{FrenchCommonWords::DEFAULT_TOP}) :"
    stats.each do |file, counts|
      puts "  #{file}: #{counts[:before]} → #{counts[:after]} mots"
    end
  end

  desc "Retire les mots indésirables des fichiers JSON déjà filtrés"
  task sanitize: :environment do
    stats = DicoWordFilter.sanitize_all!

    puts "Nettoyage terminé :"
    stats.each do |file, counts|
      puts "  #{file}: #{counts[:before]} → #{counts[:after]} mots"
    end
  end

  desc "Retire les noms et termes invalides des listes d'adjectifs"
  task clean_adjectives: :environment do
    stats = DicoWordFilter.clean_adjectives!

    puts "Nettoyage des adjectifs terminé :"
    stats.each do |file, counts|
      puts "  #{file}: #{counts[:before]} → #{counts[:after]} mots"
    end
  end
end
