module ApplicationHelper
  def hue_to_feColorMatrix(hue)
    rgb = hsv_to_rgb(hue / 360.0, 1, 1)
    r, g, b = rgb.map { |c| c / 255.0 }
    # Adjust the matrix to apply the color to dark areas and blend to white
    matrix = [
      1-r, 0, 0, 0, r,
      1-g, 0, 0, 0, g,
      1-b, 0, 0, 0, b,
      0, 0, 0, 1, 0
    ]
    matrix.join(' ')
  end

  private

  def hsl_to_rgb(h, s, l)
    s /= 100.0
    l /= 100.0
  
    c = (1 - (2 * l - 1).abs) * s
    x = c * (1 - ((h / 60.0) % 2 - 1).abs)
    m = l - c / 2
  
    r, g, b = case h
    when 0..60
      [c, x, 0]
    when 60..120
      [x, c, 0]
    when 120..180
      [0, c, x]
    when 180..240
      [0, x, c]
    when 240..300
      [x, 0, c]
    when 300..360
      [c, 0, x]
    end
  
    [(r + m) * 255, (g + m) * 255, (b + m) * 255].map(&:round)
  end

  def hsv_to_rgb(h, s, v)
    i = (h * 6).to_i
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    r, g, b = case i % 6
              when 0 then [v, t, p]
              when 1 then [q, v, p]
              when 2 then [p, v, t]
              when 3 then [p, q, v]
              when 4 then [t, p, v]
              when 5 then [v, p, q]
              end
    [(r * 255).to_i, (g * 255).to_i, (b * 255).to_i]
  end
end
