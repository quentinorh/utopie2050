class AttachCoverImageJob < ApplicationJob
  queue_as :default

  RASTER_CONTENT_TYPES = %w[image/jpeg image/png image/webp].freeze

  def perform(post_id)
    post = Post.find(post_id)
    return unless post.cover.present?

    # JPEG/PNG généré côté client (titre + auteur sur le motif) pour les réseaux — ne pas écraser.
    if post.cover_image.attached?
      ct = post.cover_image.blob&.content_type.to_s
      return if RASTER_CONTENT_TYPES.include?(ct)
    end

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
