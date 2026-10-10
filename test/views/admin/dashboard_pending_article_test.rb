require "test_helper"

class AdminDashboardPendingArticleTest < ActionView::TestCase
  test "la carte en attente propose de rattacher une adresse" do
    pending = PendingPost.create!(
      token: SecureRandom.urlsafe_base64(8),
      email: "auteur@example.com",
      payload: { "title" => "Texte orphelin", "body" => "Toujours là.", "draft" => true },
      expires_at: 2.days.from_now
    )

    render partial: "admin/dashboard/pending_article", locals: { pending: pending }

    assert_includes rendered, "en attente"
    assert_includes rendered, "brouillon"
    assert_includes rendered, "Texte orphelin"
    assert_includes rendered, "auteur@example.com"
    assert_includes rendered, "Ajouter un email"
    assert_includes rendered, "Rattacher"
    assert_includes rendered, "bottom-1.5"
    assert_includes rendered, admin_pending_post_path(pending)

    @articles = [pending]
    @posts = []
    @pending_posts = [pending]
    @users = []
    @reports = []
    @event_codes = []

    render template: "admin/dashboard/index", layout: false

    assert_includes rendered, "en attente"
    assert_includes rendered, "Rattacher"
    assert_not_includes rendered, "Textes en attente"
    assert_includes rendered, "bottom-1.5"
  end

  test "les boutons d'un article publié sont sur la couverture" do
    user = User.new(email: "publie@example.com", username: "Publié", age: 30)
    user.skip_confirmation_notification!
    user.skip_confirmation!
    user.save!
    post = user.posts.create!(title: "Déjà publié", body: "Le texte.")

    render partial: "admin/dashboard/article", locals: { post: post }

    assert_includes rendered, "bottom-1.5"
    assert_includes rendered, post_path(post)
    assert_includes rendered, edit_post_path(post)
    assert_not_includes rendered, "bottom-[2.9rem]"
  end
end
