class AddRememberTokenToUsers < ActiveRecord::Migration[7.0]
  def change
    # Comptes sans mot de passe : authenticatable_salt est vide, Rememberable
    # a besoin de cette colonne pour le cookie « Se souvenir de moi ».
    add_column :users, :remember_token, :string
    add_index :users, :remember_token, unique: true
  end
end