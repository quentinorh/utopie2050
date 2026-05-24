require "open-uri"
require "stringio"
require "tempfile"
require "uri"

class PostExportService
  RASTER_CONTENT_TYPES = %w[image/jpeg image/png image/webp].freeze
  COVER_ASPECT_RATIO = 5.0 / 4.0
  COVER_PAGE_MARGIN = 48
  FONTS_DIR = Rails.root.join("vendor/fonts")
  PDF_BODY_SIZE = 12
  PDF_BODY_LEADING = 9
  PDF_METADATA_SIZE = 8.25
  PDF_TITLE_SIZE = 22
  PDF_CHAPTER_SIZE = 16

  def self.detect_raster_content_type(reported, data)
    return reported if RASTER_CONTENT_TYPES.include?(reported)

    header = data.to_s.byteslice(0, 12).to_s
    return "image/jpeg" if header.start_with?("\xFF\xD8\xFF".b)
    return "image/png" if header.start_with?("\x89PNG\r\n\x1a\n".b)
    return "image/webp" if header.start_with?("RIFF".b) && header.byteslice(8, 4) == "WEBP"

    nil
  end

  def initialize(post, og_image_url: nil)
    @post = post
    @og_image_url = og_image_url.to_s.strip.presence || post.social_image_url
  end

  def filename_base
    @post.title.parameterize.presence || "futur-#{@post.id}"
  end

  def to_pdf
    require "prawn"

    cover = resolved_cover

    Prawn::Document.new(page_size: "A4", margin: cover ? COVER_PAGE_MARGIN : [72, 72, 72, 72]) do |pdf|
      render_pdf_cover_page(pdf, cover) if cover
      pdf.start_new_page(margin: [72, 72, 72, 72]) if cover

      setup_pdf_fonts(pdf)

      pdf.font "Apfel", style: :bold
      pdf.text @post.title, size: PDF_TITLE_SIZE
      pdf.move_down 16

      pdf.font "RobotoMono"
      pdf.text "Par #{@post.user.username}", size: PDF_METADATA_SIZE, color: "666666"
      pdf.text "Publié le #{@post.created_at.strftime('%d.%m.%Y')}", size: PDF_METADATA_SIZE, color: "666666"
      pdf.move_down 24

      render_text_block(pdf, @post.body)

      @post.chapters.each_with_index do |chapter, index|
        pdf.start_new_page
        pdf.font "Apfel", style: :bold
        pdf.text "Chapitre #{index + 1} : #{chapter.title}", size: PDF_CHAPTER_SIZE
        pdf.move_down 12
        render_text_block(pdf, chapter.body)
      end

      pdf.move_down 32
      pdf.stroke_horizontal_rule
      pdf.move_down 12
      pdf.font "RobotoMono"
      pdf.text license_text, size: PDF_METADATA_SIZE, color: "666666"
    end.render
  end

  def to_epub
    require "gepub"

    cover = resolved_cover
    book = GEPUB::Book.new
    book.primary_identifier("https://sp2050.fr/futurs/#{@post.id}", "SP2050-#{@post.id}", "URL")
    book.language = "fr"
    book.add_title(@post.title, title_type: GEPUB::TITLE_TYPE::MAIN)
    book.add_creator(@post.user.username, role: "aut")
    book.add_date(@post.created_at.iso8601)
    book.add_publisher("SP2050", nil)
    book.add_rights(license_text, nil)

    if cover
      cover_path = "images/cover.#{cover_extension(cover)}"
      book.add_item(cover_path, content: StringIO.new(cover[:data])).cover_image
    end

    book.ordered do
      if cover
        book.add_item("text/cover.xhtml", content: StringIO.new(cover_page_html(cover)))
          .landmark(type: "cover", title: "Couverture")
      end

      book.add_item("text/title.xhtml", content: StringIO.new(title_page_html)).toc_text(@post.title)

      if @post.body.present?
        book.add_item("text/body.xhtml", content: StringIO.new(body_page_html)).toc_text("Texte")
      end

      @post.chapters.each_with_index do |chapter, index|
        chapter_label = "Chapitre #{index + 1} : #{chapter.title}"
        book.add_item(
          "text/chapter-#{index + 1}.xhtml",
          content: StringIO.new(chapter_page_html(chapter, index + 1))
        ).toc_text(chapter_label)
      end
    end

    io = book.generate_epub_stream
    io.string
  end

  private

  def resolved_cover
    @resolved_cover ||= cover_from_attached_raster || cover_from_url(@og_image_url)
  end

  def cover_from_attached_raster
    return unless @post.cover_image.attached?

    content_type = @post.cover_image.blob.content_type.to_s
    return unless RASTER_CONTENT_TYPES.include?(content_type)

    data = @post.cover_image.download
    { data: data, content_type: content_type }
  rescue StandardError => e
    Rails.logger.warn("[PostExportService] Active Storage cover indisponible (post #{@post.id}): #{e.message}")
    nil
  end

  def cover_from_url(url)
    return if url.blank?

    uri = URI.parse(url)
    data = uri.open(open_timeout: 10, read_timeout: 30, "User-Agent" => "SP2050 Export", &:read)
    content_type = self.class.detect_raster_content_type("", data) || "image/jpeg"
    { data: data, content_type: content_type }
  rescue StandardError => e
    Rails.logger.error("[PostExportService] og:image (#{url}) : #{e.message}")
    nil
  end

  def cover_extension(cover)
    case cover[:content_type]
    when "image/png" then "png"
    when "image/webp" then "webp"
    else "jpg"
    end
  end

  def render_pdf_cover_page(pdf, cover)
    extension = cover_extension(cover) == "jpg" ? "jpeg" : cover_extension(cover)

    Tempfile.create(["cover", ".#{extension}"]) do |tmp|
      tmp.binmode
      tmp.write(cover[:data])
      tmp.flush

      pdf.image tmp.path,
                fit: [pdf.bounds.width, pdf.bounds.height],
                position: :center,
                vposition: :center
    end
  end

  def license_text
    "Texte publié par #{@post.user.username} sous licence Creative Commons BY-NC-SA 4.0."
  end

  def setup_pdf_fonts(pdf)
    pdf.font_families.update(
      "Apfel" => {
        normal: FONTS_DIR.join("ApfelGrotezk-Regular.ttf").to_s,
        bold: FONTS_DIR.join("ApfelGrotezk-Bold.ttf").to_s,
        italic: FONTS_DIR.join("ApfelGrotezk-Regular.ttf").to_s,
        bold_italic: FONTS_DIR.join("ApfelGrotezk-Bold.ttf").to_s
      },
      "RobotoMono" => {
        normal: FONTS_DIR.join("RobotoMono-VariableFont_wght.ttf").to_s,
        bold: FONTS_DIR.join("RobotoMono-VariableFont_wght.ttf").to_s,
        italic: FONTS_DIR.join("RobotoMono-VariableFont_wght.ttf").to_s,
        bold_italic: FONTS_DIR.join("RobotoMono-VariableFont_wght.ttf").to_s
      }
    )
  end

  def render_text_block(pdf, text)
    return if text.blank?

    pdf.font "Apfel"
    pdf.text text, size: PDF_BODY_SIZE, leading: PDF_BODY_LEADING
  end

  def cover_page_html(cover)
    cover_path = "../images/cover.#{cover_extension(cover)}"

    xhtml_document(
      title: "Couverture",
      epub_type: "cover",
      body: <<~HTML
        <figure id="cover">
          <img src="#{cover_path}" alt="#{escape_html(@post.title)}"/>
        </figure>
      HTML
    )
  end

  def title_page_html
    xhtml_document(
      title: @post.title,
      epub_type: "titlepage",
      body: <<~HTML
        <section id="titlepage">
          <h1>#{escape_html(@post.title)}</h1>
          <p class="meta">Par #{escape_html(@post.user.username)}</p>
          <p class="meta">Publié le #{@post.created_at.strftime('%d.%m.%Y')}</p>
        </section>
      HTML
    )
  end

  def body_page_html
    xhtml_document(
      title: "Texte",
      epub_type: "bodymatter",
      body: <<~HTML
        <section id="text">
          <div class="content">#{escape_html(@post.body)}</div>
          #{license_footer_html}
        </section>
      HTML
    )
  end

  def chapter_page_html(chapter, number)
    xhtml_document(
      title: chapter.title,
      epub_type: "chapter",
      body: <<~HTML
        <section id="chapter-#{number}">
          <h2>Chapitre #{number} : #{escape_html(chapter.title)}</h2>
          <div class="content">#{escape_html(chapter.body)}</div>
          #{chapter_license_footer_html(number)}
        </section>
      HTML
    )
  end

  def xhtml_document(title:, body:, epub_type: nil)
    type_attr = epub_type ? %( epub:type="#{epub_type}") : ""

    <<~HTML
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr" lang="fr">
        <head>
          <title>#{escape_html(title)}</title>
          <style>
            body { font-family: serif; line-height: 1.6; margin: 2em; }
            h1 { font-size: 1.8em; margin-bottom: 0.5em; }
            h2 { font-size: 1.4em; margin-bottom: 1em; }
            .meta { color: #666; font-size: 0.9em; margin-bottom: 2em; }
            .content { white-space: pre-wrap; }
            figure#cover { margin: 0; text-align: center; }
            figure#cover img { max-width: 100%; height: auto; }
            footer.license { margin-top: 3em; padding-top: 1em; border-top: 1px solid #ccc; color: #666; font-size: 0.85em; }
          </style>
        </head>
        <body#{type_attr}>
          #{body}
        </body>
      </html>
    HTML
  end

  def license_footer_html
    return "" if @post.chapters.any?

    <<~HTML
      <footer class="license">
        <p>#{escape_html(license_text)}</p>
      </footer>
    HTML
  end

  def chapter_license_footer_html(number)
    return "" unless number == @post.chapters.size

    <<~HTML
      <footer class="license">
        <p>#{escape_html(license_text)}</p>
      </footer>
    HTML
  end

  def escape_html(text)
    ERB::Util.html_escape(text.to_s)
  end
end
