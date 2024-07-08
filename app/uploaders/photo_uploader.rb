class PhotoUploader < CarrierWave::Uploader::Base
  include Cloudinary::CarrierWave

  process convert: 'jpg'
  process tags: ['post_picture']

  version :thumbnail do
    process resize_to_fill: [100, 100]
  end

  def extension_allowlist
    %w(jpg jpeg gif png dng)
  end

  def filename
    "#{secure_token}.jpg" if original_filename.present?
  end

  protected

  def secure_token
    var = :"@#{mounted_as}_secure_token"
    model.instance_variable_get(var) or model.instance_variable_set(var, SecureRandom.uuid)
  end

  def public_id
    "utopie2050/#{secure_token}"
  end
end
