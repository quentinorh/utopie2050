class PendingPostSession
  SESSION_KEY = :pending_post_token
  LEGACY_SESSION_KEY = :pending_post
  TTL = 7.days

  class << self
    def store(session, params)
      clear(session)

      post = params.fetch(:post, {})
      pending = PendingPost.create!(
        token: SecureRandom.urlsafe_base64(32),
        payload: build_payload(post),
        expires_at: TTL.from_now
      )

      cover_image = post[:cover_image]
      pending.cover_image.attach(cover_image) if cover_image.present?

      session[SESSION_KEY] = pending.token
      pending.payload
    end

    def fetch(session)
      find_record(session)&.payload
    end

    def find_record(session)
      migrate_legacy_session!(session)

      token = session[SESSION_KEY]
      return nil if token.blank?

      record = PendingPost.active.find_by(token: token)
      clear(session) unless record
      record
    end

    def clear(session)
      token = session[SESSION_KEY]
      PendingPost.find_by(token: token)&.destroy if token.present?
      session.delete(SESSION_KEY)
      session.delete(LEGACY_SESSION_KEY)
    end

    def draft?(data)
      data["draft"] == true
    end

    # JSON des réglages de couverture, prêt pour l'input du moteur.
    # Chaîne vide si le payload n'a pas un motif complet.
    def pattern_settings_json(data)
      raw = data["pattern_settings"]
      return "" if raw.blank?

      parsed = raw.is_a?(String) ? JSON.parse(raw) : raw
      return "" unless parsed.is_a?(Hash)

      parsed = parsed.stringify_keys
      keys = %w[symmetryMode color firstSliderControl secondSliderControl rows columns smoothing]
      return "" unless keys.all? { |key| !parsed[key].nil? && parsed[key] != "" }

      parsed.to_json
    rescue JSON::ParserError, TypeError
      ""
    end

    def build_post(user, data)
      post = user.posts.build(
        title: data["title"],
        body: data["body"],
        draft: data["draft"],
        cover: data["cover"],
        pattern_settings: data["pattern_settings"],
        color: data["color"]
      )

      assign_chapters(post, data["chapters_attributes"])
      post
    end

    def assign_event_code(post, event_code_value)
      if event_code_value.present?
        post.event_code = EventCode.find_by(code: event_code_value)
      else
        post.event_code = nil
      end
    end

    def attach_cover_image(post, pending_record)
      return unless pending_record&.cover_image&.attached?

      post.cover_image.attach(pending_record.cover_image.blob)
    end

    private

    def build_payload(post)
      {
        "title" => post[:title].to_s.strip,
        "body" => post[:body].to_s,
        "draft" => cast_draft(post[:draft]),
        "cover" => post[:cover],
        "pattern_settings" => post[:pattern_settings],
        "color" => post[:color],
        "event_code" => post[:event_code].to_s.strip.presence,
        "chapters_attributes" => normalize_chapters(post[:chapters_attributes])
      }
    end

    def migrate_legacy_session!(session)
      legacy = session[LEGACY_SESSION_KEY]
      return unless legacy.is_a?(Hash) && legacy.present?

      pending = PendingPost.create!(
        token: SecureRandom.urlsafe_base64(32),
        payload: legacy.stringify_keys,
        expires_at: TTL.from_now
      )
      session[SESSION_KEY] = pending.token
      session.delete(LEGACY_SESSION_KEY)
    end

    def cast_draft(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end

    def normalize_chapters(raw)
      return [] unless raw.is_a?(ActionController::Parameters) || raw.is_a?(Hash)

      raw.values.filter_map do |chapter|
        next if ActiveModel::Type::Boolean.new.cast(chapter[:_destroy])

        {
          "title" => chapter[:title].to_s.strip,
          "body" => chapter[:body].to_s,
          "position" => chapter[:position].presence
        }.compact
      end
    end

    def assign_chapters(post, chapters)
      Array(chapters).each_with_index do |chapter, index|
        post.chapters.build(
          title: chapter["title"],
          body: chapter["body"],
          position: chapter["position"].presence || index + 1
        )
      end
    end
  end
end
