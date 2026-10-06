module WritingTutorialNarrativeStyles
  PLACEHOLDERS = %w[pseudo age lieu etincelle theme tendance inversion].freeze
  # Modificateurs optionnels : cap, lower, upper, title — ex. %{lower:tendance}, %{cap:lieu}

  STYLES = [
    {
      id: "journal_2050",
      title: "JOURNAL DE 2050",
      description: "Donnez des nouvelles fraîches de demain",
      template: <<~TEXT.strip
        JOURNAL DE 2050 — %{cap:lieu}
        %{pseudo}, %{age} ans

        Titre

        [Un titre qui ouvre une scène. Tu pourras le changer.]

        Ce matin, à %{cap:lieu}…

        [Décris un instant précis : un lieu, un geste, une lumière. Le futur devient crédible dans le détail.]

        %{theme}

        [Laisse ce thème colorer la journée sans l'expliquer. Un seul geste suffit.]

        %{lower:tendance}
        %{lower:inversion}

        [Relie ces deux pistes par une habitude qui a changé. Qu'est-ce que tu aimerais vivre dans cette matinée ?]

        %{title:etincelle}

        [Donne-lui une forme concrète : un objet, un rituel, un mot qu'on se dit.]
      TEXT
    },
    {
      id: "lettre_futur",
      title: "LETTRE DU FUTUR",
      description: "Écrivez à un proche en 2050",
      template: <<~TEXT.strip
        %{cap:lieu}, 2050
        %{pseudo}, %{age} ans

        À

        [Choisis quelqu'un de précis : toi d'avant, un proche, une personne qui n'est pas encore là.]

        Je t'écris depuis %{cap:lieu}.

        [Commence par une nouvelle simple. Le repas, la rue, ce que tu vois depuis chez toi.]

        %{theme}

        [Parle de ce thème comme d'une part de ta vie. Un exemple vécu vaut mieux qu'une idée générale.]

        %{lower:tendance}
        %{lower:inversion}

        [Dis ce qui a bougé pour toi. Un effort, un doute ou une joie ont autant leur place qu'une réussite.]

        %{title:etincelle}

        [Si tu ne devais transmettre qu'une image de ce futur, laquelle ?]
      TEXT
    },
    {
      id: "souvenir",
      title: "SOUVENIR",
      description: "Racontez un souvenir depuis 2050",
      template: <<~TEXT.strip
        %{pseudo}, %{age} ans
        %{cap:lieu}, 2050

        Je me souviens…

        [Ancre la scène : un jour, un lieu, des visages. Le souvenir gagne à rester petit.]

        %{lower:tendance}

        [Comment est-ce qu'on vivait ça, dans un détail que tout le monde trouvait normal ?]

        %{lower:inversion}

        [Le tournant peut être minuscule. Qui a fait quoi, sans en faire une légende ?]

        %{theme}
        %{title:etincelle}

        [Qu'est-ce qu'il en reste dans ta vie ? Le thème peut n'être que le décor.]
      TEXT
    },
    {
      id: "manifeste",
      title: "MANIFESTE",
      description: "Écrivez un manifeste politique ou citoyen",
      template: <<~TEXT.strip
        %{upper:lieu} — 2050
        %{pseudo}, %{age} ans

        Nous, à %{cap:lieu}…

        [Une phrase au « nous ». Dis simplement ce que tu veux voir exister.]

        1. %{theme}

        [Une règle du quotidien, assez courte pour être dite à voix haute.]

        2. %{lower:inversion}

        [Fais-en un droit, un devoir, ou une façon de décider ensemble.]

        3. %{lower:tendance}

        [Une limite. Qu'est-ce que tu ne veux plus laisser décider à ta place ?]

        %{title:etincelle}

        [Termine par un geste qu'une personne peut tenir. Qui, et à partir de quand ?]
      TEXT
    },
    {
      id: "dialogue",
      title: "DIALOGUE",
      description: "Faites parler deux passants qui racontent leur quotidien",
      template: <<~TEXT.strip
        %{cap:lieu}, 2050
        %{pseudo}, %{age} ans

        Avec

        [Donne un nom à l'autre. Voisin, enfant, inconnu, toi plus jeune.]

        %{pseudo} —
        [Une question sur ce que l'autre est en train de faire.]

        —
        [Une réponse en geste : se déplacer, manger, travailler, décider.]

        %{pseudo} —
        %{theme}

        [Relance sur un détail. Tu peux être surpris, ému, pas d'accord.]

        —
        %{lower:tendance}
        %{lower:inversion}
        %{title:etincelle}

        [Laisse l'autre en faire une anecdote. Qu'est-ce que ces deux-là savent, en 2050, qu'on ignore encore ?]
      TEXT
    },
    {
      id: "carnet_voyage",
      title: "CARNET DE VOYAGE",
      description: "Décrivez le futur à travers un récit de voyage",
      template: <<~TEXT.strip
        %{pseudo}, %{age} ans
        %{cap:lieu}, 2050

        Je vois
        %{theme}

        [Deux ou trois choses devant toi. Le thème peut n'en colorer qu'une.]

        J'entends

        [Un son. Décris-le avant de dire ce qu'il signifie.]

        J'emporte
        %{title:etincelle}

        [Un objet : sa matière, son poids, la personne à qui tu le tends.]

        Je remarque
        %{lower:tendance}
        %{lower:inversion}

        [Une présence ou une absence. Qu'est-ce qui, ici, te donnerait envie de rester ?]
      TEXT
    }
  ].freeze

  def self.find(id)
    STYLES.find { |style| style[:id] == id }
  end
end
