class PendingPostSession
  SESSION_KEY = :pending_post_token
  LEGACY_SESSION_KEY = :pending_post
  TTL = 7.days
  DUPLICATE_WINDOW = 30.minutes

  class << self
    def store(session, params)
      post = params.fetch(:post, {})
      client_token = post[:client_token].to_s.strip.presence
      payload = build_payload(post)
      pending = locate_pending(session, client_token)

      if pending
        begin
          pending.update!(
            payload: payload,
            expires_at: TTL.from_now,
            client_token: client_token || pending.client_token
          )
        rescue ActiveRecord::RecordNotUnique
          pending = PendingPost.find_by!(client_token: client_token)
          pending.update!(payload: payload, expires_at: TTL.from_now)
        end
      else
        pending = create_pending(client_token, payload)
      end

      # Le jeton est posé avant l'upload : une couverture lente ou en échec
      # ne doit pas laisser la session sans texte.
      session[SESSION_KEY] = pending.token
      attach_new_cover(pending, post[:cover_image])
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

    def pending_for?(session, user = nil)
      find_record(session).present? || PendingPost.for_email(user&.email).exists?
    end

    def assign_email!(session, email)
      normalized = email.to_s.strip.downcase
      return if normalized.blank?

      record = find_record(session)
      return unless record

      record.update!(email: normalized, expires_at: TTL.from_now)
      key = text_key(record)
      PendingPost.active
                 .where(email: [nil, ""])
                 .where("created_at > ?", DUPLICATE_WINDOW.ago)
                 .find_each do |other|
        next if other.id == record.id
        next unless text_key(other) == key

        other.update!(email: normalized, expires_at: TTL.from_now)
      end
      record
    end

    # Un enregistrement par texte. Le cookie et l'adresse sont fusionnés,
    # les copies identiques ne produisent qu'un futur.
    def claimable_records(session, user)
      found = []
      found << find_record(session)
      found.concat(PendingPost.for_email(user&.email).order(created_at: :desc).to_a)
      found.compact!
      found.uniq!(&:id)
      found.group_by { |record| text_key(record) }.values.map { |group| group.max_by(&:created_at) }
    end

    def claim_record!(user, record)
      payload = record.payload || {}
      post = build_post(user, payload)
      assign_event_code(post, payload["event_code"])
      return post unless post.save

      attach_cover_image(post, record)
      consume_record!(record)
      post
    end

    def clear_token!(session)
      session.delete(SESSION_KEY)
      session.delete(LEGACY_SESSION_KEY)
    end

    def clear(session)
      token = session[SESSION_KEY]
      PendingPost.find_by(token: token)&.destroy if token.present?
      clear_token!(session)
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
    rescue StandardError => e
      Rails.logger.error "[PendingPost] Couverture non reprise : #{e.message}"
    end

    private

    def locate_pending(session, client_token)
      if client_token
        found = PendingPost.find_by(client_token: client_token)
        return found if found
      end

      token = session[SESSION_KEY]
      return nil if token.blank?

      PendingPost.active.find_by(token: token)
    end

    def create_pending(client_token, payload)
      PendingPost.create!(
        token: SecureRandom.urlsafe_base64(32),
        client_token: client_token,
        payload: payload,
        expires_at: TTL.from_now
      )
    rescue ActiveRecord::RecordNotUnique
      pending = PendingPost.find_by!(client_token: client_token)
      pending.update!(payload: payload, expires_at: TTL.from_now)
      pending
    end

    def attach_new_cover(pending, cover_image)
      return if cover_image.blank?

      pending.cover_image.attach(cover_image)
    rescue StandardError => e
      Rails.logger.error "[PendingPost] Couverture non enregistrée : #{e.message}"
    end

    def consume_record!(record)
      key = text_key(record)
      email = record.email.to_s.downcase
      ids = [record.id]
      if email.present?
        PendingPost.where("LOWER(email) = ?", email).find_each do |other|
          ids << other.id if text_key(other) == key
        end
      end
      PendingPost.where(id: ids.uniq).destroy_all
    end

    def text_key(record)
      data = (record.payload || {}).stringify_keys
      chapters = Array(data["chapters_attributes"]).map do |chapter|
        chapter = chapter.stringify_keys
        [chapter["title"].to_s, chapter["body"].to_s]
      end
      [data["title"].to_s.strip, data["body"].to_s, cast_draft(data["draft"]), chapters]
    end

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
