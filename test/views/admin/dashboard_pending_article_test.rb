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
    assert_includes rendered, "Rattacher"
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
  end
end
