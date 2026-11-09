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

  test "un compte non confirmé peut changer d'adresse pour la même publication" do
    user = build_user(age: 40, email: "ancienne@example.com", username: "Corrigé")
    user.save!

    reclaimed = User.reclaim_unconfirmed_for_pending!(
      username: "Corrigé",
      new_email: "nouvelle@example.com",
      previous_email: "ancienne@example.com",
      age: "41"
    )

    assert_equal user, reclaimed
    assert_equal "nouvelle@example.com", user.reload.email
    assert_equal 41, user.age
    assert_nil user.unconfirmed_email
  end

  test "un compte confirmé ne peut pas être récupéré pour une autre adresse" do
    user = build_user(age: 40, email: "confirme@example.com", username: "Déjà Confirmé")
    user.skip_confirmation_notification!
    user.save!
    user.confirm

    assert_nil User.reclaim_unconfirmed_for_pending!(
      username: "Déjà Confirmé",
      new_email: "autre@example.com",
      previous_email: "confirme@example.com"
    )
    assert_equal "confirme@example.com", user.reload.email
  end

  private

  def build_user(age:, email: "age@example.com", username: "Âge Test")
    user = User.new(email: email, username: username, age: age)
    user.skip_confirmation_notification!
    user
  end
end
