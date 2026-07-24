require "test_helper"

class IdeaGeneratorServiceTest < ActiveSupport::TestCase
  test "spark returns a noun and agreed adjective" do
    result = IdeaGeneratorService.spark(part: "both")

    assert result[:noun].present?
    assert result[:adjective].present?
    assert_equal "#{result[:noun]} #{result[:adjective]}", result[:phrase]
    assert_agreement(result)
  end

  test "spark keeps noun when randomizing adjective only" do
    first = IdeaGeneratorService.spark(part: "both")
    second = IdeaGeneratorService.spark(part: "adjective", noun: first[:noun], adjective: first[:adjective])

    assert_equal first[:noun], second[:noun]
    assert second[:adjective].present?
    assert_agreement(second)
  end

  test "spark keeps adjective when randomizing noun only" do
    result = IdeaGeneratorService.spark(part: "both")
    updated = IdeaGeneratorService.spark(part: "noun", noun: result[:noun], adjective: result[:adjective])

    assert updated[:noun].present?
    assert_equal result[:adjective], updated[:adjective]
    assert_not_equal result[:noun], updated[:noun] if nouns_available?(result, except: result[:noun])
    assert_agreement(updated)
  end

  private

  def nouns_available?(result, except:)
    entry = IdeaGeneratorService.send(:find_noun, result[:noun])
    return false unless entry

    nouns = IdeaGeneratorService.send(:nouns_for, entry[:gender], entry[:number])
    nouns.many? || nouns.reject { |noun| noun == except }.any?
  end

  def assert_agreement(result)
    entry = IdeaGeneratorService.send(:find_noun, result[:noun])
    assert entry, "noun should be found in dictionary"

    adjectives = IdeaGeneratorService.send(:adjectives_for, entry[:gender], entry[:number])
    assert_includes adjectives, result[:adjective]
  end
end
