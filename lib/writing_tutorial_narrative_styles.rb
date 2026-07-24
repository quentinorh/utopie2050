module WritingTutorialNarrativeStyles
  PLACEHOLDERS = %w[pseudo age lieu etincelle theme tendance inversion].freeze
  # Modificateurs optionnels : cap, lower, upper, title — ex. %{lower:tendance}, %{cap:lieu}

  STYLES = [
      {
      id: "journal_2050",
      title: "JOURNAL DE 2050",
      style: "Journaliste",
      description: "Donnez des nouvelles fraîches de demain",
      template: <<~TEXT.strip
        JOURNAL DE 2050 - Édition Spéciale locale : %{cap:lieu}
        Chronique rédigée par notre envoyé·e spécial·e : %{pseudo} (%{age} ans)

        Titre de l'article : [Exemple : Le jour où %{lower:lieu} a choisi d'y croire / La fin du monde n'aura pas lieu]

        En ce mois de juin 2050, notre territoire respire enfin. Depuis que l'on s'est attaqué au problème de la %{lower:tendance} grâce à notre décision historique de %{lower:inversion}, nos modes de vie ont radicalement changé ici, à %{cap:lieu}. 

        Retour sur une transition réussie guidée par la thématique "%{theme}" et l'activation de notre fameuse étincelle : %{title:etincelle}.

        [Rédigez votre chronique ci-dessous en répondant à ces questions :
        - Comment ce changement a-t-il transformé le paysage de %{cap:lieu} ou votre rue ce matin ?
        - Décrivez une scène quotidienne positive (un marché, un transport, un lieu d'entraide).
        - À votre âge (%{age} ans), qu'est-ce que ce nouveau monde change pour votre propre quotidien ?]
      TEXT
    },
    {
      id: "lettre_futur",
      title: "LETTRE DU FUTUR",
      style: "Intime",
      description: "Écrivez à un proche en 2050",
      template: <<~TEXT.strip
        De : %{pseudo}, depuis mon refuge à %{cap:lieu}
        Date : Juin 2050
        Destinataire : [Par exemple : Mon double de 2026 / Mes enfants / Une personne disparue]

        Je t'écris d'une époque et d'un endroit (%{cap:lieu}) où la découverte de %{lower:etincelle} a tout changé. Du haut de mes %{age} ans, j'ai vu le monde basculer du bon côté. On a enfin trouvé une alternative durable à la %{lower:tendance} et, tu ne me croiras pas, mais on a retrouvé le goût du temps long et de la douceur.

        Même quand les crises liées à notre %{lower:theme} sont arrivées, on a tenu bon collectivement parce que nous avons appliqué notre plan : %{lower:inversion}.

        [Ouvrez votre cœur et décrivez votre intimité :
        - Qu'est-ce que vous mangez ce midi ? D'où vient cette nourriture ?
        - Quels sont les bruits et les odeurs qui entrent par votre fenêtre à %{cap:lieu} ?
        - Quel message d'espoir ou quel conseil aimeriez-vous envoyer dans le passé ?]
      TEXT
    },
    {
      id: "souvenir",
      title: "SOUVENIR",
      style: "Rétrospective",
      description: "Racontez comment on a surmonté la crise !",
      template: <<~TEXT.strip
        Carnet de mémoires de %{pseudo} — Témoignage recueilli en 2050 à %{cap:lieu}.

        Nous y sommes. En 2050, du haut de mes %{age} ans, je peux le dire : le pari est gagné. Notre société a prouvé sa robustesse. Pourtant, lorsque je repense aux décennies passées, le chemin n'était pas tracé d'avance.

        Quand le défi lié à la gestion de la %{lower:tendance} a frappé notre quotidien, beaucoup ont cru à un point de non-retour. Mais à %{cap:lieu}, notre secret a été d'activer immédiatement notre projet d'avenir : %{lower:inversion}. Cela nous a permis de recréer du lien social et de l'espoir à travers une dynamique forte autour de la question suivante : %{lower:theme}. Tout a démarré à l'époque par une idée reçue pour une folie : %{lower:etincelle}.

        Le grand point de bascule historique s'est produit lorsque...

        [Racontez le jour de la bascule :
        - Quel événement déclencheur a réuni les habitants de %{cap:lieu} ? (Une fête de quartier, une assemblée citoyenne, une grève joyeuse...)
        - Comment les citoyens, les associations ou les communes se sont organisés concrètement pour faire plier l'ancien système ?]
      TEXT
    },
    {
      id: "manifeste",
      title: "MANIFESTE",
      style: "Engagé",
      description: "Écrivez un manifeste politique ou citoyen",
      template: <<~TEXT.strip
        PROCLAMATION DE %{upper:lieu} — JUIN 2050
        Porté par le collectif dont fait partie %{pseudo} (%{age} ans)

        Préambule :
        Nous, citoyennes et citoyens réunis aujourd'hui à %{cap:lieu} en 2050, déclarons que l'ère de la performance aveugle et de la destruction du vivant est révolue. Face aux enjeux cruciaux du domaine %{lower:theme}, nous avons fait le choix de la robustesse, de la sobriété et de la joie. Nous proclamons la primauté de notre concept, %{title:etincelle}, comme un bien commun inaliénable.

        Nos grandes résolutions :

        Article 1 : Pour respecter le vivant et notre avenir, nous avons définitivement brisé la dynamique toxique de la %{lower:tendance}. Désormais, nous nous engageons à appliquer et défendre notre résolution phare : %{lower:inversion}.

        Article 2 : Face aux crises de notre siècle, notre force réside dans... 
        [Écrivez ici le premier grand principe de votre nouvelle société : comment partagez-vous les ressources ? Comment prenez-vous les décisions à %{cap:lieu} ?]

        Article 3 : Pour les générations futures, nous garantissons que...
        [Complétez avec une promesse d'avenir ou une règle d'or de votre monde idéal.]
      TEXT
    },
    {
      id: "dialogue",
      title: "DIALOGUE",
      style: "Échange",
      description: "Faites parler deux passants qui racontent leur quotidien",
      template: <<~TEXT.strip
        Micro-trottoir réalisé sur la grand-place de %{cap:lieu} en juin 2050.
        Journaliste : %{pseudo} (%{age} ans).

        %{pseudo} :
        "Bonjour. Nous sommes en 2050 à %{cap:lieu}. Je suis avec [Prénom du Personnage B], qui accepte de regarder un instant le chemin parcouru."

        Personnage B :
        "Tu te rends compte, %{pseudo} ? Quand on repense aux années 2020, les rues de %{cap:lieu} et nos vies entières étaient bloquées par la %{lower:tendance}. C'était notre quotidien, on pensait que c'était une fatalité."

        %{pseudo} :
        "Ça devait être étouffant ! J'ai %{age} ans aujourd'hui, et j'ai l'impression que les bouleversements de notre %{lower:theme} nous ont forcés à bifurquer pour le meilleur. Mais dites-moi, comment votre génération a fait concrètement pour mettre en place %{lower:inversion} ?"

        Personnage B : 
        "Ah, c'est une sacrée histoire ! Au début, on a eu peur, mais on s'est serré les coudes autour d'une idée qui semblait folle à l'époque : %{title:etincelle}. Laisse-moi te raconter comment ça s'est passé..."

        [Poursuivez le dialogue :
        - Quelle a été la première action concrète du Personnage B et de ses voisins ?
        - Comment réagit %{pseudo} face à ce récit ? Quelle est sa vision du futur maintenant qu'il ou elle y vit ?]
      TEXT
    },
    {
      id: "carnet_voyage",
      title: "CARNET DE VOYAGE",
      style: "Immersif",
      description: "Décrivez le futur à travers un récit de voyage",
      template: <<~TEXT.strip
        Notes nomades de %{pseudo} (%{age} ans)
        Étape n°24 : Exploration de %{cap:lieu} — Juin 2050

        Ce que je vois dans les rues de %{cap:lieu} :
        Des infrastructures nées de notre décision collective de %{lower:inversion} (quel soulagement d'avoir mis fin à la %{lower:tendance} !). 
        [Ajoutez 2 ou 3 éléments visuels marquants de ce paysage futuriste : y a-t-il des arbres bizarres, des architectures partagées, des animaux en liberté, des technologies low-tech visibles ?]

        Ce que j'entends depuis ma fenêtre ce matin :
        Les discussions animées des habitants de %{cap:lieu} qui s'organisent au quotidien autour du thème %{lower:theme}.
        [Décrivez un bruit ou une ambiance sonore typique de ce futur désirable : le rire des enfants, un outil d'artisanat, le silence des voitures remplacé par le chant des oiseaux, une musique partagée...]

        Ce que j'ai dans les poches :
        Un objet étrange mais indispensable, symbolisant notre fameuse %{title:etincelle}, que je compte troquer ou utiliser au marché ce soir.
        [Décrivez cet objet : à quoi ressemble-t-il ? Quelle est sa texture ? Pourquoi est-il devenu un outil indispensable en 2050 ?]
      TEXT
    }
  ].freeze

  def self.find(id)
    STYLES.find { |style| style[:id] == id }
  end
end
