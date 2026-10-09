module WritingTutorialTrends
  # Chaque thème de l'entonnoir a son propre vivier. Une tendance peut
  # apparaître dans plusieurs thèmes quand elle les concerne vraiment.
  BY_THEME = {
    "Économie" => [
      "Mondialisation",
      "Inégalités",
      "Croissance infinie",
      "Pénuries",
      "Chômage",
      "Spéculation",
      "Monopoles",
      "Crises financières"
    ].freeze,
    "Environnement" => [
      "Dérèglement climatique",
      "Sécheresse",
      "Biodiversité",
      "Catastrophes naturelles",
      "Pollution",
      "Niveau des océans",
      "Déforestation",
      "Épuisement des ressources",
      "Catastrophes industrielles"
    ].freeze,
    "Géopolitique" => [
      "Conflits armés",
      "Réfugiés climatiques",
      "Cyberguerre",
      "Prolifération nucléaire",
      "Nationalisme",
      "Instabilités politiques"
    ].freeze,
    "Société" => [
      "Polarisation",
      "Individualisme",
      "Lien social",
      "Anxiété",
      "Santé mentale",
      "Précarité",
      "Isolement",
      "Surtravail",
      "Démographie"
    ].freeze,
    "Technologie" => [
      "Désinformation",
      "Intelligence artificielle",
      "Surveillance",
      "Piratage informatique",
      "Technodépendance",
      "Biais algorithmiques",
      "Protection des données",
      "Vie privée",
      "Obsolescence",
      "Fracture numérique"
    ].freeze
  }.freeze
end
