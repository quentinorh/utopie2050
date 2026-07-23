class PagesController < ApplicationController
  WRITING_TUTORIAL_TRENDS = [
    "Artificialisation des sols",
    "Isolement social",
    "Obsolescence programmée",
    "Dépendance aux écrans",
    "Délocalisation de la production",
    "Montée des eaux",
    "Culture du jetable",
    "Hyperconnexion",
    "Monoculture",
    "Précarité",
    "Surconsommation",
    "Perte du lien au vivant",
    "Surveillance",
    "Spéculation foncière",
    "Impérialisme",
    "Concentration des richesses",
    "Dépendance aux énergies fossiles",
    "Standardisation culturelle",
    "Extractivisme",
    "Raréfaction de l'eau douce",
    "Évasion fiscale",
    "Pollution plastique",
    "Transhumanisme",
    "Perte des savoir-faire",
    "Sédentarité",
    "Déforestation",
    "Mondialisation",
    "Disparition des pollinisateurs",
    "Croissance infinie",
    "Pollution lumineuse",
    "Automatisation",
    "Accélération des rythmes de vie",
    "Agriculture industrielle",
    "Bulles informationnelles",
    "Autoritarisme",
    "Pollution sonore",
    "Désinformation",
    "Centralisation du pouvoir",
    "Vieillissement démographique",
    "Épuisement des ressources",
    "Voiture individuelle",
    "Marchandisation de la culture",
    "Inégalités d'accès aux soins",
    "Effondrement de la biodiversité",
    "Malbouffe",
    "Uniformisation des modes de vie",
    "Individualisme",
    "Militarisation des sociétés",
    "Privatisation des savoirs",
    "Corruption",
    "Dégradation de la santé mentale",
    "Désengagement citoyen",
    "Étalement urbain",
    "Gaspillage alimentaire",
    "Culture de la performance",
    "Captation de l'attention",
    "Uniformisation des modes de vie",
    "Pollution de l'air",
    "Acidification des océans",
    "Précarisation de l'emploi",
    "Surveillance de masse",
    "Déclin des communs",
    "Désinformation scientifique",
    "Uniformisation linguistique",
    "Solitude",
    "Fragmentation des habitats naturels",
    "Colonialisme",
    "Perte d'autonomie",
    "Culture de l'instantané",
    "Burn-out"
  ].freeze

  skip_before_action :authenticate_user!, only: [ :home, :writing_tutorial ]

  def home
    @posts = Post.published.order(created_at: :desc)
    @published_posts_count = @posts.count
    @published_authors_count = Post.published.distinct.count(:user_id)
  end

  def test
    # Laissez vide pour le moment
  end

  def writing_tutorial
    @skip_path = new_post_path
    @writing_tutorial_trends = shuffled_writing_tutorial_trends
    @narrative_styles = WritingTutorialNarrativeStyles::STYLES
  end

  private

  def shuffled_writing_tutorial_trends
    session[:writing_tutorial_trends] ||= WRITING_TUTORIAL_TRENDS.shuffle
  end
end
