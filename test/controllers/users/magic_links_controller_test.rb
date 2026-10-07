require "test_helper"

class Users::MagicLinksControllerTest < ActionDispatch::IntegrationTest
  setup do
    ActionMailer::Base.deliveries.clear
    ActionMailer::Base.default_url_options[:host] = "www.example.com"
    ActionView::Base.check_precompiled_asset = false if ActionView::Base.respond_to?(:check_precompiled_asset=)
  end

  test "une adresse connue ouvre une page de lien envoyé" do
    user = build_user(email: "connu@example.com")

    post user_magic_links_path, params: { user: { email: "Connu@example.com" } }

    assert_redirected_to user_magic_link_result_path
    assert_equal 1, ActionMailer::Base.deliveries.size
    assert_equal [user.email], ActionMailer::Base.deliveries.last.to

    follow_redirect!
    assert_response :success
    assert_select "h1", text: "Lien envoyé"
    assert_match "connu@example.com", response.body
    assert_select "a", text: "Essayer une autre adresse"
  end

  test "une adresse inconnue invite à créer un compte" do
    assert_no_difference "ActionMailer::Base.deliveries.size" do
      post user_magic_links_path, params: { user: { email: "inconnu@example.com" } }
    end

    assert_redirected_to user_magic_link_result_path
    follow_redirect!
    assert_response :success
    assert_select "h1", text: "Adresse inconnue"
    assert_match "inconnu@example.com", response.body
    assert_select "a", text: "Créer mon compte"
    assert_select "a[href=?]", new_user_registration_path(email: "inconnu@example.com")
  end

  test "la page de résultat sans parcours renvoie à la connexion" do
    get user_magic_link_result_path
    assert_redirected_to new_user_session_path
  end

  private

  def build_user(email:)
    user = User.new(email: email, username: "Auteur", age: 30)
    user.skip_confirmation_notification!
    user.skip_confirmation!
    user.save!
    user
  end
end
