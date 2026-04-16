# 3 histoires sur le futur en 2050
# Usage: rails runner db/seeds/stories_2050.rb

# Ensure we have a user
user = User.find_by(role: "admin") || User.first
unless user
  puts "No user found. Run main seeds first."
  exit
end

def generate_cover_params
  modes = ['x4', 'x8', 'x16']
  hue = rand(0..360)
  {
    symmetryMode: modes.sample,
    color: hue,
    firstSliderControl: rand(10..90),
    secondSliderControl: rand(10..90),
    rows: rand(1..4),
    columns: rand(1..4),
    smoothing: rand(30..95),
    hue: hue
  }
end

def hsl_to_hex(h, s, l)
  l_f = l / 100.0
  a = s * [l_f, 1 - l_f].min / 100.0
  f = ->(n) {
    k = (n + h / 30.0) % 12
    color = l_f - a * [k - 3, 9 - k, 1].min.clamp(-1, 1)
    format('%02x', (255 * color).round)
  }
  "##{f.call(0)}#{f.call(8)}#{f.call(4)}"
end

def generate_svg(params, unique_id: nil)
  total_width = 250
  total_height = 350
  rows = params[:rows]
  columns = params[:columns]
  hue = params[:hue] || params[:color]
  smoothing = params[:smoothing] / 100.0
  mode = params[:symmetryMode]

  width = total_width.to_f / columns
  height = total_height.to_f / rows

  x = params[:firstSliderControl] / 100.0
  y = 1 - params[:firstSliderControl] / 100.0
  x3 = params[:secondSliderControl] / 100.0
  y3 = 1 - params[:secondSliderControl] / 100.0

  control1 = [(width * x * smoothing).round(2), (height * smoothing).round(2)]
  control2 = [(width * smoothing).round(2), (height * (1 - y * smoothing)).round(2)]
  control3 = [(width * x3 * smoothing).round(2), (height * (1 - y3 * smoothing)).round(2)]

  base_path = "M 0,#{height} C #{control1[0]},#{control1[1]} #{control3[0]},#{control3[1]} #{control2[0]},#{control2[1]}"

  transforms = case mode
               when 'x4'
                 [
                   'scale(1,1) translate(-125,-175)',
                   'scale(-1,1) translate(-125,-175)',
                   'scale(1,-1) translate(-125,-175)',
                   'scale(-1,-1) translate(-125,-175)'
                 ]
               when 'x8'
                 [
                   'scale(1,1) translate(-125,-175)',
                   'scale(-1,1) translate(-125,-175)',
                   'scale(1,-1) translate(-125,-175)',
                   'scale(-1,-1) translate(-125,-175)',
                   'rotate(90) scale(1,1) translate(-125,-175)',
                   'rotate(90) scale(-1,1) translate(-125,-175)',
                   'rotate(90) scale(1,-1) translate(-125,-175)',
                   'rotate(90) scale(-1,-1) translate(-125,-175)'
                 ]
               when 'x16'
                 [
                   'scale(1,1) translate(-125,-175)',
                   'scale(-1,1) translate(-125,-175)',
                   'scale(1,-1) translate(-125,-175)',
                   'scale(-1,-1) translate(-125,-175)',
                   'rotate(90) scale(1,1) translate(-125,-175)',
                   'rotate(90) scale(-1,1) translate(-125,-175)',
                   'rotate(90) scale(1,-1) translate(-125,-175)',
                   'rotate(90) scale(-1,-1) translate(-125,-175)',
                   'rotate(45) scale(1,1) translate(-125,-175)',
                   'rotate(45) scale(-1,1) translate(-125,-175)',
                   'rotate(45) scale(1,-1) translate(-125,-175)',
                   'rotate(45) scale(-1,-1) translate(-125,-175)',
                   'rotate(135) scale(1,1) translate(-125,-175)',
                   'rotate(135) scale(-1,1) translate(-125,-175)',
                   'rotate(135) scale(1,-1) translate(-125,-175)',
                   'rotate(135) scale(-1,-1) translate(-125,-175)'
                 ]
               else
                 ['scale(1,1) translate(-200,-300)']
               end

  # Colors
  base_hex = hsl_to_hex(hue, 100, 65)
  triad1_hex = hsl_to_hex((hue + 60) % 360, 100, 65)
  triad2_hex = hsl_to_hex((hue + 180) % 360, 100, 65)
  triad3_hex = hsl_to_hex((hue + 300) % 360, 100, 65)
  bg_color = "hsl(#{hue}, 50%, 13%)"
  uid = unique_id || SecureRandom.hex(4)

  spacing_x = total_width.to_f / columns
  spacing_y = total_height.to_f / rows
  offset_x = (total_width - spacing_x * columns) / 2.0
  offset_y = (total_height - spacing_y * rows) / 2.0

  # Build SVG
  defs = <<~DEFS
    <defs>
      <linearGradient id="g1-#{uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#{base_hex};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#{triad1_hex};stop-opacity:1"/>
      </linearGradient>
      <linearGradient id="g2-#{uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#{base_hex};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#{triad2_hex};stop-opacity:1"/>
      </linearGradient>
      <linearGradient id="g3-#{uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#{base_hex};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#{triad3_hex};stop-opacity:1"/>
      </linearGradient>
    </defs>
  DEFS

  paths = ""
  (0...rows).each do |row|
    (0...columns).each do |col|
      transforms.each_with_index do |base_transform, index|
        grid_transform = "translate(#{offset_x + spacing_x * col + width / 2}, #{offset_y + spacing_y * row + height / 2})"
        gradient_index = (index / 4 % 3) + 1
        paths += "<path d='#{base_path}' transform='#{grid_transform} #{base_transform}' fill='url(#g#{gradient_index}-#{uid})' stroke='none'/>"
      end
    end
  end

  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 #{total_width} #{total_height}' preserveAspectRatio='xMidYMid slice' data-coversize-target='svg'>" \
    "#{defs}" \
    "<rect width='#{total_width}' height='#{total_height}' fill='#{bg_color}'/>" \
    "#{paths}" \
    "</svg>"
