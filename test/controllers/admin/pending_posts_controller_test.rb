require "test_helper"

class Admin::PendingPostsControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @admin = build_user(email: "admin@example.com", username: "Admin", role: "admin")
    @author = build_user(email: "auteur@example.com", username: "Auteur Attente")
    @pending = PendingPost.create!(
      token: SecureRandom.urlsafe_base64(8),
      payload: { "title" => "Texte orphelin", "body" => "Toujours là.", "draft" => false },
      expires_at: 2.days.from_now
    )
    sign_in @admin
  end

  test "un admin associe une adresse puis rattache le texte au compte" do
    patch admin_pending_post_path(@pending), params: { email: "Auteur@example.com" }
    assert_redirected_to admin_dashboard_path
    assert_equal "auteur@example.com", @pending.reload.email

    assert_difference "Post.count", 1 do
      patch admin_pending_post_path(@pending), params: { email: "auteur@example.com", claim: "1" }
    end

    published = Post.find_by!(title: "Texte orphelin")
    assert_equal @author, published.user
    assert_nil PendingPost.find_by(id: @pending.id)
  end

  private

  def build_user(email:, username:, role: nil)
    user = User.new(email: email, username: username, age: 30, role: role)
    user.skip_confirmation_notification!
    user.skip_confirmation!
    user.save!
    user
  end
end
