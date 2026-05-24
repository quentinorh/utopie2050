require "nokogiri"
require "zip"

class EpubComplianceValidator
  Error = Struct.new(:code, :message, keyword_init: true)

  def self.validate(epub_bytes)
    new(epub_bytes).validate
  end

  def initialize(epub_bytes)
    @epub_bytes = epub_bytes
    @errors = []
  end

  def validate
    Zip::File.open_buffer(StringIO.new(@epub_bytes)) do |zip|
      check_mimetype(zip)
      check_container(zip)
      check_package(zip)
      check_content_documents(zip)
    end

    @errors
  end

  def valid?
    validate.empty?
  end

  private

  def check_mimetype(zip)
    entry = zip.find_entry("mimetype")
    add_error("OCF-001", "mimetype manquant") unless entry
    return unless entry

    add_error("OCF-002", "mimetype doit être stocké sans compression") unless entry.compression_method == Zip::Entry::STORED
    add_error("OCF-003", "mimetype incorrect") unless entry.get_input_stream.read == "application/epub+zip"
    add_error("OCF-004", "mimetype doit être la première entrée du ZIP") unless zip.entries.first&.name == "mimetype"
  end

  def check_container(zip)
    entry = zip.find_entry("META-INF/container.xml")
    add_error("OCF-005", "META-INF/container.xml manquant") unless entry
    return unless entry

    doc = Nokogiri::XML(entry.get_input_stream.read)
    rootfile = doc.at_xpath("//xmlns:rootfile", "xmlns" => "urn:oasis:names:tc:opendocument:xmlns:container")
    add_error("OCF-006", "rootfile OPF manquant") unless rootfile
    @opf_path = rootfile["full-path"] if rootfile
  end

  def check_package(zip)
    add_error("OPF-001", "chemin OPF inconnu") unless @opf_path

    entry = zip.find_entry(@opf_path)
    add_error("OPF-002", "package.opf introuvable (#{@opf_path})") unless entry
    return unless entry

    @package = Nokogiri::XML(entry.get_input_stream.read)
    ns = { "opf" => "http://www.idpf.org/2007/opf", "dc" => "http://purl.org/dc/elements/1.1/" }

    version = @package.at_xpath("//opf:package", ns)&.[]("version")
    add_error("OPF-003", "version OPF absente") unless version
    add_error("OPF-004", "version OPF non supportée (#{version})") unless version.to_s.start_with?("3.")

    %w[identifier title language creator date].each do |field|
      add_error("OPF-010", "dc:#{field} manquant") unless @package.at_xpath("//dc:#{field}", ns)
    end

    nav = @package.at_xpath("//opf:item[@properties and contains(@properties, 'nav')]", ns)
    add_error("NAV-001", "document de navigation (properties=nav) manquant") unless nav

    cover = @package.at_xpath("//opf:item[@properties and contains(@properties, 'cover-image')]", ns)
    add_error("OPF-011", "cover-image manquant dans le manifest") unless cover

    @manifest_hrefs = @package.xpath("//opf:manifest/opf:item", ns).each_with_object({}) do |item, hash|
      hash[item["id"]] = File.join(File.dirname(@opf_path), item["href"])
    end

    @package.xpath("//opf:spine/opf:itemref", ns).each do |itemref|
      href = @manifest_hrefs[itemref["idref"]]
      add_error("OPF-020", "spine itemref invalide: #{itemref['idref']}") unless href && zip.find_entry(href)
    end

    nav_href = nav&.[]("href")
    return unless nav_href

    nav_path = File.join(File.dirname(@opf_path), nav_href)
    add_error("NAV-002", "nav.xhtml introuvable") unless zip.find_entry(nav_path)

    nav_doc = Nokogiri::XML(zip.find_entry(nav_path).get_input_stream.read)
    add_error("NAV-003", "nav epub:type=toc manquant") unless nav_doc.at_xpath("//*[@epub:type='toc']")
  end

  def check_content_documents(zip)
    zip.each do |entry|
      next unless entry.name.end_with?(".xhtml", ".html")
      next if entry.name.end_with?("nav.xhtml")

      content = entry.get_input_stream.read
      doc = Nokogiri::XML(content) { |config| config.strict }

      html = doc.at_xpath("/*[local-name()='html']")
      xhtml_ns = "http://www.w3.org/1999/xhtml"

      add_error("HTM-001", "#{entry.name}: élément html manquant") unless html
      add_error("HTM-002", "#{entry.name}: xmlns XHTML manquant") unless html&.namespace&.href == xhtml_ns
      add_error("HTM-003", "#{entry.name}: xml:lang manquant") unless html&.[]("xml:lang").present?
      add_error("HTM-004", "#{entry.name}: titre manquant") unless doc.at_xpath("//xhtml:title", "xhtml" => xhtml_ns)

      doc.xpath("//xhtml:img", "xhtml" => xhtml_ns).each do |img|
        add_error("HTM-010", "#{entry.name}: img sans attribut alt") unless img["alt"]
      end
    rescue Nokogiri::XML::SyntaxError => e
      add_error("HTM-020", "#{entry.name}: XML invalide (#{e.message})")
    end
  end

  def add_error(code, message)
    @errors << Error.new(code: code, message: message)
  end
end
