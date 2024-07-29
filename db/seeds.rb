# Clear existing data
User.destroy_all
Post.destroy_all

# Create a user
user = User.create!(
  email: "quentin.orhant@gmook.com",
  password: "azerty",
  username: "Quentin Orhant"
)

# Create posts
Post.create!([
  {
    title: "Pacte d'impact",
    body: "Le pacte d'impact sera signé entre l'Humain et la Nature.\r\n\r\nEn échange d'un environnement viable (à savoir de l'air respirable, de la terre cultivable, de l'eau buvable, et une météorologie clémente), l'Humain s'engage à ne poser aucun acte ayant un impact contre la Nature. Chacun de ses actes (individuel ou collectif) ne devra porter atteinte à l'intégrité de la Nature.\r\nLa production de déchets non recyclables sera de ce fait prohibée.\r\n \r\nSi l'Humain se trouvait dans l'incapacité absolue de ne pas produire un acte allant à l'encontre de la Nature, cela se fera dans des conditions strictes. Il devra alors compenser son acte aux effets iatrogènes délétères par un acte aux effets positifs pour la nature.\r\n\r\nExemple : si l'Humain doit se déplacer.... Il doit utiliser ses jambes (impact neutre). S'il est dans l'impossibilité d'utiliser ses jambes, il peut prendre un vélo (impact négatif du fait de la production de déchet propre au cycle de vie du vélo). L'Humain a alors l'obligation de compenser son acte par exemple en prenant soin d'un arbre ( impact positif).\r\nLa mesure des impacts neutres, négatifs ou positifs se fera de façon précise par un collectif d'expert des deux parties : Humain - Nature ( représentée par des membres des \"Autres-Animaux\" et Vegetaux.)\r\n\r\nFait à Rennes,\r\n\r\nLe 23 février 2050,\r\n\r\nMembre représentatif des Humain : un enfant.\r\nSignature\r\n\r\n\r\nMembre représentation de la Nature:\r\nLe vent.\r\nsignature\r\n",
    user_id: user.id,
    unsplash_image_url: "https://images.unsplash.com/photo-1551225183-94acb7d595b6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHw5fHx0ZXh0fGVufDB8fHx8MTcyMDYwMTE3OHww&ixlib=rb-4.0.3&q=85&utm_source=utopie2050&utm_medium=referral&utm_campaign=api-credit",
    image_rights: false,
    color: "hsl(204, 100%, 50%)"
  },
  {
    title: "Equilibre instable",
    body: "L'équilibre de notre société ne tient qu'à un fil.\r\n\r\nCette crise nous oblige à faire face à cette réalité. Encore faut-il l'accepter pour pouvoir en discuter ouvertement.",
    user_id: user.id,
    unsplash_image_url: "https://images.unsplash.com/photo-1494211903311-37d2d4d8e8c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHxpbWFnZXxlbnwwfHx8fDE3MjA2MTY2MzJ8&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(313, 100%, 50%)"
  },
  {
    title: "Les nomades du futur",
    body: "Vivre au rythme des saisons, des grands chantiers de dépollutions, des dérèglements climatiques\r\n\r\nLe retour au nomadisme, comme mode de vie désirable ? Nécessaire ? Majoritaire ?\r\n\r\nQue deviennent les villes ? Des points de ravitaillement ? De grands marchés ? \r\n\r\nComment se déplacer ? En caravanes de caravanes tractées par des cerfs-volants ?! Une caravane servirait à produire des vers de farine a partir des déchets du groupe.\r\n\r\nLes groupes ?! Spécialisés et interdépendants !\r\n\r\nPlus d'avions, on vit à l'échelle du monde mais plus lentement. Beaucoup sillonnent le globe à cheval, à vélo, à la voile. Certains en ont déjà fait plusieurs fois le tour. La plupart en groupes et quelques uns en solitaire.\r\n\r\nObjectif de faire \r\n\r\n(brouillon publié !)",
    user_id: user.id,
    unsplash_image_url: "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2MzA5MDd8MHwxfHNlYXJjaHwxfHx0cmF2ZWx8ZW58MHx8fHwxNzIwNjE2NjU0&ixlib=rb-4.0.3&q=85",
    image_rights: false,
    color: "hsl(118, 100%, 50%)"
  }
])
