# frozen_string_literal: true

require "set"

module FrenchCommonWords
  FREQUENCY_PATH = Rails.root.join("config/data/fr_frequency_50k.txt")
  DEFAULT_TOP = 2_000
  MAX_WORD_LENGTH = 12

  STOPWORDS = Set.new(%w[
    de je est pas le que la vous tu un il a ne les en on du me se sa si ou ai su au ce ci ca ma va te y go re lai lui dit son ses nos vos aux qu es c et d l m n s t
  ]).freeze

  TECHNICAL_PATTERN = /
    sulfon|
    oïde|
    oide|
    phanite|
    podid|
    hormon|
    cr[eé]in|
    arachin|
    leucorr|
    falcif|
    glauco|
    tolu[eè]n|
    hydrom|
    h[eé]pat|
    carotin|
    anacr[eé]|
    kalli|
    bradyp|
    tautom|
    invers|
    boulet[eé]|
    d[eé]satell|
    caoutchou
  /ix

  PARTICIPLE_NOUN_PATTERN = /\A[a-zàâçéèêëîïôùûüœæ-]+é\z/

  module_function

  def normalize(text)
    text.to_s.strip.downcase
  end

  def normalize_for_blocklist(text)
    normalize(text).unicode_normalize(:nfd).gsub(/\p{M}/, "")
  end

  def frequency_set(top: DEFAULT_TOP)
    @frequency_sets ||= {}
    @frequency_sets[top] ||= begin
      lines = File.readlines(FREQUENCY_PATH, chomp: true).first(top)
      Set.new(lines.map { |line| normalize(line.split.first) }.reject { |word| STOPWORDS.include?(word) })
    end
  end

  def common?(word, top: DEFAULT_TOP)
    text = word.to_s.strip
    return false unless shape_ok?(text)

    frequency_set(top: top).include?(normalize(text))
  end

  def shape_ok?(text, for_noun: false)
    return false if text.blank?
    return false if text.include?(" ")
    return false if text.length < 4 || text.length > MAX_WORD_LENGTH
    return false if text.match?(/\d/)
    return false if normalize(text).match?(TECHNICAL_PATTERN)
    return false if for_noun && participle_noun?(text)

    true
  end

  def participle_noun?(text)
    normalized = normalize(text)
    return false unless normalized.match?(PARTICIPLE_NOUN_PATTERN)

    PARTICIPLE_NOUN_ALLOWLIST.exclude?(normalized)
  end

  PARTICIPLE_NOUN_ALLOWLIST = Set.new(%w[
    café clé élevé allé apporté
  ]).freeze

  ADJECTIVE_SUFFIX_PATTERN = /
    (?:able|ible|ique|euse?|ifs?|ives?|ants?|ents?|als?|els?|iers?|istes?)\z
  /x

  IRREGULAR_ADJECTIVES = Set.new(%w[
    bon bonne mauvais mauvaise grand grande petit petite gros grosse grosse
    beau belle nouveau nouvelle vieux vieille jeune rose rouge noir noire blanc blanche
    vert bleu gris jaune orange doux douce faux fausse vrai vraie seul seule gentil gentille
    humain humaine public publique secret secrète calme grave fort forte faible pauvre riche
    dernier dernière premier première prochain prochaine même tel telle possible impossible
    important importante simple double triple sûr sûre dur dure drôle folle fou content contente
    riche pauvre proche propre sale sûr vieux jeune joli jolie blanc noir rouge vert bleu
    meilleur meilleure moindre moindre supérieur supérieure inférieur inférieure
    inquiet inquiète heureux heureuse malade mort morte vivant vivante
  ]).freeze

  def likely_adjective?(word)
    normalized = normalize(word)
    return true if IRREGULAR_ADJECTIVES.include?(normalized)
    return true if normalized.match?(ADJECTIVE_SUFFIX_PATTERN)

    false
  end

  def adjective_word?(word, noun_words:)
    normalized = normalize(word)
    return false unless likely_adjective?(normalized)
    return false if noun_words.include?(normalized) && !IRREGULAR_ADJECTIVES.include?(normalized) && !normalized.match?(ADJECTIVE_SUFFIX_PATTERN)

    true
  end

  def load_noun_words
    @noun_words ||= begin
      dico_dir = Rails.root.join("app/assets/dico")
      words = Set.new
      Dir.glob(dico_dir.join("Noms communs, *singulier (simplifié).json")).each do |path|
        JSON.parse(File.read(path)).each { |word| words << normalize(word) }
      end
      words
    end
  end
end
