# frozen_string_literal: true

require "json"
require_relative "french_common_words"

class DicoWordFilter
  FREQUENCY_URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt"
  FREQUENCY_CACHE = Rails.root.join("config/data/fr_frequency_50k.txt")
  BLOCKLIST_CACHE = Rails.root.join("config/data/dico_blocklist.txt")
  DICO_DIR = Rails.root.join("app/assets/dico")
  FREQUENCY_TOP = FrenchCommonWords::DEFAULT_TOP

  class << self
    def filter_file!(path, top: FREQUENCY_TOP)
      words = read_words(path)
      basename = File.basename(path)
      for_noun = basename.start_with?("Noms communs")
      for_adjective = basename.start_with?("Adjectifs")
      noun_words = for_adjective ? FrenchCommonWords.load_noun_words : nil

      filtered = words.select do |word|
        keep_word?(word, top: top, for_noun: for_noun, for_adjective: for_adjective, noun_words: noun_words)
      end.sort
      File.write(path, JSON.pretty_generate(filtered))
      { before: words.size, after: filtered.size }
    end

    def filter_all!(top: FREQUENCY_TOP)
      stats = {}

      Dir.glob(DICO_DIR.join("*.json")).sort.each do |path|
        stats[File.basename(path)] = filter_file!(path, top: top)
      end

      stats
    end

    def sanitize_all!
      stats = {}

      Dir.glob(DICO_DIR.join("*.json")).sort.each do |path|
        words = read_words(path)
        filtered = words.select { |word| keep_word?(word) }.sort
        File.write(path, JSON.pretty_generate(filtered))
        stats[File.basename(path)] = { before: words.size, after: filtered.size }
      end

      stats
    end

    def clean_adjectives!
      noun_words = FrenchCommonWords.load_noun_words
      stats = {}

      Dir.glob(DICO_DIR.join("Adjectifs, *.json")).sort.each do |path|
        words = read_words(path)
        filtered = words.select { |word| adjective_word?(word, noun_words: noun_words) }.sort
        File.write(path, JSON.pretty_generate(filtered))
        stats[File.basename(path)] = { before: words.size, after: filtered.size }
      end

      stats
    end

    def keep_word?(word, top: FREQUENCY_TOP, for_noun: false, for_adjective: false, noun_words: nil)
      text = word.to_s.strip
      return false if blocked?(text)
      return false unless FrenchCommonWords.shape_ok?(text, for_noun: for_noun)
      return false unless FrenchCommonWords.frequency_set(top: top).include?(FrenchCommonWords.normalize(text))
      return false if for_adjective && !FrenchCommonWords.adjective_word?(word, noun_words: noun_words)

      true
    end

    def adjective_word?(word, noun_words:)
      text = word.to_s.strip
      return false if blocked?(text)
      return false unless FrenchCommonWords.shape_ok?(text)
      return false unless FrenchCommonWords.common?(text)
      return false unless FrenchCommonWords.adjective_word?(word, noun_words: noun_words)

      true
    end

    def blocked?(word)
      normalized = FrenchCommonWords.normalize_for_blocklist(word)
      blocklist = load_blocklist

      blocklist.any? { |term| normalized.include?(term) }
    end

    def load_blocklist
      @blocklist ||= begin
        return [] unless BLOCKLIST_CACHE.exist?

        File.readlines(BLOCKLIST_CACHE, chomp: true)
            .map { |line| FrenchCommonWords.normalize_for_blocklist(line) }
            .reject(&:blank?)
      end
    end

    def ensure_frequency_cache!
      return if FREQUENCY_CACHE.exist?

      FREQUENCY_CACHE.parent.mkpath
      require "open-uri"
      URI.open(FREQUENCY_URL) do |remote|
        File.binwrite(FREQUENCY_CACHE, remote.read)
      end
    end

    def read_words(path)
      raw = File.binread(path)
      content = decode_content(raw)
      JSON.parse(content)
    end

    def decode_content(raw)
      content = if raw.start_with?("\xFF\xFE".b)
        raw.dup.force_encoding("UTF-16LE").encode("UTF-8")
      elsif raw.start_with?("\xFE\xFF".b)
        raw.dup.force_encoding("UTF-16BE").encode("UTF-8")
      else
        raw.dup.force_encoding("UTF-8")
      end

      content.encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
           .sub(/\A\uFEFF/, "")
    end
  end

  ensure_frequency_cache!
end
