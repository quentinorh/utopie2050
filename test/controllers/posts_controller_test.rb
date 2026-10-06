require "test_helper"

class PostsControllerTest < ActionDispatch::IntegrationTest
  setup do
    ActionMailer::Base.deliveries.clear
    ActionMailer::Base.default_url_options[:host] = "www.example.com"
    ActionView::Base.check_precompiled_asset = false if ActionView::Base.respond_to?(:check_precompiled_asset=)
  end

  test "un invité sans pseudo ni conditions ne crée pas de compte" do
    stage_guest_post

    assert_no_difference "User.count" do
      post pending_auth_posts_path, params: { email: "nouveau@example.com" }
    end

    assert_response :unprocessable_entity
    assert_select "input[name=username]"
    assert_select "input[name=terms_accepted]"
    assert_select "h3", text: "Futurs désirables"
    assert_nil User.find_by(email: "nouveau@example.com")
  end

  test "un pseudo sans acceptation des conditions ne crée pas de compte" do
    stage_guest_post

    assert_no_difference "User.count" do
      post pending_auth_posts_path, params: {
        email: "nouveau@example.com",
        username: "Auteur Futur"
      }
    end

    assert_response :unprocessable_entity
    assert_select "input[name=terms_accepted]"
    assert_select "input[name=username][type=hidden][value=?]", "Auteur Futur"
  end

  test "un nouveau compte exige un pseudo réel et les conditions" do
    stage_guest_post

    assert_difference "User.count", 1 do
      post pending_auth_posts_path, params: {
        email: "nouveau@example.com",
        username: "Auteur Futur",
        age: "42",
        terms_accepted: "1"
      }
    end

    user = User.find_by!(email: "nouveau@example.com")
    assert_equal "Auteur Futur", user.username
    assert_equal 42, user.age
    assert_redirected_to pending_posts_path(mail_sent: 1)

    follow_redirect!
    assert_match "Auteur Futur", response.body
    assert_equal 1, ActionMailer::Base.deliveries.size
  end

  test "un compte existant reçoit le lien avec son pseudo, sans en créer un autre" do
    user = build_user(email: "deja@example.com", username: "Déjà Là")
    stage_guest_post

    assert_no_difference "User.count" do
      post pending_auth_posts_path, params: { email: user.email }
    end

    assert_response :success
    assert_select "input[name=cover_refreshed][value=1]"
    assert_match "Déjà Là", response.body
    assert_empty ActionMailer::Base.deliveries

    post pending_auth_posts_path, params: { email: user.email, cover_refreshed: "1" }

    assert_redirected_to pending_posts_path(mail_sent: 1)
    follow_redirect!
    assert_match "Déjà Là", response.body
    assert_equal 1, ActionMailer::Base.deliveries.size
  end

  test "un pseudo déjà pris reste sur l'étape d'identité" do
    build_user(email: "pris@example.com", username: "Nom Pris")
    stage_guest_post

    assert_no_difference "User.count" do
      post pending_auth_posts_path, params: {
        email: "autre@example.com",
        username: "Nom Pris",
        terms_accepted: "1"
      }
    end

    assert_response :unprocessable_entity
    assert_match "déjà pris", response.body
    assert_select "input[name=username][value=?]", "Nom Pris"
    assert_nil User.find_by(email: "autre@example.com")
  end

  private

  def stage_guest_post
    post stage_posts_path, params: { post: { title: "Un futur désirable", body: "Demain.", draft: "0" } }
    assert_redirected_to pending_posts_path
  end

  def build_user(email:, username:)
    user = User.new(email: email, username: username, age: 30)
    user.skip_confirmation_notification!
    user.save!
    user
  end
end
