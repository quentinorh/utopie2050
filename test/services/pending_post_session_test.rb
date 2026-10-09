require "test_helper"

class PendingPostSessionTest < ActiveSupport::TestCase
  test "l'adresse relie aussi les copies identiques récentes" do
    session = {}
    PendingPostSession.store(session, post_params("Services", "Un service.", "copie-1"))

    original = PendingPost.find_by!(client_token: "copie-1")
    PendingPost.create!(
      token: SecureRandom.urlsafe_base64(8),
      payload: original.payload,
      expires_at: 1.day.from_now
    )

    PendingPostSession.assign_email!(session, "Denis@example.com")

    assert_equal ["denis@example.com"], PendingPost.pluck(:email).uniq
  end

  test "la récupération par email publie une seule copie" do
    user = build_user
    session = {}
    PendingPostSession.store(session, post_params("Maisonnées", "Le texte.", "copie-2"))
    PendingPostSession.assign_email!(session, user.email)

    original = PendingPost.find_by!(client_token: "copie-2")
    PendingPost.create!(
      token: SecureRandom.urlsafe_base64(8),
      email: user.email,
      payload: original.payload,
      expires_at: 1.day.from_now
    )

    empty_session = {}
    posts = PendingPostSession.claimable_records(empty_session, user).map do |record|
      PendingPostSession.claim_record!(user, record)
    end

    assert_equal 1, posts.size
    assert posts.first.persisted?
    assert_equal "Maisonnées", posts.first.title
    assert_equal true, posts.first.draft
    assert_equal 0, PendingPost.count
  end

  private

  def post_params(title, body, client_token)
    {
      post: {
        title: title,
        body: body,
        draft: "1",
        client_token: client_token
      }
    }
  end

  def build_user
    user = User.new(email: "denis@example.com", username: "Denis Test", age: 40)
    user.skip_confirmation_notification!
    user.skip_confirmation!
    user.save!
    user
  end
end
