require "test_helper"

class PostExportServiceTest < ActiveSupport::TestCase
  test "export includes cover when og:image is available" do
    post = Post.find_by(id: 103)
    skip "post 103 unavailable in test database" unless post
    skip "post 103 has no cover_image in test database" unless post.cover_image.attached?

    og_url = post.social_image_url
    skip "post 103 has no social_image_url" if og_url.blank?

    service = PostExportService.new(post, og_image_url: og_url)
    cover = service.send(:resolved_cover)

    assert cover, "expected a cover image for post #{post.id}"
    assert cover[:data].bytesize.positive?
    assert_includes PostExportService::RASTER_CONTENT_TYPES, cover[:content_type]

    pdf = service.to_pdf
    assert pdf.start_with?("%PDF")
    assert pdf.bytesize > 100_000, "expected PDF with embedded cover (>100KB), got #{pdf.bytesize} bytes"
    assert_includes pdf, "/Subtype /Image"

    epub = service.to_epub
    assert epub.bytesize > cover[:data].bytesize
    assert_includes epub, "cover.jpg"
    assert EpubComplianceValidator.validate(epub).empty?, EpubComplianceValidator.validate(epub).map { |e| "[#{e.code}] #{e.message}" }.join("\n")
  end
end
