require 'openai'

class OpenAiService
    MAX_TOKENS = 4096  # La limite de tokens pour GPT-3 est de 4096 (à ajuster selon le modèle que tu utilises)
  
    def initialize
      @client = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])
    end
  
    # Cette méthode calcule le nombre de tokens dans le contenu
    def count_tokens(text)
      # Utilise l'approximation suivante : 1 token ≈ 4 caractères en anglais
      (text.length / 4.0).ceil
    end
  
    # Cette méthode tronque le texte pour qu'il respecte la limite de tokens
    def truncate_text_to_fit(text, existing_themes)
      max_content_tokens = MAX_TOKENS - count_tokens(existing_themes) - 100  # Laisse de l'espace pour les instructions
      tokens_count = count_tokens(text)
  
      if tokens_count > max_content_tokens
        # Si le texte dépasse la limite, on tronque
        text[0, max_content_tokens * 4]  # 1 token ≈ 4 caractères
      else
        text
      end
    end
  
    # Cette méthode génère les thématiques principales (maximum 3) en français à partir du contenu tronqué
    def generate_themes(content, existing_themes)
        # Créer un prompt orienté pour générer trois thèmes principaux en français
        prompt = <<~TEXT
            Sur la base du contenu suivant :
            "#{content}"

            Et en prenant en compte les thématiques générales suivantes :
            "art, culture, science, technologie, environnement, santé, économie, éducation, société, politique, travail, nature, artisanat, inégalités, agriculture, questions sociales, développement, innovation, mode de vie"

            Les thématiques doivent être en français, générales et ne doivent pas inclure de sous-thèmes. Évite les répétitions, les variations de mots (comme "santé" et "bien-être") et les combinaisons de plusieurs termes. Retourne les trois thématiques sous la forme d'une liste séparée par des virgules et sans espaces en trop.
            Génère uniquement trois thématiques principales en français qui décrivent le mieux le contenu. 
        TEXT

        # puts " "
        # puts "Prompt: #{prompt}"
        # puts " "
    
        # Appel à l'API OpenAI pour générer les thèmes
        response = @client.chat(
        parameters: {
            model: "gpt-3.5-turbo",
            messages: [
            { role: "system", content: "Tu es un assistant qui aide à générer des thématiques larges et générales pour la catégorisation en français." },
            { role: "user", content: prompt }
            ],
            max_tokens: 100,
            temperature: 0.5 # Réduit la température pour plus de cohérence et moins de créativité
        }
        )

        puts " "
        puts "Reponse: #{response['choices'][0]['message']['content']}"
        puts " "
    
        # Extraire et traiter la réponse
        themes = response['choices'][0]['message']['content'].strip.split(',').map(&:strip)
    
    end
  
  end
  