end

stories = [
  {
    title: "Les laboratoires de fabrication",
    body: <<~BODY
En 2013, j'avais vingt-cinq ans. Aujourd'hui, j'en ai soixante-deux.

C'est cette annee-la que je faisais la connaissance de Anna, creatrice de costumes, engagee dans le projet Des abysses et vous. J'etais benevole lors de l'installation de photographies exposees au fond des piscines de Rennes. Le soir, une fois les bassins fermes au public, nous nous retrouvions pour gratter la colle qui maintenait les plaques de plexiglas protegeant les oeuvres.

Pour cette exposition, une mannequin apneiste avait ete photographiee, costumee en creatures des grands fonds marins. Anna avait concu les costumes \u2014 une pieuvre rouge, entre autres formes hybrides. Les photographies subaquatiques avaient ete realisees par Philippe, voisin d'Antoine, lui-meme mon ami et voisin d'enfance. C'est par cette chaine de voisinages et de rencontres que j'allais, sans le savoir, visiter pour la premiere fois un laboratoire de fabrication.

Anna m'en avait parle comme d'un lieu qui me plairait : des imprimantes 3D, une decoupe laser, et des gens qui bricolent ensemble. Pris par la curiosite \u2014 et disposant alors d'un peu de temps \u2014 je n'ai pas tarde a pousser la porte de l'EESAB, l'ecole des Beaux-Arts de Rennes, pour decouvrir ce lieu dissimule au fond d'un labyrinthe de couloirs. Ca sentait la peinture, le revelateur photo, l'encre de serigraphie et la vieille pierre.

Une imprimante 3D.
Je crois que c'est ce mot-la qui a fait basculer mon imaginaire et m'a permis de franchir les lourdes portes du batiment.

J'ai d'abord rencontre Hugues, qui m'a fait visiter. Un petit prefabrique d'a peine vingt metres carres. Une vingtaine d'hommes, de tous ages, s'affairaient a l'interieur. Quelques machines, des prototypes poses sur des tables contre les murs. Il y avait la une odeur particuliere \u2014 que je ne reconnaissais pas encore \u2014 mais qui deviendrait rapidement l'une de mes preferees : la fumee des decoupes laser.

Les choses ont veritablement bascule en janvier 2027, lors du dernier crash petrolier. En quelques jours, le baril a depasse les mille dollars. Il n'est jamais redescendu.

Lorsque la crise des ressources a frappe, les laboratoires de fabrication sont devenus une evidence. Ils permettaient de produire localement a partir de ce qui restait. Au debut, il s'agissait surtout de reparer, puis il a fallu fabriquer, lentement. Et les dechets des decennies passees sont devenus nos mines, nos carrieres.

Aujourd'hui, a soixante-deux ans, je passe encore regulierement au laboratoire de fabrication de mon quartier. Je n'y fabrique presque plus rien. Je regarde les gestes, les discussions, les desaccords.

Il n'est plus question de croissance.
Ni meme de transition.

Nous avons cesse d'attendre un futur meilleur.
Nous avons appris a fabriquer le present.
    BODY
  },
  {
    title: "Les jardins suspendus de Nantes",
    body: <<~BODY
Je me souviens du jour ou le dernier supermarche de notre quartier a ferme ses portes. C'etait en mars 2031, un mardi gris et pluvieux. Les rayons etaient vides depuis des semaines. Les camions ne venaient plus.

Ma voisine, Fatima, qui avait grandi dans les montagnes du Rif, m'a dit ce jour-la une phrase que je n'ai jamais oubliee : \u00ab La terre ne ferme jamais, elle. \u00bb Le lendemain, elle plantait des feves dans le bac a fleurs de son balcon. Trois semaines plus tard, tout l'immeuble l'avait imitee.

Nous avons commence par les toits. Les toits plats des immeubles HLM de Malakoff, que personne n'avait jamais regardes autrement que comme des surfaces d'etancheite, sont devenus nos premiers champs. Fatima nous a appris a preparer le substrat avec les dechets organiques de la cantine scolaire. Les enfants montaient les seaux. Les anciens triaient les graines.

En 2033, la mairie \u2014 ou ce qu'il en restait \u2014 a officiellement transfere la gestion des espaces verts aux collectifs d'habitants. Ce n'etait pas de la generosite : ils n'avaient plus les moyens d'entretenir quoi que ce soit. Nous avons transforme les rond-points en vergers, les parkings en potagers, les friches industrielles en forets comestibles.

L'annee suivante, un ingenieur agronome a la retraite, Jean-Marc, a concu le premier jardin vertical sur la facade de la tour Egalite. Dix-sept etages de legumes, irrigues par un systeme de goutte-a-goutte alimente par les eaux grises de l'immeuble, filtrees par des bassins de phytoepuration installes au pied du batiment.

Aujourd'hui, Nantes produit soixante pour cent de sa nourriture a l'interieur de ses limites. Les serres chauffees n'existent plus. Nous avons reappris la saisonnalite. En hiver, nous mangeons des choux, des poireaux, des topinambours. En ete, les tomates debordent des balcons.

Ce qui me frappe le plus, ce n'est pas la quantite de nourriture que nous produisons. C'est le silence. Les camions frigorifiques ne passent plus a quatre heures du matin. Les oiseaux sont revenus. Les abeilles aussi. Le printemps, a Nantes, sent la fleur d'oranger et le romarin.

Ma fille, qui a vingt-trois ans, n'a jamais connu un supermarche. Quand je lui raconte que nous achetions des fraises en decembre, emballees dans du plastique, transportees depuis l'Espagne, elle me regarde comme si je lui racontais une legende.

Peut-etre que c'en est une, desormais.
    BODY
  },
  {
    title: "Le dernier data center",
    body: <<~BODY
On m'a demande d'ecrire sur ce que je fais. Je suis archiviste. Mon travail consiste a preserver ce qui reste d'internet.

Le dernier data center de France a ete debranche le 14 septembre 2041. Il se trouvait a Plaine Commune, en Seine-Saint-Denis, dans un batiment gris sans fenetre que la plupart des habitants du quartier prenaient pour un entrepot. Ce jour-la, quand les ventilateurs se sont tus, un silence etrange s'est installe. Un silence que personne dans le batiment n'avait jamais entendu.

Internet n'a pas disparu d'un coup. Il s'est eteint lentement, comme une bougie dans un courant d'air. D'abord les videos. Puis les images. Puis les reseaux sociaux, les uns apres les autres. Pas parce que quelqu'un les a interdits \u2014 personne n'en avait le pouvoir \u2014 mais parce que l'energie necessaire pour les maintenir en vie est devenue un luxe que plus personne ne pouvait se permettre.

Ce qui a survecu, c'est le texte. Le texte est leger. Un message de mille mots pese moins qu'une photo de chat. Nous avons construit un reseau de relais basse consommation, inspires du protocole LoRa et du projet Meshtastic, installes sur les clochers d'eglises, les chateaux d'eau, les pylones electriques desaffectes. La portee est limitee, le debit ridicule selon les standards d'avant, mais suffisant pour echanger des nouvelles, des recettes, des plans de construction, des poemes.

Avant le debranchement, j'ai passe trois ans a trier. Trois ans a decider ce qui meritait d'etre sauvegarde sur les supports physiques dont nous disposions. Wikipedia en francais, evidemment. Les plans de machines open source du projet Open Source Ecology. Les archives de Sci-Hub, parce que la connaissance scientifique ne doit pas mourir avec ses serveurs. La bibliotheque numerique du Projet Gutenberg. Les tutoriels de reparation d'iFixit.

Nous avons abandonne le reste. Les milliards de selfies, les fils de commentaires haineux, les publicites ciblees, les algorithmes de recommandation. Tout cela s'est evapore comme de la vapeur d'eau. Personne ne les a pleures.

Ce que je fais maintenant, c'est distribuer. Je copie des archives sur des cles USB, sur des cartes SD, sur des disques durs reconditionnes. Je les envoie aux bibliotheques communales, aux ecoles, aux fablabs. Chaque copie est un noeud du reseau. Si l'un disparait, les autres subsistent.

Mes collegues me demandent parfois si je suis nostalgique de l'ancien internet. Je leur reponds que non. L'ancien internet etait une foret de panneaux publicitaires traversee par une autoroute. Le notre est un sentier de randonnee. On y marche plus lentement, mais on voit le paysage.

Hier soir, j'ai recu un message sur le reseau local. Trois lignes, envoyees depuis Brest. Quelqu'un avait retrouve un serveur intact dans une cave, avec une copie complete des archives de l'INA jusqu'en 2025. Des milliers d'heures de radio, de television, de documentaires.

J'ai pleure. Pas de tristesse. De soulagement.

La memoire tient bon.
    BODY
  }
]

stories.each_with_index do |story, i|
  params = generate_cover_params
  svg = generate_svg(params)

  post = Post.create!(
    title: story[:title],
    user: user,
    body: story[:body].strip,
    image_rights: true,
    color: "hsl(#{params[:hue]}, 100%, 50%)",
    pattern_settings: params.to_json,
    cover: svg,
    created_at: rand(30..365).days.ago
  )

  puts "Created: #{post.title}"
end

puts "3 stories created successfully!"
