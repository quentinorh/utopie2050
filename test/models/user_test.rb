require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "l'âge ne garde que le nombre" do
    assert_equal 60, build_user(age: "60 ans").age
    assert_equal 60, build_user(age: " 60 ").age
    assert_equal 60, build_user(age: 60).age
    assert_equal 103, build_user(age: "j'aurai 103 ans").age
  end

  test "un âge sans chiffre est refusé avec un message en français" do
    user = build_user(age: "soixante")

    assert_not user.valid?
    assert_equal ["L'âge doit être un nombre, par exemple 60"], user.errors.full_messages_for(:age)
  end

  test "les doublons sont expliqués en français" do
    existing = build_user(age: 30)
    existing.save!

    duplicate = build_user(age: 30, email: existing.email, username: existing.username)

    assert_not duplicate.valid?
    assert_includes duplicate.errors.full_messages, "L'adresse email est déjà utilisée"
    assert_includes duplicate.errors.full_messages, "Le nom d'auteur·ice est déjà pris"
  end

  private

  def build_user(age:, email: "age@example.com", username: "Âge Test")
    user = User.new(email: email, username: username, age: age)
    user.skip_confirmation_notification!
    user
  end
end
