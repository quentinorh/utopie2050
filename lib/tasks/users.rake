namespace :users do
  desc "Supprimer les comptes non confirmés depuis plus de 48h"
  task cleanup_unconfirmed: :environment do
    puts "Début du nettoyage des comptes non confirmés..."
    count = User.cleanup_unconfirmed!
    puts "#{count} compte(s) non confirmé(s) supprimé(s)."
  end
end
