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

  test "un compte existant reçoit le lien tout de suite, avec son pseudo" do
    user = build_user(email: "deja@example.com", username: "Déjà Là")
    stage_guest_post

    assert_no_difference "User.count" do
      post pending_auth_posts_path, params: { email: user.email }
    end

    assert_redirected_to pending_posts_path(mail_sent: 1)
    assert_equal 1, ActionMailer::Base.deliveries.size

    follow_redirect!
    assert_match "Déjà Là", response.body
    assert_match pending_cover_posts_path, response.body
  end

  test "la couverture en attente se remplace sans changer de page" do
    stage_guest_post
    file = Tempfile.new(["cover", ".jpg"])
    file.binmode
    file.write("\xFF\xD8\xFF\xD9")
    file.rewind
    upload = Rack::Test::UploadedFile.new(file.path, "image/jpeg")

    post pending_cover_posts_path, params: { cover_image: upload }

    assert_response :no_content
    assert PendingPost.order(:created_at).last.cover_image.attached?
  ensure
    file&.close!
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

  test "deux envois du même formulaire ne créent qu'un texte en attente" do
    2.times do
      post stage_posts_path, params: {
        post: { title: "Maisonnées", body: "Un texte.", draft: "1", client_token: "meme-formulaire" }
      }
    end

    assert_equal 1, PendingPost.count
    assert_equal "Maisonnées", PendingPost.last.payload["title"]
    assert_equal true, PendingPost.last.payload["draft"]
  end

  test "le lien magique publie le texte même sans le cookie de session" do
    post stage_posts_path, params: {
      post: { title: "Erasmus en Mycocratie", body: "Le texte du futur.", draft: "0", client_token: "erasmus" }
    }
    assert_difference "User.count", 1 do
      post pending_auth_posts_path, params: {
        email: "perdu@example.com",
        username: "Auteur Perdu",
        age: "33",
        terms_accepted: "1"
      }
    end

    assert_equal "perdu@example.com", PendingPost.last.email
    magic = magic_token_from_last_mail
    reset!

    get user_magic_link_path(magic)

    assert_redirected_to claim_posts_path
    assert_difference "Post.count", 1 do
      follow_redirect!
    end

    published = Post.find_by!(title: "Erasmus en Mycocratie")
    assert_redirected_to post_path(published)
    assert_equal "perdu@example.com", published.user.email
    assert_equal 0, PendingPost.where(email: "perdu@example.com").count
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

  def magic_token_from_last_mail
    mail = ActionMailer::Base.deliveries.last
    body = mail.text_part&.decoded || mail.body.decoded
    body[/\/users\/magic_link\/(\S+)/, 1]
  end
end
