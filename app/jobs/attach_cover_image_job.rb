class AttachCoverImageJob < ApplicationJob
  queue_as :default

  def perform(post_id)
    post = Post.find(post_id)
    return unless post.cover.present?

    post.cover_image.attach(
      io: StringIO.new(post.cover),
      filename: "cover-#{Time.current.to_i}.svg",
      content_type: 'image/svg+xml'
    )
  rescue => e
    Rails.logger.error "Erreur lors de l'attachement de l'image: #{e.message}"
    post.errors.add(:cover_image, "n'a pas pu être attachée")
  end
end
