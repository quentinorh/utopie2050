namespace :users do
  desc "Supprimer les comptes non confirmés depuis plus de 48h"
  task cleanup_unconfirmed: :environment do
    begin
      puts "[#{Time.current}] Début du nettoyage des comptes non confirmés..."
      
      # Compter avant suppression pour le logging
      total_unconfirmed = User.where(confirmed_at: nil).count
      expired_count = User.unconfirmed_expired.count
      
      puts "[#{Time.current}] Total de comptes non confirmés: #{total_unconfirmed}"
      puts "[#{Time.current}] Comptes non confirmés expirés (>48h): #{expired_count}"
      
      if expired_count > 0
        count = User.cleanup_unconfirmed!
        puts "[#{Time.current}] #{count} compte(s) non confirmé(s) supprimé(s)."
        Rails.logger.info "[Cleanup] #{count} compte(s) non confirmé(s) supprimé(s)"
      else
        puts "[#{Time.current}] Aucun compte à supprimer."
        Rails.logger.info "[Cleanup] Aucun compte non confirmé à supprimer"
      end
      
      puts "[#{Time.current}] Nettoyage terminé avec succès."
    rescue => e
      error_message = "Erreur lors du nettoyage des comptes non confirmés: #{e.message}\n#{e.backtrace.join("\n")}"
      puts "[#{Time.current}] ERREUR: #{error_message}"
      Rails.logger.error "[Cleanup] #{error_message}"
      raise e
    end
  end
end
