# Rack::Attack - Protection contre les abus
class Rack::Attack
  # Limite les tentatives d'inscription : 5 par IP toutes les 15 minutes
  throttle("registrations/ip", limit: 5, period: 15.minutes) do |req|
    req.ip if req.path == "/users" && req.post?
  end

  # Limite les demandes de magic-link : 5 par IP toutes les 15 minutes
  throttle("magic_links/ip", limit: 5, period: 15.minutes) do |req|
    req.ip if req.path == "/users/magic_link" && req.post?
  end

  # Limite l'auth depuis la page futur en attente
  throttle("pending_auth/ip", limit: 5, period: 15.minutes) do |req|
    req.ip if req.path == "/futurs/pending_auth" && req.post?
  end

  # Réponse personnalisée en cas de blocage (429 Too Many Requests)
  self.throttled_responder = lambda do |request|
    [
      429,
      { "Content-Type" => "text/html; charset=utf-8" },
      ["<html><body><h1>Trop de requêtes</h1><p>Vous avez effectué trop de tentatives. Veuillez réessayer dans quelques minutes.</p></body></html>"]
    ]
  end
end
