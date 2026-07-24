class IdeaGeneratorService
  DICO_DIR = Rails.root.join("app/assets/dico")

  FILES = {
    nouns: {
      m: {
        s: "Noms communs masculin singulier.json",
        p: "Noms communs masculin pluriel.json"
      },
      f: {
        s: "Noms communs féminin singulier.json",
        p: "Noms communs féminin pluriel.json"
      }
    },
    adjectives: {
      m: {
        s: "Adjectifs masculin singuler.json",
        p: "Adjectifs masculin pluriel.json"
      },
      f: {
        s: "Adjectifs féminin singulier.json",
        p: "Adjectifs féminin pluriel.json"
      }
    }
  }.freeze

  GENDERS = %w[m f].freeze
  NUMBERS = %w[s p].freeze

  class << self
    def spark(part: "both", noun: nil, adjective: nil)
      part = part.to_s
      previous_noun_entry = find_noun(noun)

      noun_entry, adjective_word = case part
      when "noun"
        noun_for_adjective_change(adjective, except: noun)
      when "adjective"
        entry = previous_noun_entry || random_noun
        [entry, random_adjective_for(entry, except: adjective)]
      else
        entry = random_noun
        [entry, random_adjective_for(entry)]
      end

      {
        noun: noun_entry[:word],
        adjective: adjective_word,
        phrase: "#{noun_entry[:word]} #{adjective_word}"
      }
    end

    private

    def random_noun
      gender = GENDERS.sample
      number = NUMBERS.sample
      random_noun_for(gender: gender, number: number)
    end

    def random_noun_for(gender:, number:, except: nil)
      list = nouns_for(gender, number)
      normalized_except = normalize(except)

      candidates = if normalized_except.present?
        list.reject { |entry| normalize(entry) == normalized_except }
      else
        list
      end

      { word: candidates.sample || list.sample, gender: gender, number: number }
    end

    def noun_for_adjective_change(adjective, except: nil)
      agreement = find_adjective(adjective) || find_noun(except)

      unless agreement
        entry = random_noun
        return [entry, random_adjective_for(entry)]
      end

      noun_entry = random_noun_for(
        gender: agreement[:gender],
        number: agreement[:number],
        except: except
      )
      adjective_word = find_adjective(adjective)&.dig(:word) || adjective.to_s.strip

      [noun_entry, adjective_word]
    end

    def find_noun(word)
      normalized = normalize(word)
      return nil if normalized.blank?

      GENDERS.each do |gender|
        NUMBERS.each do |number|
          match = nouns_for(gender, number).find { |entry| normalize(entry) == normalized }
          return { word: match, gender: gender, number: number } if match
        end
      end

      nil
    end

    def find_adjective(word)
      normalized = normalize(word)
      return nil if normalized.blank?

      GENDERS.each do |gender|
        NUMBERS.each do |number|
          match = adjectives_for(gender, number).find { |entry| normalize(entry) == normalized }
          return { word: match, gender: gender, number: number } if match
        end
      end

      nil
    end

    def random_adjective_for(noun_entry, except: nil)
      list = adjectives_for(noun_entry[:gender], noun_entry[:number])
      normalized_except = normalize(except)

      candidates = if normalized_except.present?
        list.reject { |entry| normalize(entry) == normalized_except }
      else
        list
      end

      candidates.sample || list.sample
    end

    def nouns_for(gender, number)
      load_word_list(FILES[:nouns][gender.to_sym][number.to_sym])
    end

    def adjectives_for(gender, number)
      load_word_list(FILES[:adjectives][gender.to_sym][number.to_sym])
    end

    def load_word_list(filename)
      @word_lists ||= {}
      @word_lists[filename] ||= begin
        path = DICO_DIR.join(filename)
        JSON.parse(File.read(path))
      end
    end

    def normalize(word)
      word.to_s.strip.downcase
    end
  end
end
