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

  def hsl_to_rgba(hsl_color, alpha = 0.1)
    match = hsl_color.match(/hsl\((\d+), (\d+)%, (\d+)%\)/)
    hue, saturation, lightness = match[1].to_i, match[2].to_i, match[3].to_i

    rgb = hsv_to_rgb(hue / 360.0, saturation / 100.0, lightness / 100.0)
    r, g, b = rgb.map { |c| (c * 255).to_i }
    "rgba(#{r}, #{g}, #{b}, #{alpha})"
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
